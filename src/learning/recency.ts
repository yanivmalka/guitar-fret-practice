// ── recency.ts — exponential time-decay weighting for practice statistics ──
//
// A pure, domain-neutral helper. It knows nothing about React, the clock, or
// storage, and carries no vocabulary from any one learning area — it only ever
// sees rows of `{ correct, atMs }` or `{ seconds, atMs }` plus a `now`.
// Callers in the notes lane, the interval lane and (later) the path lane all
// reduce their own history down to those shapes and share this one decay model.
//
// The model (approved spec — product-wishlist.md, "Recency model: exponential
// time-decay for the practice-statistics windows"):
//
//   • Each answer gets a weight `w = 0.5 ** (ageMs / halfLifeMs)`, so an answer
//     exactly one half-life old counts half as much as a brand-new one, one
//     two half-lives old a quarter, and so on — a smooth sag rather than the
//     old hard "last N answers, drop anything past 45 days" window.
//   • A position's recent accuracy is the weighted mean
//     `Σ(w·correct) / Σ(w)`, and its evidence weight is the effective sample
//     size `effectiveN = Σ(w)`.
//   • The half-life is 14 days by default; a 180-day hard cap still applies,
//     but purely as a performance / storage bound and it is enforced by the
//     caller before rows reach this module — nothing here age-filters.
//
// Every function is pure: identical inputs run the identical floating-point
// operations, so callers' determinism assertions hold.

/** Milliseconds in one day. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Default half-life for the decay weight, in days. */
export const DEFAULT_HALF_LIFE_DAYS = 14;

/**
 * Hard cap, in days. Rows older than this (or with no usable timestamp) are
 * dropped by the caller before anything here sees them — a performance /
 * storage bound only, never a data delete.
 */
export const HARD_CAP_DAYS = 180;

/**
 * Evidence gate: the minimum `effectiveN` before a weighted accuracy is
 * trusted on its own. Below it, `positionScore` falls back to the bucket floor.
 */
export const MIN_EFFECTIVE_N = 3;

/**
 * Bucket → score lookup, indexed by Leitner bucket 0…6. Used by
 * `positionScore` as a *floor* only, and only while fresh evidence is still
 * thin. Bucket 3 maps to 0.85 so a well-scheduled position with little recent
 * history still clears the "known" line, matching the old "bucket >= 3 alone ⇒
 * known" behaviour. The 0.3 / 0.6 entries are secondary tuning — they only
 * ever apply below the evidence gate — but are fixed here for determinism.
 */
export const BUCKET_SCORE: readonly number[] = [0, 0.3, 0.6, 0.85, 0.9, 0.95, 1.0];

/**
 * The decay weight for an answer `ageMs` old given `halfLifeMs`.
 * `w = 0.5 ** (ageMs / halfLifeMs)`. A negative `ageMs` (a row timestamped in
 * the future, e.g. from clock skew) is clamped to age 0 ⇒ weight 1.
 */
export function recencyWeight(ageMs: number, halfLifeMs: number): number {
  const age = ageMs > 0 ? ageMs : 0;
  return 0.5 ** (age / halfLifeMs);
}

/**
 * Weighted accuracy and effective sample size over `rows`.
 *
 * `effectiveN = Σ w`; `accuracy = Σ(w·correct) / Σ w`, and `accuracy` is `0`
 * when `Σ w === 0` (no rows, or every row weighted to nothing). Does **not**
 * age-filter — the caller passes rows already inside the hard cap.
 */
export function weightedAccuracy(
  rows: ReadonlyArray<{ correct: boolean; atMs: number }>,
  now: number,
  halfLifeMs: number,
): { accuracy: number; effectiveN: number } {
  let sumW = 0;
  let sumWC = 0;
  for (const row of rows) {
    const w = recencyWeight(now - row.atMs, halfLifeMs);
    sumW += w;
    if (row.correct) sumWC += w;
  }
  return {
    accuracy: sumW === 0 ? 0 : sumWC / sumW,
    effectiveN: sumW,
  };
}

/**
 * Recency-weighted mean of `rows`' `seconds`, used by the "slow" signal. `0`
 * when `rows` is empty or weights to nothing. Does not age-filter.
 */
export function weightedMeanSeconds(
  rows: ReadonlyArray<{ seconds: number; atMs: number }>,
  now: number,
  halfLifeMs: number,
): number {
  let sumW = 0;
  let sumWS = 0;
  for (const row of rows) {
    const w = recencyWeight(now - row.atMs, halfLifeMs);
    sumW += w;
    sumWS += w * row.seconds;
  }
  return sumW === 0 ? 0 : sumWS / sumW;
}

/**
 * A position's continuous 0..1 strength score.
 *
 *   • With enough fresh evidence (`effectiveN >= minEffectiveN`) the score is
 *     the weighted accuracy alone — the SRS bucket plays no part, not even as
 *     a floor, so a well-scheduled position with recent evidence of struggling
 *     can still lose its status.
 *   • Below the gate the score is `max(weightedAccuracy, floor)`, where the
 *     floor is `BUCKET_SCORE[srsBucket]` (or `0` when `srsBucket` is `null`).
 */
export function positionScore(
  weightedAccuracy: number,
  effectiveN: number,
  srsBucket: number | null,
  minEffectiveN: number = MIN_EFFECTIVE_N,
): number {
  if (effectiveN >= minEffectiveN) return weightedAccuracy;
  const floor =
    srsBucket == null ? 0 : BUCKET_SCORE[srsBucket] ?? 0;
  return Math.max(weightedAccuracy, floor);
}
