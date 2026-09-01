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

// MFCC coefficient 0 is overall log-energy — it mostly tracks loudness and
// differs a lot between a clean synthetic template and a real microphone,
// so it is heavily down-weighted rather than dropped (dropping it would
// change the feature dimension and invalidate stored templates).
const C0_WEIGHT = 0.2;

function frameDistance(a: Float32Array, b: Float32Array): number {
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    acc += (i === 0 ? C0_WEIGHT : 1) * d * d;
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

/**
 * Match `input` against every template, then collapse to the best distance
 * per label. Returns the per-label results sorted best (smallest) first.
 */
export function matchTemplates(input: Float32Array[], templates: Template[]): DtwMatch[] {
  const bestByLabel = new Map<string, number>();
  for (const t of templates) {
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
  const dists = templates
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
