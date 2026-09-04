// ── Single-utterance microphone capture with simple VAD ─────────────────
//
// Shared by the voice-calibration screen and the template-matching
// recogniser (`templateSpeechEngine.ts`). Records until a short trailing
// silence (or a hard cap), then resolves with the raw mono PCM.
//
// It can either open its own short-lived microphone, or reuse a long-lived
// `MicSession` (see `openMicSession`) so the recogniser does not tear down
// and re-open getUserMedia + a fresh AudioContext on every keep-alive listen
// turn within one question.
//
// It intentionally does NOT go through the Web Speech API or any network —
// that is the whole point of the personal-profile path.

import { vlog } from './debugLog';

export interface CapturedUtterance {
  pcm: Float32Array;
  sampleRate: number;
}

type MinimalAudioContext = AudioContext & { close(): Promise<void> };

/**
 * A microphone kept open across several `captureUtterance` calls. The
 * template recogniser opens one per question and reuses it for every
 * keep-alive listen turn, instead of re-opening getUserMedia (and a new
 * AudioContext) each turn — which added latency and made the OS microphone
 * indicator flicker on and off.
 */
export interface MicSession {
  ctx: MinimalAudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  sampleRate: number;
  /** Stop the tracks and close the context. Safe to call more than once. */
  close(): void;
}

export interface CaptureOptions {
  /** Give up if speech has not started within this long (ms). */
  onsetTimeoutMs?: number;
  /** Stop this long after speech drops back below the noise gate (ms). */
  trailingSilenceMs?: number;
  /** Absolute cap on recorded speech length (ms). */
  maxSpeechMs?: number;
  /** Abort signal — resolve `null` promptly when it fires. */
  signal?: AbortSignal;
  /** Called once per audio block with the current RMS level (0..~1). */
  onLevel?: (rms: number) => void;
  /**
   * Reuse an already-open microphone instead of opening (and later closing)
   * a fresh one. The session is left open for its owner to close.
   */
  session?: MicSession;
}

const DEFAULTS = {
  onsetTimeoutMs: 4000,
  trailingSilenceMs: 350,
  maxSpeechMs: 2500,
};

function makeAudioContext(): MinimalAudioContext {
  const Ctor: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor() as MinimalAudioContext;
}

/**
 * Open a microphone that outlives a single utterance. Resolves `null` when
 * the mic is unavailable or permission was refused.
 */
export async function openMicSession(): Promise<MicSession | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    return null;
  }
  const ctx = makeAudioContext();
  // A context can come up "suspended" (autoplay policy, backgrounded tab);
  // resume it so `onaudioprocess` actually fires.
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* noop */ }
  }
  const source = ctx.createMediaStreamSource(stream);
  let closed = false;
  return {
    ctx,
    stream,
    source,
    sampleRate: ctx.sampleRate,
    close() {
      if (closed) return;
      closed = true;
      try { source.disconnect(); } catch { /* noop */ }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => { /* noop */ });
    },
  };
}

/**
 * Record one spoken word. Resolves `null` if nothing was said before the
 * onset timeout, or if the capture was aborted, or if the mic is
 * unavailable.
 */
