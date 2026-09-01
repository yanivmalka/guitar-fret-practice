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
const NUM_CEPS = 13; // keep coefficients 0..12
const PRE_EMPHASIS = 0.97;
const MEL_LOW_HZ = 200;
const MEL_HIGH_HZ = 8000;

export interface MfccResult {
  /** One Float32Array of length NUM_CEPS per analysis frame. */
  frames: Float32Array[];
}

// ── Resampling ────────────────────────────────────────────────────────

/** Cheap linear resample of `input` from `srcRate` to TARGET_SR. */
export function resampleTo16k(input: Float32Array, srcRate: number): Float32Array {
  if (srcRate === TARGET_SR) return input;
  const ratio = srcRate / TARGET_SR;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
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

  cepstralMeanNormalise(frames);
  return { frames };
}

function cepstralMeanNormalise(frames: Float32Array[]): void {
  if (!frames.length) return;
  const mean = new Float32Array(NUM_CEPS);
  for (const f of frames) for (let c = 0; c < NUM_CEPS; c++) mean[c] += f[c];
  for (let c = 0; c < NUM_CEPS; c++) mean[c] /= frames.length;
  for (const f of frames) for (let c = 0; c < NUM_CEPS; c++) f[c] -= mean[c];
}

/** Serialise MFCC frames to plain arrays for IndexedDB / JSON storage. */
export function framesToJson(frames: Float32Array[]): number[][] {
  return frames.map((f) => Array.from(f));
}

/** Inverse of `framesToJson`. */
export function framesFromJson(rows: number[][]): Float32Array[] {
  return rows.map((r) => Float32Array.from(r));
}

export const MFCC_DIM = NUM_CEPS;
