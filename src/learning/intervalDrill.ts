// ── intervalDrill.ts — build the DrillConfig for a manual interval session ─
//
// Pure: given the learner's interval SRS map and the instrument, it emits a
// plain `DrillConfig` with an `interval` spec set, so the session runs through
// the EXISTING `useDrillSession` / engine (no new runner). It picks nothing
// about individual questions — the engine's interval branch does that — it only
// decides which interval qualities are in play and the plain drill envelope
// (count / timer / exercise / direction). The guided Teacher session is built
// by `intervalPlanner.ts` instead.

import type { DrillConfig } from '../drill/DrillConfig';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { SrsMap } from './srs';
import { dueItems } from './srs';
import {
  ALL_INTERVAL_SEMITONES,
  type IntervalExercise,
  type IntervalDifficulty,
} from '../utils/intervals';
import { parseIntervalItemId } from './intervalItem';
import { INTERVAL_CURRICULUM, currentGroupIndex } from './intervalCurriculum';
import type { IntervalGroup } from './intervalCurriculum';

// ── Difficulty model (intervals-learning-spec §9, task T7) ──────────────
//
// One pure function, `intervalDifficulty(tier, sizes, group, masteredSizes)`,
// turns a tier into the full question envelope. The Interval Selector calls it
// for whichever tier the learner picked (§5.4); the guided planner calls it
// with `'mixed'` only and never `focused` / `full` (§13.1 / §13.5). The
// "ascending-only for a brand-new quality" rule (§9.2) lives here — it is unit
// tested by calling with `'focused'` directly, not exercised through the
// planner.

/** The complete question envelope a difficulty tier produces (§9.2 / §9.3). */
export interface IntervalDifficultyEnvelope {
  tier: IntervalDifficulty;
  /** Distinct questions the drill asks (§9.3). */
  questionCount: number;
  /** Base per-question seconds, before `useScoring`'s run-length ramp (§9.3). */
  timeLimit: number;
  /** Answer chips to offer (§9.3: focused 3, mixed 5, full 6). */
  optionCount: number;
  /** Reference-note bias (§9.1): focused prefers naturals, mixed/full any. */
  firstNoteBias: 'naturals' | 'any';
  /** Register the reference note is drawn from (§9.1): focused narrow → full wide. */
  registerSpread: 'narrow' | 'medium' | 'wide';
  /** Distractor policy (§9.2): focused avoids near confusers, full forces them,
   *  mixed only completes `confuserPairs`. */
  optionPolicy: 'avoidNear' | 'default' | 'allNear';
  /** Confuser pairs whose *both* members are in the pool, so the answer chips
   *  always let the learner tell them apart (§9.2, mixed/full; [] for focused). */
  confuserPairs: [number, number][];
  /** Tier's direction default (§9.2). `'up'` only for `focused` on an all
   *  brand-new pool; `'both'` otherwise. The Selector's explicit Direction
   *  control overrides this (§5.3 / §9.2); the planner is always `'both'`. */
  direction: 'up' | 'both';
}

const DIFFICULTY_TABLE: Record<
  IntervalDifficulty,
  Omit<IntervalDifficultyEnvelope, 'tier' | 'confuserPairs' | 'direction'>
> = {
  focused: {
    questionCount: 12, timeLimit: 9, optionCount: 3,
    firstNoteBias: 'naturals', registerSpread: 'narrow', optionPolicy: 'avoidNear',
  },
  mixed: {
    questionCount: 15, timeLimit: 8, optionCount: 5,
    firstNoteBias: 'any', registerSpread: 'medium', optionPolicy: 'default',
  },
  full: {
    questionCount: 18, timeLimit: 7, optionCount: 6,
    firstNoteBias: 'any', registerSpread: 'wide', optionPolicy: 'allNear',
  },
};

/**
 * Resolve a difficulty tier into its full question envelope (§9).
 *
 * @param tier          which of the three tiers
 * @param sizes         the drill's interval-quality pool (semitone sizes 1..11)
 * @param group         the current curriculum group, for confuser completion
 *                      (pass `null` when there is no group context)
 * @param masteredSizes the sizes already mastered — only consulted for the
 *                      `focused` → `direction: 'up'` rule (§9.2)
 */
