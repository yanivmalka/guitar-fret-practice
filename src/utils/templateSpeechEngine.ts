// ── Template-matching speech engine (shared) ───────────────────────────
//
// One `SpeechEngine` implementation, two configurations:
//
//   • 'profile' — matches against the user's own calibration recordings
//                 (IndexedDB, see `voiceProfile.ts`). Accent-perfect.
//   • 'general' — matches against a small bundled set of synthetic-TTS
//                 reference templates for the twelve note names
//                 (`generalVoiceTemplates.json`). Accent-neutral, no model
//                 download — the "works before you calibrate" fallback.
//
// Both share the whole pipeline: capture one spoken word → MFCC → DTW
// against every template → emit the best label as a single final result.
// The caller (`useVoiceAnswer`) drives a fresh turn per question.

import type {
  SpeechEngine,
  SpeechListenOptions,
  SpeechEngineKind,
  MicPermissionState,
} from './speech';
import { captureUtterance } from './utteranceCapture';
import { computeMfcc, framesFromJson, framesToJson } from './mfcc';
import { knnVote, matchTemplates, type Template } from './dtw';
import { addTemplate, pruneTemplates, ADAPTIVE_PROFILE } from './voiceProfile';
import { vlog } from './debugLog';

// How many self-learned templates the "General" engine keeps per label.
const MAX_LEARNED_PER_LABEL = 6;

// A match is only emitted when the best template is clearly closer than the
// runner-up; otherwise the turn ends with no result and the caller's
// keep-alive listens again. Tunable per engine from the console, e.g.
//   localStorage.voiceProfileRelMax = '0.985'
function relMax(key: string, fallback: number): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    if (!Number.isNaN(v) && v > 0.5 && v <= 1) return v;
  } catch { /* ignore */ }
  return fallback;
}

