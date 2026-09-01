// ── Dynamic Time Warping matcher ────────────────────────────────────────
//
// Part of the on-device "personal voice profile" recogniser. Compares an
// MFCC frame sequence (what the user just said) against a stored template
// (one of their calibration recordings) and returns a length-normalised
// distance — smaller means more similar.
//
// A Sakoe-Chiba band keeps it O(n · band) rather than O(n · m), which
// matters because matching runs against every stored template on the main
// thread right after the user speaks.

// Kept in sync with mfcc.ts by hand (that pair is already tightly coupled):
// NUM_CEPS * 3  =  static + Δ + ΔΔ.
const MFCC_DIM = 39;

function readWeight(key: string, dflt: number): number {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    const v = parseFloat(raw ?? '');
    if (!Number.isNaN(v) && v >= 0 && v <= 1) return v;
  } catch { /* ignore */ }
  return dflt;
}

// Frame layout is [static(13) | Δ(13) | ΔΔ(13)].
//  • index 0 is static log-energy — mostly loudness, which differs a lot
//    between a synthetic template and a real mic, so down-weight it.
//    Tunable:  localStorage.voiceC0Weight = '0.1'
//  • the ΔΔ block is the noisiest stream, so down-weight it too.
//    Tunable:  localStorage.voiceDDeltaWeight = '0.4'
let C0_WEIGHT = readWeight('voiceC0Weight', 0.2);
let DDELTA_WEIGHT = readWeight('voiceDDeltaWeight', 0.5);
const DDELTA_START = (MFCC_DIM / 3) * 2;

/** Override the matcher weights at runtime (test / tuning hook). */
export function setC0Weight(w: number): void {
  if (w >= 0 && w <= 1) C0_WEIGHT = w;
}
export function setDDeltaWeight(w: number): void {
  if (w >= 0 && w <= 1) DDELTA_WEIGHT = w;
}

function frameDistance(a: Float32Array, b: Float32Array): number {
  let acc = 0;
  const n = a.length;
  const ddStart = n === MFCC_DIM ? DDELTA_START : n;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    const w = i === 0 ? C0_WEIGHT : i >= ddStart ? DDELTA_WEIGHT : 1;
    acc += w * d * d;
  }
  return Math.sqrt(acc);
}

/**
 * Length-normalised DTW distance between two MFCC sequences. Returns
 * `Infinity` when either sequence is empty.
 */
export function dtwDistance(seqA: Float32Array[], seqB: Float32Array[]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (!n || !m) return Infinity;
  // Frame-dimension mismatch means one side is a stale template from an
  // older MFCC layout — not comparable.
  if (seqA[0].length !== seqB[0].length) return Infinity;

  const band = Math.max(10, Math.abs(n - m) + 5);
  const INF = Infinity;
  let prev = new Float64Array(m + 1).fill(INF);
  let curr = new Float64Array(m + 1).fill(INF);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(INF);
    const jStart = Math.max(1, i - band);
    const jEnd = Math.min(m, i + band);
    const ai = seqA[i - 1];
    for (let j = jStart; j <= jEnd; j++) {
      const cost = frameDistance(ai, seqB[j - 1]);
      const best = Math.min(prev[j], curr[j - 1], prev[j - 1]);
      curr[j] = best === INF ? INF : best + cost;
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  const raw = prev[m];
  return raw === INF ? INF : raw / (n + m);
}

export interface DtwMatch {
  label: string;
  distance: number;
}

export interface Template {
  label: string;
  frames: Float32Array[];
}

// ── Coarse pre-filter ────────────────────────────────────────────────
//
// Full DTW against every template is O(templates · n · band) on the main
// thread. When a set is large — the bundled "general" templates plus
// anything self-learned — most templates are nowhere near the input. Rank
// all templates cheaply by the L2 distance between their time-averaged MFCC
// vector and the input's, and run full DTW only on the closest few. Left
// off for small sets so the personal profile stays exact.
const PREFILTER_MIN_SET = 60;
const PREFILTER_KEEP = 30;

const meanCache = new WeakMap<Float32Array[], Float32Array>();

function meanVec(frames: Float32Array[]): Float32Array {
  const hit = meanCache.get(frames);
  if (hit) return hit;
  const dim = frames[0]?.length ?? 0;
  const m = new Float32Array(dim);
  for (const f of frames) for (let i = 0; i < dim; i++) m[i] += f[i];
  if (frames.length) for (let i = 0; i < dim; i++) m[i] /= frames.length;
  meanCache.set(frames, m);
  return m;
}

function l2(a: Float32Array, b: Float32Array): number {
  let acc = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const d = a[i] - b[i]; acc += d * d; }
  return Math.sqrt(acc);
}

/** Closest `PREFILTER_KEEP` templates by mean-vector distance, or all of them. */
function prefilter(input: Float32Array[], templates: Template[]): Template[] {
  if (templates.length <= PREFILTER_MIN_SET || !input.length) return templates;
  const q = meanVec(input);
  return templates
    .map((t) => ({ t, d: l2(q, meanVec(t.frames)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, PREFILTER_KEEP)
    .map((x) => x.t);
}

/**
 * Match `input` against every template, then collapse to the best distance
 * per label. Returns the per-label results sorted best (smallest) first.
 */
export function matchTemplates(input: Float32Array[], templates: Template[]): DtwMatch[] {
  const bestByLabel = new Map<string, number>();
  for (const t of prefilter(input, templates)) {
    const d = dtwDistance(input, t.frames);
    const prev = bestByLabel.get(t.label);
    if (prev === undefined || d < prev) bestByLabel.set(t.label, d);
  }
  return [...bestByLabel.entries()]
    .map(([label, distance]) => ({ label, distance }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Distance-weighted k-nearest-neighbour vote. More robust than a single
 * best match when there are many templates per label of uneven quality
 * (the synthetic "general" set), because one bad template can't win on its
 * own. Returns labels ranked by vote score, plus the single nearest
 * template distance for a sanity gate.
 */
export function knnVote(
  input: Float32Array[],
  templates: Template[],
  k = 5,
): { ranked: { label: string; score: number }[]; nearest: number } {
  const dists = prefilter(input, templates)
    .map((t) => ({ label: t.label, distance: dtwDistance(input, t.frames) }))
    .sort((a, b) => a.distance - b.distance);
  const score = new Map<string, number>();
  for (const d of dists.slice(0, k)) {
    score.set(d.label, (score.get(d.label) ?? 0) + 1 / (d.distance + 1e-6));
  }
  const ranked = [...score.entries()]
    .map(([label, s]) => ({ label, score: s }))
    .sort((a, b) => b.score - a.score);
  return { ranked, nearest: dists.length ? dists[0].distance : Infinity };
}
