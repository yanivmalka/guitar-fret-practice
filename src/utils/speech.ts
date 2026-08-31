// ── Speech-recognition engine abstraction ───────────────────────────────
//
// WP-2 of the voice-recognition feature. One small interface, two
// implementations chosen at runtime:
//
//   • web    — the browser's SpeechRecognition / webkitSpeechRecognition
//              (Chrome/Edge desktop + Android Chrome). Needs a network
//              connection; unlike the rest of the PWA it does not work
//              offline.
//   • native — @capacitor-community/speech-recognition, used inside the
//              Capacitor Android app where the web API is absent. Loaded
//              lazily so the web build has no hard dependency on the plugin.
//   • none   — neither is available; callers fall back to tap input.
//
// The engine only produces raw transcripts. Turning a transcript into a
// note/fret is `speechVocab.ts`'s job.

import type { SpeechNotation } from './speechVocab';
import { speechVocabulary } from './speechVocab';

export type SpeechEngineKind = 'web' | 'native' | 'none';

export type SpeechEngineError =
  | 'not-supported'
  | 'no-permission'
  | 'no-speech'
  | 'aborted'
  | 'network'
  | 'unknown';

export interface SpeechResult {
  /** Top-ranked hypothesis. */
  transcript: string;
  /** All hypotheses for this result, best first (includes `transcript`). */
  alternatives: string[];
  isFinal: boolean;
  confidence?: number;
}

export interface SpeechListenOptions {
  /** BCP-47 tag, e.g. "en-US" or "he-IL". */
  lang: string;
  /** Phrases to bias the recogniser towards (from `speechVocabulary()`). */
  vocabulary?: string[];
  onResult: (r: SpeechResult) => void;
  onError: (e: SpeechEngineError) => void;
  /** Fired once the recogniser has stopped, for any reason. */
  onEnd?: () => void;
}

export interface SpeechEngine {
  readonly kind: SpeechEngineKind;
  isSupported(): boolean;
  /** Prompt for / verify microphone permission. Resolves to granted. */
  requestPermission(): Promise<boolean>;
  /** Begin a single listen turn. Rejects only on synchronous setup failure. */
  start(opts: SpeechListenOptions): Promise<void>;
  /** Stop the current listen turn early (safe to call when idle). */
  stop(): void;
  /** Release any retained resources. */
  destroy(): void;
}

// ── Language helper ───────────────────────────────────────────────────

/**
 * Best-effort BCP-47 tag for the active note notation. Solfège answers can
 * be spoken in Hebrew ("דו רה מי"), so callers may override.
 */
export function speechLangForNotation(
  _notation: SpeechNotation,
  override?: string,
): string {
  // Both alpha and solfège answers are recognised in English by default;
  // a caller wanting Hebrew solfège ("דו רה מי") passes override "he-IL".
  return override || 'en-US';
}

// ── Web implementation ───────────────────────────────────────────────

type SRConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: unknown;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }
  >;
}

function getSRConstructor(): SRConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getGrammarListConstructor(): (new () => {
  addFromString(s: string, weight?: number): void;
}) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechGrammarList || w.webkitSpeechGrammarList || null) as never;
}

class WebSpeechEngine implements SpeechEngine {
  readonly kind = 'web' as const;
  private rec: SpeechRecognitionLike | null = null;
  /** Bumped on every start()/stop() so late callbacks from a prior turn are ignored. */
  private turn = 0;

  isSupported(): boolean {
    return getSRConstructor() !== null;
  }

