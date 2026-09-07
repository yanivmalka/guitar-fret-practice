// ── useIntervalSelector — the Interval Selector's picks + derived drill ──
//
// The interval-domain counterpart of `useSelector` (intervals-learning-spec
// §5, task T6). Same shape: a handful of raw picks, each persisted to its own
// `isel_*` localStorage key, plus a `buildDrill()` that turns the picks into a
// plain `DrillConfig` with an `interval` spec — so a manual interval session
// runs through the EXISTING `useDrillSession` / engine (no new runner).
//
// It touches nothing in the Notes selector and nothing in the engine; every
// interval-only concept lives behind `DrillConfig.interval`.
//
// Not in the MVP (so deliberately absent here): Auto Advance / a stage
// sequence (§5.5, OD-3). Interval practice is free Selector practice.

import { useMemo, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import type { DrillConfig } from '../drill/DrillConfig';
import {
  ALL_INTERVAL_SEMITONES,
  type IntervalExercise,
  type IntervalDifficulty,
} from '../utils/intervals';
import { intervalDifficulty } from '../learning/intervalDrill';
import {
  INTERVAL_CURRICULUM,
  currentGroupIndex,
  sizesThroughGroup,
} from '../learning/intervalCurriculum';

export type { IntervalDifficulty };

// ── Types ────────────────────────────────────────────────────────────────

/** How the learner picks the practice material (§5.2). */
export type IntervalSelection = 'one' | 'group' | 'allLearned' | 'all11';

/** Ascending, descending, or a per-question mix (§5.3). */
export type IntervalDirection = 'up' | 'down' | 'both';

export interface IntervalSelectorState {
  exercise: IntervalExercise;
  selection: IntervalSelection;
  /** The curriculum group id in play while `selection === 'group'`. */
  groupId: string;
  /** The single interval size (semitones) in play while `selection === 'one'`. */
  single: number;
  /** The effective tier — clamped to `'focused'` while `selection === 'one'`
   *  (a single quality cannot be "mixed" — §5.4). */
  difficulty: IntervalDifficulty;
  direction: IntervalDirection;
}

const DEFAULT_SINGLE = 4; // M3 — the "one semitone changes the colour" pair.
const DEFAULT_GROUP = INTERVAL_CURRICULUM[0].id; // 'perfect'

const EXERCISES: readonly IntervalExercise[] = ['identifyInterval', 'findTargetNote'];
const SELECTIONS: readonly IntervalSelection[] = ['one', 'group', 'allLearned', 'all11'];
const DIFFICULTIES: readonly IntervalDifficulty[] = ['focused', 'mixed', 'full'];
const DIRECTIONS: readonly IntervalDirection[] = ['up', 'down', 'both'];

// ── Persistence helpers ─────────────────────────────────────────────────
// One key per field, mirroring `useSelector`'s `sel_*` convention.

function loadOneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = loadSetting<string>(key, fallback);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function loadSingle(): number {
  const raw = loadSetting<number>('isel_single', DEFAULT_SINGLE);
  return Number.isInteger(raw) && raw >= 1 && raw <= 11 ? raw : DEFAULT_SINGLE;
}

function loadGroup(): string {
  const raw = loadSetting<string>('isel_group', DEFAULT_GROUP);
  return INTERVAL_CURRICULUM.some((g) => g.id === raw) ? raw : DEFAULT_GROUP;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseIntervalSelectorOptions {
  instrument: InstrumentConfig;
  /** Semitone sizes currently mastered (from `buildIntervalBoard` / the
   *  `intervalSrs` map). Only used to resolve "All learned" (§5.2, OD-2). */
  masteredSizes: number[];
  accidental: AccidentalMode;
  order: OrderMode;
}

export function useIntervalSelector(opts: UseIntervalSelectorOptions) {
  const { instrument, masteredSizes, accidental, order } = opts;

  const [exercise, setExerciseState] = useState<IntervalExercise>(
    () => loadOneOf('isel_exercise', EXERCISES, 'findTargetNote'),
  );
  const [selection, setSelectionState] = useState<IntervalSelection>(
    () => loadOneOf('isel_selection', SELECTIONS, 'allLearned'),
  );
  const [groupId, setGroupState] = useState<string>(() => loadGroup());
  const [single, setSingleState] = useState<number>(() => loadSingle());
  const [difficultyStored, setDifficultyState] = useState<IntervalDifficulty>(
    () => loadOneOf('isel_difficulty', DIFFICULTIES, 'mixed'),
  );
  const [direction, setDirectionState] = useState<IntervalDirection>(
    () => loadOneOf('isel_direction', DIRECTIONS, 'both'),
  );

  // §5.4: a single quality cannot be "mixed" or "full" — the tier is pinned to
  // `focused` while "One interval" is selected. The stored value is kept so
  // switching back to a broader pool restores the learner's pick.
  const difficulty: IntervalDifficulty = selection === 'one' ? 'focused' : difficultyStored;

  const setExercise = (e: IntervalExercise) => {
    setExerciseState(e);
    saveSetting('isel_exercise', e);
  };
  const setSelection = (s: IntervalSelection) => {
    setSelectionState(s);
    saveSetting('isel_selection', s);
  };
  const setGroup = (id: string) => {
    if (!INTERVAL_CURRICULUM.some((g) => g.id === id)) return;
    setGroupState(id);
    saveSetting('isel_group', id);
  };
  const setSingle = (semitones: number) => {
    if (!Number.isInteger(semitones) || semitones < 1 || semitones > 11) return;
    setSingleState(semitones);
    saveSetting('isel_single', semitones);
  };
  const setDifficulty = (d: IntervalDifficulty) => {
    // Ignored while clamped to focused — the panel disables the other tiles too.
    if (selection === 'one') return;
    setDifficultyState(d);
    saveSetting('isel_difficulty', d);
  };
  const setDirection = (d: IntervalDirection) => {
    setDirectionState(d);
    saveSetting('isel_direction', d);
  };

  // ── Resolved interval-quality pool ────────────────────────────────────
  const pool = useMemo<number[]>(() => {
    switch (selection) {
      case 'one':
        return [single];
      case 'group': {
        const g = INTERVAL_CURRICULUM.find((x) => x.id === groupId) ?? INTERVAL_CURRICULUM[0];
        // The group's qualities plus its designated confusers (§5.2), so
        // "tell them apart" is always in the pool.
        const set = new Set<number>([...g.introduces, ...g.review]);
        for (const [a, b] of g.confusers) {
          set.add(a);
          set.add(b);
        }
        return [...set].filter((s) => s >= 1 && s <= 11).sort((a, b) => a - b);
      }
      case 'allLearned': {
        const idx = currentGroupIndex(new Set(masteredSizes));
        // OD-2: a learner who has never moved past group 1 gets all 11 — no
        // artificial lock. Once the Teacher has advanced, it is the
        // introduced-so-far set.
        if (idx === 0) return [...ALL_INTERVAL_SEMITONES];
        return sizesThroughGroup(idx).slice().sort((a, b) => a - b);
      }
      case 'all11':
      default:
        return [...ALL_INTERVAL_SEMITONES];
    }
  }, [selection, single, groupId, masteredSizes]);

  const state: IntervalSelectorState = {
    exercise,
    selection,
    groupId,
    single,
    difficulty,
    direction,
  };

  /** The manual-session `DrillConfig`. Every Selector control feeds this: the
   *  exercise + direction ride the `interval` spec, the pool is the resolved
   *  quality set, and the difficulty tier drives the full §9 question envelope
   *  (count / timer / option count + first-note / register / confuser rules)
   *  through the shared `intervalDifficulty` function. */
  const buildDrill = (): DrillConfig => {
    const group =
      INTERVAL_CURRICULUM[currentGroupIndex(new Set(masteredSizes))] ?? null;
    const env = intervalDifficulty(difficulty, pool, group, masteredSizes);
    const strings = Array.from({ length: instrument.stringCount }, (_, i) => i + 1);
    const fretTo = Math.max(3, Math.min(12, instrument.maxFret));
    return {
      strings,
      primaryString: strings[0],
      isMulti: strings.length > 1,
      // Both interval exercises answer on a chip row through the by-fret flow —
      // there is no neck answer surface in the MVP.
      mode: 'byFret',
      fretFrom: 0,
      fretTo,
      wholeToneOnly: false,
      dotsOnly: false,
      questionCount: env.questionCount,
      timeLimit: env.timeLimit,
      accidental,
      order,
      interval: {
        semitones: pool,
        // The learner's explicit Direction control always wins over the tier's
        // direction default (§5.3 / §9.2) — so `state.direction`, not
        // `env.direction`, rides the spec here.
        direction,
        exercise,
        optionCount: env.optionCount,
        firstNoteBias: env.firstNoteBias,
        registerSpread: env.registerSpread,
        optionPolicy: env.optionPolicy,
        confuserPairs: env.confuserPairs,
      },
    };
  };

  return {
    state,
    pool,
    setExercise,
    setSelection,
    setGroup,
    setSingle,
    setDifficulty,
    setDirection,
    buildDrill,
  };
}
