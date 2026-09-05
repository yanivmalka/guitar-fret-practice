// ── Game data model: World / Stage / StageTargets ────────────────────────
//
// Architectural target:  World → Stage → Drill → Stars
//
// These are the *data* shapes for the future Game (progression) layer. They
// are deliberately inert:
//   • no unlock logic, no GameProgress, no persistence  (Task 5)
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

// ── StageTargets ────────────────────────────────────────────────────────
//
// The reference values a completed stage run is measured against. DATA ONLY:
// this task does not decide how these map to 1/2/3 stars — `evaluateStars()`
// in Task 4 owns that. Every field here is something the drill session
// already reports today (see `SessionResult` in `src/drill/DrillConfig.ts`
// and `HistoryEntry.seconds`), so Task 4 has real numbers to compare.
export interface StageTargets {
  /** Baseline accuracy to clear the stage, as a whole-number percent
   *  (0–100): correct answers over recorded answers, matching
   *  `SessionResult.accuracy`. */
  minAccuracy: number;
  /** Optional: longest consecutive-correct streak the run should reach,
   *  matching `SessionResult.longestStreak`. */
  minLongestStreak?: number;
  /** Optional: target average answer time in seconds (lower is better),
   *  derived from the per-question `HistoryEntry.seconds` of a run. Left
   *  undefined for stages that are not timed for a bonus. */
  maxAvgSeconds?: number;
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