  async requestPermission(): Promise<boolean> {
    // Prefer a silent check when the Permissions API knows the answer.
    try {
      const status = await navigator.permissions?.query({
        name: 'microphone' as PermissionName,
      });
      if (status?.state === 'granted') return true;
      if (status?.state === 'denied') return false;
    } catch {
      /* Permissions API not available for "microphone" — fall through */
    }
    // Otherwise trigger the OS prompt via getUserMedia and release the stream.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async start(opts: SpeechListenOptions): Promise<void> {
    const Ctor = getSRConstructor();
    if (!Ctor) {
      opts.onError('not-supported');
      return;
    }
    this.stop(); // end any previous turn
    const myTurn = ++this.turn;
    const rec = new Ctor();
    this.rec = rec;
    rec.lang = opts.lang;
    // Keep the mic open for the whole question. In non-continuous mode the
    // browser ends the turn after the first phrase or a brief silence, which
    // left the app deaf for the rest of the question.
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    const GLCtor = getGrammarListConstructor();
    const vocab = opts.vocabulary;
    if (GLCtor && vocab && vocab.length) {
      try {
        const list = new GLCtor();
        const escaped = vocab.map(v => v.replace(/[;{}]/g, '')).join(' | ');
        list.addFromString(
          `#JSGF V1.0; grammar answers; public <answer> = ${escaped} ;`,
          1,
        );
        rec.grammars = list;
      } catch {
        /* grammar is an optimisation only — ignore build failures */
      }
    }

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      if (myTurn !== this.turn) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const alt = res[0];
        if (!alt) continue;
        // Pass every alternative, not just the top one: an isolated note
        // letter is often ranked below a common homophone ("see" over "C",
        // "for" over "four"), and the caller keeps the first that parses.
        const alternatives: string[] = [];
        for (let a = 0; a < res.length; a++) {
          const t = res[a]?.transcript;
          if (t) alternatives.push(t);
        }
        opts.onResult({
          transcript: alt.transcript,
          alternatives,
          isFinal: res.isFinal,
          confidence: alt.confidence,
        });
      }
    };
    rec.onerror = (e: { error: string }) => {
      if (myTurn !== this.turn) return;
      opts.onError(mapWebError(e.error));
    };
    rec.onend = () => {
      if (myTurn !== this.turn) return;
      this.rec = null;
      opts.onEnd?.();
    };

    try {
      rec.start();
    } catch {
      // start() throws if called while already running — treat as aborted
      this.rec = null;
      opts.onError('aborted');
    }
  }

  stop(): void {
    this.turn++;
    const rec = this.rec;
    this.rec = null;
    if (rec) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
  }

  destroy(): void {
    this.turn++;
    const rec = this.rec;
    this.rec = null;
    if (rec) {
      try { rec.abort(); } catch { /* noop */ }
    }
  }
}

function mapWebError(code: string): SpeechEngineError {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'no-permission';
    case 'no-speech':
      return 'no-speech';
    case 'aborted':
      return 'aborted';
    case 'network':
      return 'network';
    default:
      return 'unknown';
  }
}

// ── Native (Capacitor) implementation ────────────────────────────────
//
// `@capacitor-community/speech-recognition` (WP-6) is a real dependency now.
// It is still imported lazily — via a code-split dynamic import — so the web
// bundle never has to load it: `isCapacitorNative()` is false in a browser,
// so `NativeSpeechEngine` is never constructed there and the chunk is never
// fetched. The plugin's Android library manifest contributes the
// `RECORD_AUDIO` permission and the `RecognitionService` <queries> entry via
// Gradle manifest merging, so `npx cap sync android` is all that is needed.
// It is typed loosely here to avoid coupling to the plugin's exact d.ts.

interface NativePlugin {
  available(): Promise<{ available: boolean }>;
  checkPermissions?(): Promise<{ speechRecognition: string }>;
  requestPermissions?(): Promise<{ speechRecognition: string }>;
  requestPermission?(): Promise<void>;
  hasPermission?(): Promise<{ permission: boolean }>;
  start(opts: {
    language: string;
    maxResults?: number;
    partialResults?: boolean;
    popup?: boolean;
  }): Promise<{ matches?: string[] }>;
  stop(): Promise<void>;
  removeAllListeners?(): Promise<void>;
  addListener(
    event: 'partialResults',
    cb: (data: { matches?: string[] }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void };
}

async function loadNativePlugin(): Promise<NativePlugin | null> {
  try {
    const mod = await import('@capacitor-community/speech-recognition');
    return (
      (mod as unknown as { SpeechRecognition?: NativePlugin }).SpeechRecognition ?? null
    );
  } catch {
    return null;
  }
}

class NativeSpeechEngine implements SpeechEngine {
  readonly kind = 'native' as const;
  private plugin: NativePlugin | null = null;
  private listener: { remove: () => void } | null = null;
  private turn = 0;