function hasGetUserMedia(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export interface TemplateEngineConfig {
  kind: Extract<SpeechEngineKind, 'profile' | 'general'>;
  /** Load every template for a vocab set (e.g. "notes-alpha"). */
  loadTemplates: (vocabId: string) => Promise<{ label: string; frames: number[][] }[]>;
  /** Whether this engine can run at all right now (mic aside). */
  isReady: () => boolean;
  /** localStorage key for the confidence-ratio override. */
  relMaxKey: string;
  /** Default confidence ratio (best.distance <= second.distance * this). */
  relMaxDefault: number;
  /**
   * 'best' — single closest template wins (good when there are few, clean
   * templates per label, i.e. the personal profile).
   * 'knn'  — distance-weighted vote over the nearest few templates (more
   * robust with many uneven templates, i.e. the synthetic general set).
   */
  strategy: 'best' | 'knn';
}

export class TemplateSpeechEngine implements SpeechEngine {
  readonly kind: TemplateEngineConfig['kind'];
  private cfg: TemplateEngineConfig;
  private turn = 0;
  private abort: AbortController | null = null;
  private cache: { vocabId: string; templates: Template[] } | null = null;
  // The MFCC frames of the most recent utterance, kept so a correct in-game
  // answer can be added to the self-learning store (see `learn`).
  private lastFrames: Float32Array[] | null = null;
  private lastVocabId = 'notes-alpha';

  constructor(cfg: TemplateEngineConfig) {
    this.cfg = cfg;
    this.kind = cfg.kind;
  }

  isSupported(): boolean {
    return hasGetUserMedia() && this.cfg.isReady();
  }

  async checkPermission(): Promise<MicPermissionState> {
    try {
      const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
      if (status?.state === 'granted') return 'granted';
      if (status?.state === 'denied') return 'denied';
    } catch { /* Permissions API can't answer for "microphone" here */ }
    return 'unknown';
  }

  async requestPermission(): Promise<boolean> {
    try {
      const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
      if (status?.state === 'granted') return true;
      if (status?.state === 'denied') return false;
    } catch { /* fall through to a real prompt */ }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  private async getTemplates(vocabId: string): Promise<Template[]> {
    if (this.cache?.vocabId === vocabId) return this.cache.templates;
    const rows = await this.cfg.loadTemplates(vocabId);
    const templates = rows.map((r) => ({ label: r.label, frames: framesFromJson(r.frames) }));
    this.cache = { vocabId, templates };
    return templates;
  }

  async start(opts: SpeechListenOptions): Promise<void> {
    if (!hasGetUserMedia()) { opts.onError('not-supported'); return; }
    const vocabId = opts.profileVocabId ?? 'notes-alpha';

    this.stop();
    const myTurn = ++this.turn;
    const abort = new AbortController();
    this.abort = abort;

    const templates = await this.getTemplates(vocabId);
    if (myTurn !== this.turn) return;
    if (!templates.length) { opts.onError('not-supported'); return; }

    const captured = await captureUtterance({ signal: abort.signal });
    if (myTurn !== this.turn) return;
    if (!captured) { opts.onEnd?.(); return; }

    const { frames } = computeMfcc(captured.pcm, captured.sampleRate);
    if (!frames.length) { opts.onEnd?.(); return; }
    this.lastFrames = frames;
    this.lastVocabId = vocabId;

    if (myTurn !== this.turn) return;

    let firstLabel: string | undefined;
    let secondLabel: string | undefined;
    let confident: boolean;

    if (this.cfg.strategy === 'knn') {
      const { ranked, nearest } = knnVote(frames, templates, 5);
      firstLabel = ranked[0]?.label;
      secondLabel = ranked[1]?.label;
      const ratioCap = relMax(this.cfg.relMaxKey, this.cfg.relMaxDefault);
      confident =
        !!firstLabel &&
        Number.isFinite(nearest) &&
        (!ranked[1] || ranked[1].score <= ranked[0].score * ratioCap);
      vlog('[voice] template match', {
        engine: this.kind, vocabId, strategy: 'knn',
        first: ranked[0] && { label: ranked[0].label, s: +ranked[0].score.toFixed(3) },
        second: ranked[1] && { label: ranked[1].label, s: +ranked[1].score.toFixed(3) },
        voteRatio: ranked[1] ? +(ranked[1].score / ranked[0].score).toFixed(3) : null,
        nearest: +nearest.toFixed(2), frames: frames.length,
      });
    } else {
      const ranked = matchTemplates(frames, templates);
      const best = ranked[0];
      const second = ranked[1];
      firstLabel = best?.label;
      secondLabel = second?.label;
      const ratioCap = relMax(this.cfg.relMaxKey, this.cfg.relMaxDefault);
      confident =
        !!best &&
        Number.isFinite(best.distance) &&
        (!second || best.distance <= second.distance * ratioCap);
      vlog('[voice] template match', {
        engine: this.kind, vocabId, strategy: 'best',
        best: best && { label: best.label, d: +best.distance.toFixed(2) },
        second: second && { label: second.label, d: +second.distance.toFixed(2) },
        ratio: best && second ? +(best.distance / second.distance).toFixed(3) : null,
        frames: frames.length,
      });
    }

    if (myTurn !== this.turn) return;

    if (confident && firstLabel) {
      const alts = secondLabel ? [firstLabel, secondLabel] : [firstLabel];
      opts.onResult({ transcript: firstLabel, alternatives: alts, isFinal: true });
    }
    opts.onEnd?.();
  }

  /** Drop the in-memory template cache (after re-calibration). */
  invalidate(): void {
    this.cache = null;
  }

  /**
   * Add the most recent utterance to the self-learning store under `label`
   * — called by the game when a voice answer was scored correct. No-op
   * unless this is the 'general' engine and there is a captured utterance.
   */
  async learn(label: string): Promise<void> {
    if (this.kind !== 'general' || !this.lastFrames) return;
    const vocabId = this.lastVocabId;
    const frames = this.lastFrames;
    this.lastFrames = null; // consume so one answer is learned once
    try {
      await addTemplate(ADAPTIVE_PROFILE, vocabId, label, framesToJson(frames));
      await pruneTemplates(ADAPTIVE_PROFILE, vocabId, label, MAX_LEARNED_PER_LABEL);
      this.cache = null; // next match picks up the new template
      vlog('[voice] general learned', { label, vocabId });
    } catch (e) {
      vlog('[voice] general learn failed', String(e));
    }
  }

  stop(): void {
    this.turn++;
    if (this.abort) {
      this.abort.abort();
      this.abort = null;
    }
  }

  destroy(): void {
    this.stop();
    this.cache = null;
  }
}
