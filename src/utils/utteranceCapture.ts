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