export async function captureUtterance(
  opts: CaptureOptions = {},
): Promise<CapturedUtterance | null> {
  const cfg = { ...DEFAULTS, ...opts };
  if (opts.signal?.aborted) return null;

  const owned = !opts.session;
  const session = opts.session ?? (await openMicSession());
  if (!session) return null;
  if (opts.signal?.aborted) {
    if (owned) session.close();
    return null;
  }

  const { ctx, source, sampleRate } = session;
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* noop */ }
  }

  const BLOCK = 2048;
  const processor = ctx.createScriptProcessor(BLOCK, 1, 1);

  const preRollBlocks = Math.ceil((0.15 * sampleRate) / BLOCK);
  const preRoll: Float32Array[] = [];
  const speech: Float32Array[] = [];

  let started = false;
  let noiseFloor = 0.003;
  let noiseSamples = 0;
  let silenceRun = 0;
  let speechSamples = 0;
  let peak = 0;

  return await new Promise<CapturedUtterance | null>((resolve) => {
    let done = false;
    // ScriptProcessor needs a sink to pump; route to a muted gain so it is
    // silent. Created per capture and disconnected in `cleanup` so a shared
    // session does not accumulate orphan nodes.
    const sink = ctx.createGain();

    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(onsetTimer);
      opts.signal?.removeEventListener('abort', onAbort);
      // Drop this capture's graph. `source` belongs to the session, so only
      // the edge into our processor is removed, not the source itself.
      try { source.disconnect(processor); } catch { /* noop */ }
      try { processor.disconnect(); } catch { /* noop */ }
      try { sink.disconnect(); } catch { /* noop */ }
      // Only a session we opened ourselves is torn down here; a shared
      // MicSession outlives the capture and is closed by its owner.
      if (owned) session.close();
    };

    const finish = (value: CapturedUtterance | null) => {
      cleanup();
      resolve(value);
    };

    const onAbort = () => finish(null);
    opts.signal?.addEventListener('abort', onAbort);

    const onsetTimer = setTimeout(() => {
      if (!started) finish(null);
    }, cfg.onsetTimeoutMs);

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (done) return;
      const block = e.inputBuffer.getChannelData(0);
      let sumSq = 0;
      for (let i = 0; i < block.length; i++) sumSq += block[i] * block[i];
      const rms = Math.sqrt(sumSq / block.length);
      opts.onLevel?.(rms);

      if (!started) {
        // Learn the noise floor from the first ~200ms of not-yet-speech.
        if (noiseSamples < 5) {
          noiseFloor = (noiseFloor * noiseSamples + rms) / (noiseSamples + 1);
          noiseSamples++;
        }
        preRoll.push(new Float32Array(block));
        while (preRoll.length > preRollBlocks) preRoll.shift();

        const gate = Math.max(0.012, noiseFloor * 3.5);
        if (rms > gate) {
          started = true;
          clearTimeout(onsetTimer);
          for (const b of preRoll) speech.push(b);
          speechSamples = speech.reduce((n, b) => n + b.length, 0);
        }
        return;
      }

      speech.push(new Float32Array(block));
      speechSamples += block.length;
      if (rms > peak) peak = rms;

      const gate = Math.max(0.010, noiseFloor * 2.5);
      if (rms < gate) {
        silenceRun += block.length;
      } else {
        silenceRun = 0;
      }

      const trailing = (cfg.trailingSilenceMs / 1000) * sampleRate;
      const cap = (cfg.maxSpeechMs / 1000) * sampleRate;
      if (silenceRun >= trailing || speechSamples >= cap) {
        // Why the recording stopped, and the levels that decided it. Ending
        // on 'cap' means the level never fell below `gate` for long enough —
        // with people talking nearby it never does, and the segmenter is
        // then handed seconds of audio instead of one spoken word.
        vlog('[voice] vad', {
          reason: silenceRun >= trailing ? 'silence' : 'cap',
          ms: Math.round((speechSamples / sampleRate) * 1000),
          noiseFloor: +noiseFloor.toFixed(4),
          gate: +gate.toFixed(4),
          peak: +peak.toFixed(4),
          peakOverGate: +(peak / gate).toFixed(1),
        });
        const pcm = new Float32Array(speechSamples);
        let off = 0;
        for (const b of speech) { pcm.set(b, off); off += b.length; }
        finish({ pcm, sampleRate });
      }
    };

    source.connect(processor);
    sink.gain.value = 0;
    processor.connect(sink);
    sink.connect(ctx.destination);
  });
}

// ── Post-capture segmentation ─────────────────────────────────────────
//
// The segmented personal-profile recogniser (`templateSpeechEngine.ts`)
// needs the spoken answer split into its words: "C" on its own, or
// "C" + "sharp". `captureUtterance` hands back one PCM blob covering the
// whole answer; this splits it on the internal silence between words.
//
// When the speaker runs the two words together with no real gap only one
// voiced run is found. If that run is clearly longer than a single word it
// is force-split at its quietest interior frame so "Csharp" still yields
// two segments.

const SEG_FRAME_MS = 20;
/** A silence gap shorter than this is within one word; longer splits words. */
const SEG_SPLIT_GAP_MS = 110;
/** A lone voiced run longer than this is force-split (assumed letter+accidental). */
const SEG_LONG_WORD_MS = 480;
/** Padding kept around each extracted segment. */
const SEG_PAD_MS = 30;

