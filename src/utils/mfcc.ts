// ── MFCC feature extraction ─────────────────────────────────────────────
//
// Part of the on-device "personal voice profile" recogniser. Turns a raw
// mono PCM utterance into a sequence of MFCC frames that `dtw.ts` can match
// against the user's own calibration recordings.
//
// Deliberately small and dependency-free: pre-emphasis → framing (Hamming)
// → radix-2 FFT → mel filterbank → log → DCT-II, then per-utterance
// cepstral mean normalisation for channel/mic robustness. No delta
// features in v1 — the vocabulary is tiny (12 isolated note names) and the
// static coefficients already separate them well.

const TARGET_SR = 16000;
const FRAME_MS = 25;
const HOP_MS = 10;
const FFT_SIZE = 512; // next pow2 >= 16000 * 0.025 = 400
const MEL_FILTERS = 26;
const NUM_CEPS = 13; // static coefficients 0..12
const PRE_EMPHASIS = 0.97;
const MEL_LOW_HZ = 200;
const MEL_HIGH_HZ = 8000;
// Each frame is [static | Δ | ΔΔ] — the static cepstrum plus its first and
// second time derivatives. The derivatives capture how the sound moves,
// which is what separates the pairs the static coefficients alone confuse
// (B/E/G/D, "sharp"/"dièse"). Regression window for the delta estimate.
const DELTA_WIN = 2;
// Anti-alias cutoff before decimating to 16 kHz. Just below Nyquist (8 kHz);
// without it a 44.1/48 kHz capture folds HF energy back into the mel bands.
const ANTIALIAS_HZ = 7200;

export interface MfccResult {
  /** One Float32Array of length MFCC_DIM (static + Δ + ΔΔ) per analysis frame. */
  frames: Float32Array[];
}

// ── Resampling ────────────────────────────────────────────────────────

/**
 * One-pole-per-stage biquad low-pass (RBJ cookbook, Butterworth Q), applied
 * forward once. Phase is shifted but MFCC/DTW don't care.
 */
function lowpass(sig: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const b0 = (1 - cw) / 2;
  const b1 = 1 - cw;
  const b2 = (1 - cw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cw;
  const a2 = 1 - alpha;
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const out = new Float32Array(sig.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < sig.length; i++) {
    const x0 = sig[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** Linear resample of `input` from `srcRate` to TARGET_SR, anti-aliased first. */
export function resampleTo16k(input: Float32Array, srcRate: number): Float32Array {
  if (srcRate === TARGET_SR) return input;
  const src = srcRate > TARGET_SR ? lowpass(input, srcRate, ANTIALIAS_HZ) : input;
  const ratio = srcRate / TARGET_SR;
  const outLen = Math.max(1, Math.floor(src.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(src.length - 1, i0 + 1);
    const frac = pos - i0;
    out[i] = src[i0] * (1 - frac) + src[i1] * frac;
  }
  return out;
}

// ── Radix-2 iterative FFT (real input) ───────────────────────────────

function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curR = 1;
      let curI = 0;
      for (let k = 0; k < len / 2; k++) {
        const aR = re[i + k];
        const aI = im[i + k];
        const bR = re[i + k + len / 2] * curR - im[i + k + len / 2] * curI;
        const bI = re[i + k + len / 2] * curI + im[i + k + len / 2] * curR;
        re[i + k] = aR + bR;
        im[i + k] = aI + bI;
        re[i + k + len / 2] = aR - bR;
        im[i + k + len / 2] = aI - bI;
        const nextR = curR * wr - curI * wi;
        curI = curR * wi + curI * wr;
        curR = nextR;
      }
    }
  }
}

// ── Mel filterbank (built once) ──────────────────────────────────────

const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);

function buildMelFilterbank(): Float32Array[] {
  const bins = FFT_SIZE / 2 + 1;
  const melLow = hzToMel(MEL_LOW_HZ);
  const melHigh = hzToMel(Math.min(MEL_HIGH_HZ, TARGET_SR / 2));
  const points = new Float32Array(MEL_FILTERS + 2);
  for (let i = 0; i < points.length; i++) {
    const mel = melLow + ((melHigh - melLow) * i) / (MEL_FILTERS + 1);
    points[i] = Math.floor(((FFT_SIZE + 1) * melToHz(mel)) / TARGET_SR);
  }
  const filters: Float32Array[] = [];
  for (let m = 1; m <= MEL_FILTERS; m++) {
    const f = new Float32Array(bins);
    const left = points[m - 1];
    const centre = points[m];
    const right = points[m + 1];
    for (let k = left; k < centre; k++) {
      if (centre !== left) f[k] = (k - left) / (centre - left);
    }
    for (let k = centre; k < right; k++) {
      if (right !== centre) f[k] = (right - k) / (right - centre);
    }
    filters.push(f);
  }
  return filters;
}

const MEL_BANK = buildMelFilterbank();

// ── DCT-II matrix (built once) ──────────────────────────────────────

const DCT_MATRIX: Float32Array[] = (() => {
  const rows: Float32Array[] = [];
  for (let k = 0; k < NUM_CEPS; k++) {
    const row = new Float32Array(MEL_FILTERS);
    for (let n = 0; n < MEL_FILTERS; n++) {
      row[n] = Math.cos((Math.PI * k * (n + 0.5)) / MEL_FILTERS);
    }
    rows.push(row);
  }
  return rows;
})();

const HAMMING = (() => {
  const len = Math.round((TARGET_SR * FRAME_MS) / 1000);
  const w = new Float32Array(len);
  for (let i = 0; i < len; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (len - 1));
  return w;
})();

// ── Main entry ──────────────────────────────────────────────────────

/**
 * Extract MFCC frames from a mono PCM utterance. Returns an empty frame
 * list for input too short to make a single frame.
 */
export function computeMfcc(pcm: Float32Array, sampleRate: number): MfccResult {
  const sig = resampleTo16k(pcm, sampleRate);

  // Pre-emphasis.
  const emph = new Float32Array(sig.length);
  emph[0] = sig[0];
  for (let i = 1; i < sig.length; i++) emph[i] = sig[i] - PRE_EMPHASIS * sig[i - 1];

  const frameLen = HAMMING.length;
  const hop = Math.round((TARGET_SR * HOP_MS) / 1000);
  const bins = FFT_SIZE / 2 + 1;
  const frames: Float32Array[] = [];

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const power = new Float32Array(bins);
  const melEnergies = new Float32Array(MEL_FILTERS);

  for (let start = 0; start + frameLen <= emph.length; start += hop) {
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < frameLen; i++) re[i] = emph[start + i] * HAMMING[i];

    fftRadix2(re, im);
    for (let k = 0; k < bins; k++) power[k] = (re[k] * re[k] + im[k] * im[k]) / FFT_SIZE;

    for (let m = 0; m < MEL_FILTERS; m++) {
      const filt = MEL_BANK[m];
      let acc = 0;
      for (let k = 0; k < bins; k++) acc += power[k] * filt[k];
      melEnergies[m] = Math.log(acc + 1e-10);
    }

    const ceps = new Float32Array(NUM_CEPS);
    for (let c = 0; c < NUM_CEPS; c++) {
      const row = DCT_MATRIX[c];
      let acc = 0;
      for (let n = 0; n < MEL_FILTERS; n++) acc += melEnergies[n] * row[n];
      ceps[c] = acc;
    }
    frames.push(ceps);
  }

  if (!frames.length) return { frames };

  // static → normalise → Δ (from normalised static) → ΔΔ → normalise each,
  // then splice the three streams into one 39-d frame.
  cmvn(frames);
  const d1 = deltas(frames);
  const d2 = deltas(d1);
  cmvn(d1);
  cmvn(d2);

  const out: Float32Array[] = new Array(frames.length);
  for (let t = 0; t < frames.length; t++) {
    const f = new Float32Array(NUM_CEPS * 3);
    f.set(frames[t], 0);
    f.set(d1[t], NUM_CEPS);
    f.set(d2[t], NUM_CEPS * 2);
    out[t] = f;
  }
  return { frames: out };
}