export function intervalDifficulty(
  tier: IntervalDifficulty,
  sizes: readonly number[],
  group: IntervalGroup | null | undefined,
  masteredSizes: Iterable<number>,
): IntervalDifficultyEnvelope {
  const base = DIFFICULTY_TABLE[tier] ?? DIFFICULTY_TABLE.mixed;
  const pool = new Set<number>();
  for (const s of sizes) if (s >= 1 && s <= 11) pool.add(s);
  const mastered = new Set<number>(masteredSizes);

  // §9.2: mixed/full complete the current group's confuser pairs when both
  // members are actually in the pool; focused never adds a near confuser.
  const confuserPairs: [number, number][] =
    tier === 'focused' || !group
      ? []
      : group.confusers
          .filter(([a, b]) => pool.has(a) && pool.has(b))
          .map(([a, b]) => [a, b] as [number, number]);

  // §9.2: focused runs ascending-only while every drilled quality is brand-new
  // (not yet mastered); once any is mastered, descending folds back in.
  const allBrandNew = pool.size > 0 && [...pool].every((s) => !mastered.has(s));
  const direction: 'up' | 'both' =
    tier === 'focused' && allBrandNew ? 'up' : 'both';

  return { tier, ...base, confuserPairs, direction };
}

export interface IntervalDrillOptions {
  /** The interval SRS map for this instrument (`InstrumentLearningState.intervalSrs`). */
  intervalSrs: SrsMap;
  now: number;
  maxFret: number;
  /** All drillable string numbers (1..stringCount). */
  allStrings: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Which exercise the session runs (§8.1). */
  exercise: IntervalExercise;
  /** Ascending, descending, or a per-question mix. Default `'both'` (§5.3). */
  direction?: 'up' | 'down' | 'both';
  /** Difficulty tier — feeds the §9 envelope (count / timer / options /
   *  first-note / register / confuser rules). Default `'mixed'`. */
  difficulty?: IntervalDifficulty;
  /** Sizes already mastered — only used for the `focused` → ascending rule
   *  (§9.2). Default `[]`. */
  masteredSizes?: number[];
  /** Override the tier's `questionCount`. */
  questionCount?: number;
  /** Override the tier's base per-question seconds. */
  timeLimit?: number;
  /** Upper fret for the reference/target window. Default min(12, maxFret). */
  fretTo?: number;
}

const DEFAULT_FRET_TO = 12;

/**
 * Build the interval-session `DrillConfig`. Overdue interval qualities are
 * listed first so the engine leans on what is due, but every quality stays in
 * the pool so a session is never narrowed to one interval. The difficulty tier
 * (default `'mixed'`) fills the §9 question envelope.
 */
export function buildIntervalDrill(opts: IntervalDrillOptions): DrillConfig {
  const {
    intervalSrs, now, maxFret, allStrings, accidental, order, exercise,
    direction = 'both',
    difficulty = 'mixed',
    masteredSizes = [],
  } = opts;

  const fretTo = Math.max(3, Math.min(opts.fretTo ?? DEFAULT_FRET_TO, maxFret));

  const due = dueItems(intervalSrs, now)
    .map((it) => parseIntervalItemId(it.itemId))
    .filter((n): n is number => n != null);
  const rest = ALL_INTERVAL_SEMITONES.filter((s) => !due.includes(s));
  const semitones = [...due, ...rest];

  const group = INTERVAL_CURRICULUM[currentGroupIndex(new Set(masteredSizes))] ?? null;
  const env = intervalDifficulty(difficulty, semitones, group, masteredSizes);

  const strings = allStrings.length > 0 ? [...allStrings] : [1];

  return {
    strings,
    primaryString: strings[0],
    isMulti: strings.length > 1,
    // The two chip-row exercises answer through the by-fret flow; *find on the
    // neck* answers with a fret tap on `FretGrid`, i.e. the by-note flow.
    mode: exercise === 'findTargetPosition' ? 'byNote' : 'byFret',
    fretFrom: 0,
    fretTo,
    wholeToneOnly: false,
    dotsOnly: false,
    questionCount: opts.questionCount ?? env.questionCount,
    timeLimit: opts.timeLimit ?? env.timeLimit,
    accidental,
    order,
    interval: {
      semitones,
      direction,
      exercise,
      optionCount: env.optionCount,
      firstNoteBias: env.firstNoteBias,
      registerSpread: env.registerSpread,
      optionPolicy: env.optionPolicy,
      confuserPairs: env.confuserPairs,
    },
  };
}
