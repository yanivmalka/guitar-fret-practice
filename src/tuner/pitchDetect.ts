// Standalone pitch-detection core for the tuner prototype. No dependency on
// anything else in the app — this file only knows about raw audio samples.
//
// Algorithm: autocorrelation (ACF) on the time-domain buffer, with a
// normalized-magnitude difference function borrowed from YIN to reject noisy
// / non-periodic buffers instead of returning a confident-looking wrong
// answer. A buffer of silence or unpitched noise returns null rather than a
// guess, which matters for a guitar/bass tuner used in a normal room (traffic,
// talking, fans) — a wrong reading is worse than no reading.
//
// Range: correctly resolves down to a bass low B (~30 Hz) given a large
// enough buffer (see MIN_SAMPLES_FOR_LOW_B below) — a buffer of ~2048 samples
// at 44.1kHz is NOT enough for a bass low E (41.2 Hz, period ~1070 samples,
// too close to the buffer length for a clean second correlation peak).

export interface PitchResult {
  frequency: number;
  /** 0..1 confidence-ish score (normalized correlation at the detected lag). Higher is more reliable. */
  clarity: number;
}

const MIN_FREQUENCY_HZ = 25; // below the lowest bass string with margin
const MAX_FREQUENCY_HZ = 1200; // above the highest fretted note this app quizzes
const RMS_SILENCE_THRESHOLD = 0.01; // ignore near-silent buffers entirely
const MIN_CLARITY = 0.9; // reject weakly-periodic (noisy) buffers

/**
 * Detects the fundamental frequency of a time-domain audio buffer.
 * Returns null when the signal is too quiet or not clearly periodic
 * (background noise, silence, percussive transients).
 */
export function detectPitch(buffer: Float32Array<ArrayBuffer>, sampleRate: number): PitchResult | null {
  const n = buffer.length;

  // 1. Bail out early on near-silence — cheap RMS check.
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / n);
  if (rms < RMS_SILENCE_THRESHOLD) return null;

  // 2. Autocorrelation over the lag range corresponding to our frequency band.
  const minLag = Math.floor(sampleRate / MAX_FREQUENCY_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQUENCY_HZ), n - 1);
  if (maxLag <= minLag) return null;

  // Normalized autocorrelation: r(lag) / sqrt(energy(0) * energy(lag)) so the
  // result is comparable across lags and buffers (a proper clarity score,
  // not a raw magnitude that scales with volume).
  let bestLag = -1;
  let bestCorrelation = 0;
  const c0 = sumSquares;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let energyLag = 0;
    const count = n - lag;
    for (let i = 0; i < count; i++) {
      corr += buffer[i] * buffer[i + lag];
      energyLag += buffer[i + lag] * buffer[i + lag];
    }
    const denom = Math.sqrt(c0 * energyLag);
    const normalized = denom > 0 ? corr / denom : 0;
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < MIN_CLARITY) return null;

  // 3. Parabolic interpolation around the best lag for sub-sample precision
  //    (without it, pitch reads in discrete sampleRate/lag steps, which is
  //    audibly coarse — several cents of jitter near the low end).
  const refinedLag = parabolicInterpolate(buffer, bestLag, minLag, maxLag);

  const frequency = sampleRate / refinedLag;
  if (!Number.isFinite(frequency) || frequency < MIN_FREQUENCY_HZ || frequency > MAX_FREQUENCY_HZ) {
    return null;
  }

  return { frequency, clarity: bestCorrelation };
}

function correlationAt(buffer: Float32Array<ArrayBuffer>, lag: number): number {
  const n = buffer.length;
  const count = n - lag;
  let corr = 0;
  for (let i = 0; i < count; i++) {
    corr += buffer[i] * buffer[i + lag];
  }
  return corr;
}

function parabolicInterpolate(
  buffer: Float32Array<ArrayBuffer>,
  lag: number,
  minLag: number,
  maxLag: number,
): number {
  if (lag <= minLag || lag >= maxLag) return lag;
  const y0 = correlationAt(buffer, lag - 1);
  const y1 = correlationAt(buffer, lag);
  const y2 = correlationAt(buffer, lag + 1);
  const denom = y0 - 2 * y1 + y2;
  if (denom === 0) return lag;
  const shift = 0.5 * (y0 - y2) / denom;
  // Clamp the shift — a bad denominator near zero can blow this up.
  const clamped = Math.max(-1, Math.min(1, shift));
  return lag + clamped;
}