export function segmentUtterance(
  pcm: Float32Array,
  sampleRate: number,
  opts: { split?: 'auto' | 'never' | 'always' } = {},
): Float32Array[] {
  const frame = Math.max(1, Math.round((SEG_FRAME_MS / 1000) * sampleRate));
  const nFrames = Math.floor(pcm.length / frame);
  if (nFrames < 2) return pcm.length ? [pcm] : [];

  const rms = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    let sumSq = 0;
    const base = f * frame;
    for (let i = 0; i < frame; i++) { const s = pcm[base + i]; sumSq += s * s; }
    rms[f] = Math.sqrt(sumSq / frame);
  }

  // Noise floor: 20th-percentile frame energy.
  const sorted = [...rms].sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.2)] || 0;
  const gate = Math.max(0.010, noiseFloor * 2.5);

  // Contiguous voiced frame runs.
  const runs: [number, number][] = [];
  let start = -1;
  for (let f = 0; f < nFrames; f++) {
    if (rms[f] > gate) {
      if (start < 0) start = f;
    } else if (start >= 0) {
      runs.push([start, f]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, nFrames]);
  if (!runs.length) return [pcm];

  // Merge runs separated by a gap shorter than SEG_SPLIT_GAP_MS.
  const splitGap = Math.round(SEG_SPLIT_GAP_MS / SEG_FRAME_MS);
  const merged: [number, number][] = [[runs[0][0], runs[0][1]]];
  for (let i = 1; i < runs.length; i++) {
    const prev = merged[merged.length - 1];
    if (runs[i][0] - prev[1] < splitGap) prev[1] = runs[i][1];
    else merged.push([runs[i][0], runs[i][1]]);
  }

  let segFrames: [number, number][];
  const longWord = Math.round(SEG_LONG_WORD_MS / SEG_FRAME_MS);
  if (merged.length >= 2) {
    segFrames = merged.slice(0, 2);
  } else {
    const [s, e] = merged[0];
    segFrames = [[s, e]];
    const mode = opts.split ?? 'auto';
    // Split at the quietest interior frame (middle 60%).
    //
    // 'auto' only does so for a run longer than SEG_LONG_WORD_MS whose
    // quietest interior frame is near the noise floor. That test cannot
    // actually tell one word from two: a measured session had single letters
    // running 380-400ms and a fluent "F sharp" 480-600ms, so the length
    // threshold sits inside the overlap, and a fluent pair has no interior
    // near-silence to find. Both fluent "F sharp" takes therefore came back
    // whole and were matched against single-letter templates, which cannot
    // fit — the letter scored 23-24 against 10.7 for the same words spoken
    // with a pause.
    //
    // 'always' ignores both tests, so the caller can score the split reading
    // as a hypothesis of its own rather than trusting a threshold to choose.
    if (mode === 'always' || (mode === 'auto' && e - s > longWord)) {
      const lo = s + Math.floor((e - s) * 0.2);
      const hi = e - Math.floor((e - s) * 0.2);
      let cut = lo;
      let min = Infinity;
      for (let f = lo; f < hi; f++) if (rms[f] < min) { min = rms[f]; cut = f; }
      if (mode === 'always' || min <= gate * 1.2) segFrames = [[s, cut], [cut, e]];
    }
  }

  const pad = Math.round((SEG_PAD_MS / 1000) * sampleRate);
  return segFrames.map(([s, e]) => {
    const a = Math.max(0, s * frame - pad);
    const b = Math.min(pcm.length, e * frame + pad);
    return pcm.slice(a, b);
  });
}

/**
 * The single spoken word inside a calibration take, trimmed the same way a
 * question-time segment is.
 *
 * A stored template and the live utterance it is compared against must go
 * through identical preprocessing, or DTW pays a distance penalty that has
 * nothing to do with which word was spoken. Calibration used to store the
 * MFCC of the whole capture — the word plus the trailing silence that ends
 * it — while `templateSpeechEngine` matches against energy-trimmed
 * segments. Every stored template therefore carried several hundred
 * milliseconds of silence the query did not, adding a large label-independent
 * cost to all of them: in a captured session, matching a speaker against
 * their own recordings scored 21-30, the same range as matching against
 * synthetic templates of a different voice entirely, and one label won
 * almost every turn regardless of what was said.
 *
 * Force-splitting is disabled here: at question time a long voiced run is
 * split because it may be "C sharp", but a calibration take is one word by
 * construction and splitting it would store half a word.
 */
export function isolateWord(pcm: Float32Array, sampleRate: number): Float32Array {
  const segments = segmentUtterance(pcm, sampleRate, { split: 'never' });
  if (!segments.length) return pcm;
  // Normally exactly one; a stray noise burst can add another, so keep the
  // longest, which is the word.
  return segments.reduce((best, s) => (s.length > best.length ? s : best));
}