  private async getPlugin(): Promise<NativePlugin | null> {
    if (!this.plugin) this.plugin = await loadNativePlugin();
    return this.plugin;
  }

  isSupported(): boolean {
    // Cheap synchronous guess; the async check happens in start().
    return true;
  }

  async requestPermission(): Promise<boolean> {
    const p = await this.getPlugin();
    if (!p) return false;
    try {
      if (p.requestPermissions) {
        const r = await p.requestPermissions();
        return r.speechRecognition === 'granted';
      }
      if (p.requestPermission) {
        await p.requestPermission();
        const h = await p.hasPermission?.();
        return h ? h.permission : true;
      }
    } catch {
      return false;
    }
    return true;
  }

  async start(opts: SpeechListenOptions): Promise<void> {
    const p = await this.getPlugin();
    if (!p) { opts.onError('not-supported'); return; }
    try {
      const avail = await p.available();
      if (!avail.available) { opts.onError('not-supported'); return; }
    } catch {
      opts.onError('not-supported');
      return;
    }

    this.stop();
    const myTurn = ++this.turn;

    try {
      const sub = await p.addListener('partialResults', (data) => {
        if (myTurn !== this.turn) return;
        const matches = (data.matches ?? []).filter(Boolean);
        if (matches.length) {
          opts.onResult({ transcript: matches[0], alternatives: matches, isFinal: false });
        }
      });
      this.listener = sub as { remove: () => void };
    } catch {
      /* partial results are optional */
    }

    try {
      const res = await p.start({
        language: opts.lang,
        maxResults: 3,
        partialResults: true,
        popup: false,
      });
      if (myTurn !== this.turn) return;
      const matches = (res.matches ?? []).filter(Boolean);
      if (matches.length) {
        opts.onResult({ transcript: matches[0], alternatives: matches, isFinal: true });
      }
      opts.onEnd?.();
    } catch (err) {
      if (myTurn !== this.turn) return;
      const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
      if (msg.includes('permission')) opts.onError('no-permission');
      else if (msg.includes('no match') || msg.includes('speech')) opts.onError('no-speech');
      else if (msg.includes('network')) opts.onError('network');
      else opts.onError('unknown');
    } finally {
      this.clearListener();
    }
  }

  stop(): void {
    this.turn++;
    this.clearListener();
    this.plugin?.stop().catch(() => { /* not running */ });
  }

  destroy(): void {
    this.stop();
    this.plugin?.removeAllListeners?.().catch(() => { /* noop */ });
  }

  private clearListener(): void {
    try { this.listener?.remove(); } catch { /* noop */ }
    this.listener = null;
  }
}

class NullSpeechEngine implements SpeechEngine {
  readonly kind = 'none' as const;
  isSupported(): boolean { return false; }
  async requestPermission(): Promise<boolean> { return false; }
  async start(opts: SpeechListenOptions): Promise<void> { opts.onError('not-supported'); }
  stop(): void { /* noop */ }
  destroy(): void { /* noop */ }
}

// ── Engine selection ─────────────────────────────────────────────────

let cached: SpeechEngine | null = null;

function isCapacitorNative(): boolean {
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return cap.getPlatform?.() === 'android' || cap.getPlatform?.() === 'ios';
}

/** Singleton engine for the current platform. */
export function getSpeechEngine(): SpeechEngine {
  if (cached) return cached;
  if (isCapacitorNative()) cached = new NativeSpeechEngine();
  else if (getSRConstructor()) cached = new WebSpeechEngine();
  else cached = new NullSpeechEngine();
  return cached;
}

/** True when *some* recogniser is expected to work on this platform. */
export function isSpeechAvailable(): boolean {
  return getSpeechEngine().kind !== 'none';
}

/** Convenience re-export so callers pass one thing to `start()`. */
export function vocabularyFor(notation: SpeechNotation): string[] {
  return speechVocabulary(notation);
}
