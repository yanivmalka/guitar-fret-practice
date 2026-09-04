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
import { captureUtterance, segmentUtterance } from './utteranceCapture';
import { computeMfcc, framesFromJson, framesToJson } from './mfcc';
import { knnVote, matchTemplates, type Template } from './dtw';
import {
  addTemplate, pruneTemplates, pruneLearnedTemplates, getActiveProfile,
  ADAPTIVE_PROFILE,
} from './voiceProfile';
import { isLetterLabel, isAccidentalLabel } from './voiceProfileVocab';
import { SHARP_WRAP, FLAT_TO_SHARP } from './speechVocab';
import { verror, vlog } from './debugLog';

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

// Absolute ceiling on the nearest-template distance. Even when the best
// match is clearly ahead of the runner-up (the `relMax` ratio gate), reject
// it when nothing is actually close — a cough or an unrelated word can be
// "clearly closest" and still be nothing like any note.
//
// OFF by default: real phone-mic distances run higher than the synthetic
// numbers this was tuned against, and a too-tight cap silently rejected every
// in-game answer. Opt in per engine once you have watched the
// "[voice] template match" debug lines (localStorage.debugVoiceVerbose = '1')
// and know a safe number:
//   localStorage.voiceProfileAbsMax = '40'   /  localStorage.voiceGeneralAbsMax = '45'
function absMax(key: string): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    if (!Number.isNaN(v) && v > 0) return v;
  } catch { /* ignore */ }
  return Infinity;
}

