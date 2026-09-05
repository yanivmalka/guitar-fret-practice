// ── Game data model: World / Stage / StageTargets ────────────────────────
//
// Architectural target:  World → Stage → Drill → Stars
//
// These are the *data* shapes for the Game (progression) layer. They are
// deliberately thin:
//   • the GameProgress *shape* is defined here (Task 5); its persistence,
//     the monotonic star-update rule and unlock derivation live in
//     `src/utils/gameProgress.ts` — not in this model layer
//   • no `evaluateStars()` and no star-tier math        (Task 4)
//   • no UI — a World/Stage is never a React component
//
// The Game layer is separate from Practice. `src/utils/stageSequence.ts` is
// Practice's Auto Advance curriculum and is NOT part of this model — the two
// are intentionally not unified.
//
// A `Stage` runs through the *existing* drill engine: `stage.drill` is the
// `DrillConfig` from Task 1/2 verbatim, so a future Game screen does
//
//     useDrillSession(stage.drill, { …collaborators })
//
// with no new drill mechanism.

import type { DrillConfig } from '../drill/DrillConfig';

// Re-exported so Game code can import the drill config shape from one place
// alongside the models it sits inside.
export type { DrillConfig };

// ── World ───────────────────────────────────────────────────────────────
//
// A themed group of stages. Carries only what is needed to identify, order
// and label a world — nothing about whether it is unlocked or how far the
// player has got (that is GameProgress, Task 5).
export interface World {
  /** Stable slug, unique across all worlds (e.g. "open-strings"). Referenced
   *  by `Stage.worldId` and, later, by GameProgress records. */
  id: string;
  /** Sort position among worlds, ascending. */
  order: number;
  /** i18n key for the world's display name. Resolved through `t()` by the
   *  Game UI in a later task; kept as an opaque string here. */
  titleKey: string;
  /** i18n key for a one-line world description. Optional — omit when the
   *  title alone is enough. */
  descriptionKey?: string;
}

// ── StageGoal ───────────────────────────────────────────────────────────
//
// The bar for one star level: a set of thresholds a finished run must all
// meet. Every field is a metric `SessionResult` already reports, compared
// with `>=` (higher is better). A run "meets" the goal when it is at or
// beyond every threshold the goal names.
export interface StageGoal {
  /** Minimum accuracy, whole-number percent 0–100 (`SessionResult.accuracy`
   *  = correct answers over recorded answers). Always set — accuracy is the
   *  spine of every tier. */
  minAccuracy: number;
  /** Optional: minimum longest consecutive-correct streak within the run
   *  (`SessionResult.longestStreak`). Omit when this tier is accuracy-only. */
  minLongestStreak?: number;
}

// ── StageTargets ────────────────────────────────────────────────────────
//
// Three explicit star levels. A stage always defines all three, so 0–3 stars
// is always reachable and the star count is never an implicit side effect of
// which optional fields happen to be filled in. `evaluateStars()` returns the
// highest tier whose `StageGoal` the run meets (0 when not even `oneStar` is
// met). Author the tiers in increasing difficulty:
//   oneStar ≤ twoStar ≤ threeStar   (per metric).
export interface StageTargets {
  /** 1★ — the baseline. A run below this earns 0★. */
  oneStar: StageGoal;
  /** 2★ — clearly better than the baseline. */
  twoStar: StageGoal;
  /** 3★ — mastery of the stage. */
  threeStar: StageGoal;
}

// ── Stage ───────────────────────────────────────────────────────────────
//
// One playable unit of the Game. Data-driven: it is not UI, and it does not
// re-declare any drill field — the drill is a `DrillConfig` by reference.
export interface Stage {
  /** Stable slug, unique across all stages (e.g. "open-strings-1"). */
  id: string;
  /** `World.id` this stage belongs to. */
  worldId: string;
  /** Sort position within the world, ascending. */
  order: number;
  /** i18n key for the stage's display name. */
  titleKey: string;
  /** Optional i18n key for a short subtitle / hint shown next to the title. */
  subtitleKey?: string;
  /** The drill this stage runs — the Task 1/2 `DrillConfig`, consumed
   *  unchanged by `useDrillSession` / the drill engine. */
  drill: DrillConfig;
  /** What a run of this stage is scored against (see `StageTargets`). */
  targets: StageTargets;
}

// ── GameProgress ────────────────────────────────────────────────────────
//
// The player's saved progression through the Game: the best star rating
// earned per stage, and where they last played. This is the persisted
// *shape* only — loading, saving, the monotonic update rule and the
// stage-unlock derivation all live in `src/utils/gameProgress.ts` (Task 5),
// never in this model layer.
//
// Only stars actually earned are stored: a stage id absent from `bestStars`
// has never been cleared and counts as 0★ — 0 is never written. Unlock
// state is likewise never stored; it is a pure function of `bestStars` plus
// the fixed stage order.
export interface GameProgress {
  /** Schema version of this record. Bumped only if the persisted shape
   *  changes; lets a later cloud layer migrate an old blob. */
  version: 1;
  /** Best star rating (1–3) per `Stage.id`. A stage id missing from this map
   *  has not been cleared and is treated as 0★ — 0 is never written here. */
  bestStars: Record<string, 1 | 2 | 3>;
  /** The stage the player ran most recently, for "continue where you left
   *  off". Absent until the first stage is played. */
  lastPlayed?: {
    worldId: string;
    stageId: string;
  };
  /** ISO-8601 timestamp of the last change to this record. Empty string
   *  until the first save. */
  updatedAt: string;
}
