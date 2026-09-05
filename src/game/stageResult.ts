// ── Game stage result + star rating ─────────────────────────────────────
//
// Architectural slot:  Stage → Drill → SessionResult → StageResult
//
// Pure data logic. No React, no hooks, no localStorage, no Supabase, no
// App.tsx, no global state. Nothing here is persisted — a StageResult is
// recomputed from a run every time. Keeping the player's best rating and
// unlocking the next stage is GameProgress (Task 5).

import type { SessionResult } from '../drill/DrillConfig';
import type { Stage, StageTargets } from './models';

/** 0–3 stars. 0 means the run missed the stage's baseline accuracy. */
export type StarRating = 0 | 1 | 2 | 3;

// Which of a stage's goals a run cleared.
//   • `accuracy`      — the 1★ baseline gate (always defined by a stage).
//   • `longestStreak` / `avgSeconds` — the two optional "advanced" goals;
//     `null` when the stage does not set that goal at all.
export interface TargetChecks {
  accuracy: boolean;
  longestStreak: boolean | null;
  avgSeconds: boolean | null;
}

// Compare a run against a stage's targets, goal by goal. The single place the
// per-goal comparisons live, so `evaluateStars` and `buildStageResult` can
// never drift apart. A goal is "met" when the run is at or beyond the bar
// (`>=` for accuracy/streak, `<=` for the time target).
export function checkTargets(result: SessionResult, targets: StageTargets): TargetChecks {
  return {
    accuracy: result.accuracy >= targets.minAccuracy,
    longestStreak: targets.minLongestStreak === undefined
      ? null
      : result.longestStreak >= targets.minLongestStreak,
    avgSeconds: targets.maxAvgSeconds === undefined
      ? null
      : result.avgSeconds !== null && result.avgSeconds <= targets.maxAvgSeconds,
  };
}

/**
 * Rate a finished drill run against a stage's targets. Pure and deterministic:
 * the same `(result, targets)` always yields the same integer.
 *
 * Tiers:
 *   0★ — accuracy below `minAccuracy` (the baseline was not met).
 *   1★ — baseline met.
 *   2★ — baseline met + one of the stage's advanced goals cleared.
 *   3★ — baseline met + every advanced goal the stage sets cleared.
 *
 * The advanced goals are `minLongestStreak` and `maxAvgSeconds`; each one the
 * stage defines *and* the run clears adds a star (capped at 3). A stage that
 * sets neither advanced goal therefore tops out at 1★, and a stage that sets
 * one tops out at 2★ — to make the full 0–3 range reachable a stage defines
 * both (see `open-strings-2` in `stages.ts`). This keeps the rating a plain
 * count of cleared goals rather than hidden logic inside this function.
 */
export function evaluateStars(result: SessionResult, targets: StageTargets): StarRating {
  const checks = checkTargets(result, targets);
  if (!checks.accuracy) return 0;
  let stars = 1;
  if (checks.longestStreak === true) stars += 1;
  if (checks.avgSeconds === true) stars += 1;
  return Math.min(stars, 3) as StarRating;
}

// ── StageResult ────────────────────────────────────────────────────────
//
// The full outcome of one stage run, ready for a UI to render without
// recomputing anything: the star rating, the raw run snapshot, the bar it
// was judged against, and which goals were cleared.
export interface StageResult {
  stageId: string;
  stars: StarRating;
  /** The complete drill-run snapshot this rating came from. */
  sessionResult: SessionResult;
  /** The targets the run was rated against (copied from the stage). */
  targets: StageTargets;
  /** Per-goal pass/fail; `longestStreak` / `avgSeconds` are `null` when the
   *  stage does not set that goal. */
  metTargets: TargetChecks;
}

/**
 * Build the `StageResult` for a run: `Stage` + its drill's `SessionResult`
 * in, a fully-derived result out. Pure — no side effects, nothing stored.
 */
export function buildStageResult(stage: Stage, sessionResult: SessionResult): StageResult {
  return {
    stageId: stage.id,
    stars: evaluateStars(sessionResult, stage.targets),
    sessionResult,
    targets: stage.targets,
    metTargets: checkTargets(sessionResult, stage.targets),
  };
}