function hasGetUserMedia(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

// ── Standard-score ("z-norm") re-ranking ──────────────────────────────
//
// Opt-in via  localStorage.voiceProfileZNorm = '1'
//
// The default matcher picks the label with the smallest raw DTW distance.
// One calibration take that came out acoustically "central" is then close to
// *every* spoken word and wins every turn (the stuck-on-"F" symptom). Z-norm
// instead scores each label by how many standard deviations its distance
// sits below the mean label distance for this one utterance, so a globally
// close template stops standing out. A match is kept only when the best
// label leads the runner-up by at least `voiceProfileZGap` std-devs
// (default 0.5).
function zNormEnabled(): boolean {
  try { return localStorage.getItem('voiceProfileZNorm') === '1'; } catch { return false; }
}

function zGap(): number {
  try {
    const v = parseFloat(localStorage.getItem('voiceProfileZGap') ?? '');
    if (!Number.isNaN(v) && v >= 0) return v;
  } catch { /* ignore */ }
  return 0.5;
}

function zScores(
  ranked: { label: string; distance: number }[],
): { label: string; distance: number; z: number }[] {
  const ds = ranked.map((r) => r.distance).filter((d) => Number.isFinite(d));
  if (ds.length < 2) return ranked.map((r) => ({ ...r, z: 0 }));
  const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
  const variance = ds.reduce((a, b) => a + (b - mean) ** 2, 0) / (ds.length - 1);
  const std = Math.sqrt(variance) || 1;
  return ranked
    .map((r) => ({
      ...r,
      z: Number.isFinite(r.distance) ? (r.distance - mean) / std : Infinity,
    }))
    .sort((a, b) => a.z - b.z);
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
  /** localStorage key for the absolute nearest-distance ceiling. */
  absMaxKey: string;
  /** Reject a match whose nearest template distance exceeds this. */
  absMaxDefault: number;
  /**
   * 'best' — single closest template wins (good when there are few, clean
   * templates per label, i.e. the personal profile).
   * 'knn'  — distance-weighted vote over the nearest few templates (more
   * robust with many uneven templates, i.e. the synthetic general set).
   */
  strategy: 'best' | 'knn';
  /**
   * When set, the spoken answer is split into one or two words
   * (`segmentUtterance`) and matched in two stages: segment 0 against the
   * seven letter templates, an optional segment 1 against the "#"/"b"
   * accidental templates, then composed into a note name. Only the personal
   * profile ('best') uses this; the bundled 'general' set stays whole-word.
   */
  segmented?: boolean;
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
  // The segment frames + labels of the most recent segmented profile match,
  // so a correct in-game answer can reinforce the personal profile.
  private lastSegmented: {
    letter: { label: string; frames: Float32Array[] } | null;
    accidental: { label: string; frames: Float32Array[] } | null;
  } | null = null;

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
    // Only memoise a non-empty load. An empty result can be a transient
    // IndexedDB / lazy-chunk failure (`loadTemplates` swallows errors and
    // returns []); caching that would disable this cached engine for the rest
    // of the session. A set that is genuinely empty just gets re-fetched on
    // the next turn — same observable behaviour, no permanent stick.
    if (templates.length) this.cache = { vocabId, templates };
    else this.cache = null;
    return templates;
  }

  async start(opts: SpeechListenOptions): Promise<void> {
    if (!hasGetUserMedia()) { opts.onError('not-supported'); return; }
    const vocabId = opts.profileVocabId ?? 'notes-alpha';
    this.lastVocabId = vocabId;

    this.stop();
    const myTurn = ++this.turn;
    const abort = new AbortController();
    this.abort = abort;

    try {
    const templates = await this.getTemplates(vocabId);
    if (myTurn !== this.turn) return;
    if (!templates.length) { opts.onError('not-supported'); return; }

    // Open a fresh microphone per listen turn. A shared long-lived MicSession
    // was tried here for latency, but on mobile browsers a reused
    // AudioContext/getUserMedia stream sometimes stopped delivering audio
    // mid-question, so every subsequent answer went unheard.
    const captured = await captureUtterance({
      signal: abort.signal,
      // A segmented answer has a mid-word pause ("C" … "sharp"); give it more
      // room before the trailing-silence cutoff, and a longer hard cap.
      ...(this.cfg.segmented ? { trailingSilenceMs: 500, maxSpeechMs: 3500 } : {}),
    });
    if (myTurn !== this.turn) return;
    vlog('[voice] capture', {
      engine: this.kind, vocabId,
      got: !!captured, samples: captured?.pcm.length ?? 0,
      sampleRate: captured?.sampleRate ?? 0,
    });
    if (!captured) { opts.onEnd?.(); return; }

    if (this.cfg.segmented) {
      await this.runSegmented(captured, templates, myTurn, opts);
      return;
    }

    const { frames } = computeMfcc(captured.pcm, captured.sampleRate);
    if (!frames.length) { opts.onEnd?.(); return; }
    this.lastFrames = frames;
    this.lastVocabId = vocabId;

    if (myTurn !== this.turn) return;

    let firstLabel: string | undefined;
    let secondLabel: string | undefined;
    let confident: boolean;
    // Matching runs on the main thread against the whole template set, so the
    // debug line carries its cost — see the pre-filter note in `dtw.ts`.
    const t0 = performance.now();

    if (this.cfg.strategy === 'knn') {
      const { ranked, nearest } = knnVote(frames, templates, 5);
      firstLabel = ranked[0]?.label;
      secondLabel = ranked[1]?.label;
      const ratioCap = relMax(this.cfg.relMaxKey, this.cfg.relMaxDefault);
      const absCap = absMax(this.cfg.absMaxKey);
      const nearOk = Number.isFinite(nearest) && nearest <= absCap;
      const ratioOk = !ranked[1] || ranked[1].score <= ranked[0].score * ratioCap;
      confident = !!firstLabel && nearOk && ratioOk;
      vlog('[voice] template match', {
        engine: this.kind, vocabId, strategy: 'knn', absCap,
        pool: templates.length,
        first: ranked[0] && { label: ranked[0].label, s: +ranked[0].score.toFixed(3), v: ranked[0].votes },
        second: ranked[1] && { label: ranked[1].label, s: +ranked[1].score.toFixed(3), v: ranked[1].votes },
        voteRatio: ranked[1] ? +(ranked[1].score / ranked[0].score).toFixed(3) : null,
        nearest: +nearest.toFixed(2), frames: frames.length,
        ms: +(performance.now() - t0).toFixed(1),
        confident,
        reject: confident ? null : !firstLabel ? 'no-match' : !nearOk ? 'abs-cap' : 'ratio-cap',
      });
    } else {
      const ranked = matchTemplates(frames, templates);
      const best = ranked[0];
      const second = ranked[1];
      firstLabel = best?.label;
      secondLabel = second?.label;
      const ratioCap = relMax(this.cfg.relMaxKey, this.cfg.relMaxDefault);
      const absCap = absMax(this.cfg.absMaxKey);
      const absOk = !!best && Number.isFinite(best.distance) && best.distance <= absCap;
      const ratioOk = !!best && (!second || best.distance <= second.distance * ratioCap);
      confident = absOk && ratioOk;
      vlog('[voice] template match', {
        engine: this.kind, vocabId, strategy: 'best', absCap,
        pool: templates.length,
        best: best && { label: best.label, d: +best.distance.toFixed(2) },
        second: second && { label: second.label, d: +second.distance.toFixed(2) },
        ratio: best && second ? +(best.distance / second.distance).toFixed(3) : null,
        frames: frames.length,
        ms: +(performance.now() - t0).toFixed(1),
        confident,
        reject: confident ? null : !best ? 'no-match' : !absOk ? 'abs-cap' : 'ratio-cap',
      });
    }

    if (myTurn !== this.turn) return;

    if (confident && firstLabel) {
      const alts = secondLabel ? [firstLabel, secondLabel] : [firstLabel];
      opts.onResult({ transcript: firstLabel, alternatives: alts, isFinal: true });
    }
    opts.onEnd?.();
    } catch (e) {
      // An unexpected throw somewhere in the async start flow — AudioContext
      // construction, the getUserMedia audio graph, an IndexedDB read, MFCC
      // extraction. `useVoiceAnswer` calls `start()` as `void`, so a reject
      // here would be an unhandled rejection that leaves voice stuck on
      // 'listening'. Surface it and still fire `onEnd` so the caller's
      // keep-alive / recovery path runs. A stale turn (a concurrent
      // stop()/start(), including a deliberate abort) is not an error.
      if (myTurn === this.turn) {
        verror('[voice] start failed', String(e));
        opts.onError('unknown');
        opts.onEnd?.();
      }
    }
  }

  /**
   * Two-stage segmented match for the personal profile: split the answer
   * into words, match the first against the letter templates and an optional
   * second against the "#"/"b" templates, then compose a canonical note
   * name. Emits nothing (so the caller listens again) unless every segment
   * present clears the confidence gate.
   */
  private async runSegmented(
    captured: { pcm: Float32Array; sampleRate: number },
    templates: Template[],
    myTurn: number,
    opts: SpeechListenOptions,
  ): Promise<void> {
    // The whole-utterance `lastFrames` learn path is for the general engine
    // only; the segmented profile reinforces itself via `lastSegmented`.
    this.lastFrames = null;
    this.lastSegmented = null;

    const segFrames = segmentUtterance(captured.pcm, captured.sampleRate)
      .map((s) => computeMfcc(s, captured.sampleRate).frames)
      .filter((f) => f.length);
    if (myTurn !== this.turn) return;
    if (!segFrames.length) { opts.onEnd?.(); return; }

    const t0 = performance.now();
    const letters = templates.filter((t) => isLetterLabel(t.label));
    const accidentals = templates.filter((t) => isAccidentalLabel(t.label));
    const ratioCap = relMax(this.cfg.relMaxKey, this.cfg.relMaxDefault);
    const absCap = absMax(this.cfg.absMaxKey);

    const gate = (ranked: { label: string; distance: number }[], part: string): string | null => {
      const [best, second] = ranked;
      if (!best || !Number.isFinite(best.distance)) {
        vlog('[voice] segmented reject', { engine: this.kind, part, reason: 'no-match' });
        return null;
      }

      if (zNormEnabled()) {
        const [zb, zs] = zScores(ranked);
        const need = zGap();
        if (zs && zs.z - zb.z < need) {
          vlog('[voice] segmented reject', {
            engine: this.kind, part, reason: 'z-gap',
            zBest: +zb.z.toFixed(2), zSecond: +zs.z.toFixed(2), need,
          });
          return null;
        }
        vlog('[voice] segmented znorm', {
          engine: this.kind, part,
          best: { label: zb.label, z: +zb.z.toFixed(2), d: +zb.distance.toFixed(2) },
          second: zs ? { label: zs.label, z: +zs.z.toFixed(2) } : null,
        });
        return zb.label;
      }
      if (best.distance > absCap) {
        vlog('[voice] segmented reject', {
          engine: this.kind, part, reason: 'abs-cap',
          d: +best.distance.toFixed(2), absCap,
        });
        return null;
      }
      if (second && best.distance > second.distance * ratioCap) {
        vlog('[voice] segmented reject', {
          engine: this.kind, part, reason: 'ratio-cap',
          ratio: +(best.distance / second.distance).toFixed(3), ratioCap,
        });
        return null;
      }
      return best.label;
    };

    const lRanked = matchTemplates(segFrames[0], letters);
    const letter = gate(lRanked, 'letter');
    let note: string | null = letter;
    let accLabel: string | null = null;

    if (letter && segFrames.length >= 2) {
      const aRanked = matchTemplates(segFrames[1], accidentals);
      accLabel = gate(aRanked, 'accidental');
      if (!accLabel) {
        // A second word was spoken but "#" vs "b" is unclear — ask again
        // rather than guess a natural note.
        note = null;
      } else if (accLabel === '#') {
        note = SHARP_WRAP[`${letter}#`] ?? `${letter}#`;
      } else {
        note = FLAT_TO_SHARP[letter] ?? letter;
      }
    }

    vlog('[voice] segmented match', {
      engine: this.kind, segments: segFrames.length,
      pool: { letters: letters.length, accidentals: accidentals.length },
      ms: +(performance.now() - t0).toFixed(1),
      letter: lRanked[0] && { label: lRanked[0].label, d: +lRanked[0].distance.toFixed(2) },
      letter2: lRanked[1] && { label: lRanked[1].label, d: +lRanked[1].distance.toFixed(2) },
      accidental: accLabel, note, confident: !!note,
    });

    if (note && this.kind === 'profile') {
      // Both segments already cleared the confidence gate above; keep them so
      // a correct in-game answer can reinforce the profile (see `learn`).
      this.lastSegmented = {
        letter: letter ? { label: letter, frames: segFrames[0] } : null,
        accidental: accLabel && segFrames[1]
          ? { label: accLabel, frames: segFrames[1] }
          : null,
      };
    }

    if (myTurn !== this.turn) return;
    if (note) {
      opts.onResult({ transcript: note, alternatives: [note], isFinal: true });
    }
    opts.onEnd?.();
  }

  /** Drop the in-memory template cache (after re-calibration). */
  invalidate(): void {
    this.cache = null;
  }

  /**
   * Warm the template cache (IndexedDB read for the profile engine, lazy
   * chunk import for the general one) so the first question does not pay for
   * it. Best-effort — failures are swallowed.
   */
  async warmUp(vocabId = 'notes-alpha'): Promise<void> {
    try { await this.getTemplates(vocabId); } catch { /* best effort */ }
  }

  /**
   * Reinforce the recogniser from an answer the game just scored correct.
   * The general engine folds the whole utterance into its adaptive store;
   * the personal profile adds the matched segments back to itself, capped
   * per label and never touching the user's own calibration takes.
   */
  async learn(label: string): Promise<void> {
    if (this.kind === 'general') { await this.learnGeneral(label); return; }
    if (this.kind === 'profile') { await this.learnProfile(); return; }
  }

  private async learnGeneral(label: string): Promise<void> {
    if (!this.lastFrames) return;
    const vocabId = this.lastVocabId;
    const frames = this.lastFrames;
    this.lastFrames = null; // consume so one answer is learned once
    try {
      await addTemplate(ADAPTIVE_PROFILE, vocabId, label, framesToJson(frames), 'learned');
      await pruneTemplates(ADAPTIVE_PROFILE, vocabId, label, MAX_LEARNED_PER_LABEL);
      this.cache = null; // next match picks up the new template
      vlog('[voice] general learned', { label, vocabId });
    } catch (e) {
      verror('[voice] general learn failed', String(e));
    }
  }

  private async learnProfile(): Promise<void> {
    const seg = this.lastSegmented;
    this.lastSegmented = null; // consume so one answer is learned once
    if (!seg) return;
    const profile = getActiveProfile();
    if (!profile) return;
    const vocabId = this.lastVocabId;
    try {
      for (const part of [seg.letter, seg.accidental]) {
        if (!part) continue;
        await addTemplate(profile, vocabId, part.label, framesToJson(part.frames), 'learned');
        await pruneLearnedTemplates(profile, vocabId, part.label, MAX_LEARNED_PER_LABEL);
      }
      this.cache = null; // next match picks up the new templates
      vlog('[voice] profile learned', {
        vocabId, letter: seg.letter?.label, accidental: seg.accidental?.label,
      });
    } catch (e) {
      verror('[voice] profile learn failed', String(e));
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
