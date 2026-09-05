// ── Game stage result + star rating ─────────────────────────────────────
//
// Architectural slot:  Stage → Drill → SessionResult → StageResult
//
// Pure data logic. No React, no hooks, no localStorage, no Supabase, no
// App.tsx, no global state. Nothing here is persisted — a StageResult is
// recomputed from a run every time. Keeping the player's best rating and
// unlocking the next stage is GameProgress (Task 5).

import type { SessionResult } from '../drill/DrillConfig';
import type { Stage, StageGoal, StageTargets } from './models';

/** 0–3 stars. 0 means the run did not meet the stage's 1★ goal. */
export type StarRating = 0 | 1 | 2 | 3;

/**
 * Does a finished run meet one star goal? True when the run is at or beyond
 * every threshold the goal names (`>=` on each). A threshold the goal leaves
 * undefined is simply not checked.
 */
export function meetsGoal(result: SessionResult, goal: StageGoal): boolean {
  if (result.accuracy < goal.minAccuracy) return false;
  if (goal.minLongestStreak !== undefined && result.longestStreak < goal.minLongestStreak) {
    return false;
  }
  return true;
}

/**
 * Rate a finished drill run against a stage's three target tiers. Pure and
 * deterministic: the same `(result, targets)` always yields the same integer.
 *
 * The rating is the highest tier whose `StageGoal` the run meets, checked from
 * the top down:
 *   3★ — meets `targets.threeStar`
 *   2★ — meets `targets.twoStar`
 *   1★ — meets `targets.oneStar`
 *   0★ — meets none
 *
 * Because a stage always defines all three tiers, every stage can score the
 * full 0–3 range; the achievable maximum is not a function of which optional
 * thresholds are set.
 */
export function evaluateStars(result: SessionResult, targets: StageTargets): StarRating {
  if (meetsGoal(result, targets.threeStar)) return 3;
  if (meetsGoal(result, targets.twoStar)) return 2;
  if (meetsGoal(result, targets.oneStar)) return 1;
  return 0;
}

// ── StageResult ────────────────────────────────────────────────────────
//
// The full outcome of one stage run, ready for a UI to render without
// recomputing anything: the star rating, the raw run snapshot, the tiers it
// was judged against, and which tiers it cleared.
export interface StageResult {
  stageId: string;
  stars: StarRating;
  /** The complete drill-run snapshot this rating came from. */
  sessionResult: SessionResult;
  /** The tiers the run was rated against (copied from the stage). */
  targets: StageTargets;
  /** Which star goals the run cleared. `threeStar` implies `twoStar` implies
   *  `oneStar` for well-authored (increasing) tiers, but each is reported
   *  independently so a mis-ordered stage still describes itself honestly. */
  metTiers: {
    oneStar: boolean;
    twoStar: boolean;
    threeStar: boolean;
  };
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
    metTiers: {
      oneStar: meetsGoal(sessionResult, stage.targets.oneStar),
      twoStar: meetsGoal(sessionResult, stage.targets.twoStar),
      threeStar: meetsGoal(sessionResult, stage.targets.threeStar),
    },
  };
}