/**
 * Cepstral mean+variance normalisation, in place. The mean is always
 * removed (channel/mic robustness); the variance is only equalised when
 * there are enough frames for the estimate to be meaningful.
 */
function cmvn(frames: Float32Array[]): void {
  const T = frames.length;
  if (!T) return;
  const dim = frames[0].length;
  const mean = new Float32Array(dim);
  for (const f of frames) for (let c = 0; c < dim; c++) mean[c] += f[c];
  for (let c = 0; c < dim; c++) mean[c] /= T;
  for (const f of frames) for (let c = 0; c < dim; c++) f[c] -= mean[c];
  if (T < 3) return;
  const scale = new Float32Array(dim);
  for (const f of frames) for (let c = 0; c < dim; c++) scale[c] += f[c] * f[c];
  for (let c = 0; c < dim; c++) {
    const sd = Math.sqrt(scale[c] / T);
    scale[c] = sd > 1e-3 ? 1 / sd : 1;
  }
  for (const f of frames) for (let c = 0; c < dim; c++) f[c] *= scale[c];
}

/** First time-derivative of a frame stream, by ±DELTA_WIN linear regression. */
function deltas(frames: Float32Array[]): Float32Array[] {
  const T = frames.length;
  const dim = frames[0]?.length ?? 0;
  let denom = 0;
  for (let n = 1; n <= DELTA_WIN; n++) denom += n * n;
  denom *= 2;
  const out: Float32Array[] = new Array(T);
  for (let t = 0; t < T; t++) {
    const d = new Float32Array(dim);
    for (let n = 1; n <= DELTA_WIN; n++) {
      const plus = frames[Math.min(T - 1, t + n)];
      const minus = frames[Math.max(0, t - n)];
      for (let c = 0; c < dim; c++) d[c] += n * (plus[c] - minus[c]);
    }
    for (let c = 0; c < dim; c++) d[c] /= denom;
    out[t] = d;
  }
  return out;
}

/** Serialise MFCC frames to plain arrays for IndexedDB / JSON storage. */
export function framesToJson(frames: Float32Array[]): number[][] {
  return frames.map((f) => Array.from(f));
}

/** Inverse of `framesToJson`. */
export function framesFromJson(rows: number[][]): Float32Array[] {
  return rows.map((r) => Float32Array.from(r));
}

/** Frame dimensionality: static + Δ + ΔΔ. Mirrored as a literal in dtw.ts. */
export const MFCC_DIM = NUM_CEPS * 3;
