// ── Single-utterance microphone capture with simple VAD ─────────────────
//
// Shared by the voice-calibration screen and the template-matching
// recogniser (`templateSpeechEngine.ts`). Opens its own getUserMedia stream,
// waits for speech to start, records until a short trailing silence (or a
// hard cap), then tears everything down and resolves with the raw mono PCM.
//
// It intentionally does NOT go through the Web Speech API or any network —
// that is the whole point of the personal-profile path.

export interface CapturedUtterance {
  pcm: Float32Array;
  sampleRate: number;
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
}

const DEFAULTS = {
  onsetTimeoutMs: 4000,
  trailingSilenceMs: 350,
  maxSpeechMs: 2500,
};

type MinimalAudioContext = AudioContext & { close(): Promise<void> };

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

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    return null;
  }
  if (opts.signal?.aborted) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  const Ctor: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor() as MinimalAudioContext;
  const source = ctx.createMediaStreamSource(stream);
  const BLOCK = 2048;
  const processor = ctx.createScriptProcessor(BLOCK, 1, 1);

  const sampleRate = ctx.sampleRate;
  const preRollBlocks = Math.ceil((0.15 * sampleRate) / BLOCK);
  const preRoll: Float32Array[] = [];
  const speech: Float32Array[] = [];

  let started = false;
  let noiseFloor = 0.003;
  let noiseSamples = 0;
  let silenceRun = 0;
  let speechSamples = 0;

  return await new Promise<CapturedUtterance | null>((resolve) => {
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(onsetTimer);
      opts.signal?.removeEventListener('abort', onAbort);
      try { processor.disconnect(); } catch { /* noop */ }
      try { source.disconnect(); } catch { /* noop */ }
      stream?.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => { /* noop */ });
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

      const gate = Math.max(0.010, noiseFloor * 2.5);
      if (rms < gate) {
        silenceRun += block.length;
      } else {
        silenceRun = 0;
      }

      const trailing = (cfg.trailingSilenceMs / 1000) * sampleRate;
      const cap = (cfg.maxSpeechMs / 1000) * sampleRate;
      if (silenceRun >= trailing || speechSamples >= cap) {
        const pcm = new Float32Array(speechSamples);
        let off = 0;
        for (const b of speech) { pcm.set(b, off); off += b.length; }
        finish({ pcm, sampleRate });
      }
    };

    source.connect(processor);
    // ScriptProcessor needs a sink to pump; route to a muted gain so it is
    // silent.
    const sink = ctx.createGain();
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
    if (e - s > longWord) {
      // Force-split at the quietest interior frame (middle 60%).
      const lo = s + Math.floor((e - s) * 0.2);
      const hi = e - Math.floor((e - s) * 0.2);
      let cut = lo;
      let min = Infinity;
      for (let f = lo; f < hi; f++) if (rms[f] < min) { min = rms[f]; cut = f; }
      segFrames = [[s, cut], [cut, e]];
    } else {
      segFrames = [[s, e]];
    }
  }

  const pad = Math.round((SEG_PAD_MS / 1000) * sampleRate);
  return segFrames.map(([s, e]) => {
    const a = Math.max(0, s * frame - pad);
    const b = Math.min(pcm.length, e * frame + pad);
    return pcm.slice(a, b);
  });
}
