// ── useIntervalSelector — the Interval Selector's picks + derived drill ──
//
// The interval-domain counterpart of `useSelector` (intervals-learning-spec
// §5, task T6). Same shape: a handful of raw picks, each persisted to its own
// `isel_*` localStorage key, plus a `buildDrill()` that turns the picks into a
// plain `DrillConfig` with an `interval` spec — so a manual interval session
// runs through the EXISTING `useDrillSession` / engine (no new runner).
//
// Interval selection mirrors the Practice **strings selector**: a row of the
// 11 interval chips plus a "Multi" toggle. Multi off ⇒ exactly one quality;
// Multi on ⇒ any subset. There is no bespoke "one / group / all" scheme and no
// group shortcut — the curriculum groups stay an internal Teacher concept.
//
// It touches nothing in the Notes selector and nothing in the engine; every
// interval-only concept lives behind `DrillConfig.interval`.
//
// Not in the MVP (so deliberately absent here): Auto Advance / a stage
// sequence (§5.5, OD-3). Interval practice is free Selector practice.

import { useMemo, useRef, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { AccidentalMode, NotationMode, OrderMode } from '../utils/music';
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

/** Ascending, descending, or a per-question mix (§5.3). */
export type IntervalDirection = 'up' | 'down' | 'both';

export interface IntervalSelectorState {
  exercise: IntervalExercise;
  /** Multi off ⇒ tapping a chip replaces the selection; on ⇒ it toggles. */
  multiMode: boolean;
  /** The interval sizes (semitones, 1..11) currently picked, ascending. */
  selectedSizes: number[];
  /** The effective tier — clamped to `'focused'` while a single quality is
   *  selected (a lone quality cannot be "mixed" / "full" — §5.4). */
  difficulty: IntervalDifficulty;
  direction: IntervalDirection;
}

const DEFAULT_SINGLE = 4; // M3 — the "one semitone changes the colour" pair.

const EXERCISES: readonly IntervalExercise[] = [
  'identifyInterval',
  'findTargetNote',
  'findTargetPosition',
];
const DIFFICULTIES: readonly IntervalDifficulty[] = ['focused', 'mixed', 'full'];
const DIRECTIONS: readonly IntervalDirection[] = ['up', 'down', 'both'];

// ── Persistence helpers ─────────────────────────────────────────────────
// One key per field, mirroring `useSelector`'s `sel_*` convention.

function loadOneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = loadSetting<string>(key, fallback);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** The first-run selection: everything the Teacher has introduced so far, or —
 *  before the Teacher has advanced past its first group — all 11 (no artificial
 *  lock, OD-2). */
function defaultSizes(masteredSizes: number[]): number[] {
  const idx = currentGroupIndex(new Set(masteredSizes));
  if (idx === 0) return [...ALL_INTERVAL_SEMITONES];
  return sizesThroughGroup(idx).slice().sort((a, b) => a - b);
}

function cleanSizes(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const s of raw) {
    if (Number.isInteger(s) && s >= 1 && s <= 11) set.add(s as number);
  }
  return [...set].sort((a, b) => a - b);
}

function loadSelectedSizes(masteredSizes: number[]): number[] {
  const stored = cleanSizes(loadSetting<number[]>('isel_sizes', []));
  return stored.length > 0 ? stored : defaultSizes(masteredSizes);
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseIntervalSelectorOptions {
  instrument: InstrumentConfig;
  /** Semitone sizes currently mastered (from `buildIntervalBoard` / the
   *  `intervalSrs` map). Only used to seed the first-run selection (§5.2). */
  masteredSizes: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Note-name notation (♯/♭ vs superscript). Rides the built drill's
   *  `interval` spec so the engine's interval feedback line renders the target
   *  note the same way `IntervalPrompt` does (#6). */
  notation: NotationMode;
  /** Silent mode is on — drill-content audio is muted. "Identify the interval"
   *  is audio-only, so while this is true the effective exercise falls back to
   *  "find the target note". The learner's stored pick is untouched and comes
   *  back when sound returns. */
  audioMuted?: boolean;
}

export function useIntervalSelector(opts: UseIntervalSelectorOptions) {
  const { instrument, masteredSizes, accidental, order, notation, audioMuted } = opts;

  const [exerciseStored, setExerciseState] = useState<IntervalExercise>(
    () => loadOneOf('isel_exercise', EXERCISES, 'findTargetNote'),
  );
  // Same shape as the `difficulty` clamp below: the stored pick is preserved,
  // only the *effective* value is coerced while audio is unavailable.
  const exercise: IntervalExercise =
    audioMuted && exerciseStored === 'identifyInterval' ? 'findTargetNote' : exerciseStored;
  const [multiMode, setMultiModeState] = useState<boolean>(
    () => loadSetting<boolean>('isel_multi', true),
  );
  const [selectedSizes, setSelectedSizesState] = useState<number[]>(
    () => loadSelectedSizes(masteredSizes),
  );
  const [difficultyStored, setDifficultyState] = useState<IntervalDifficulty>(
    // A fresh learner starts gentle: a narrow register (`focused`) and
    // ascending-only (`up`). Existing users keep whatever they saved (#8).
    () => loadOneOf('isel_difficulty', DIFFICULTIES, 'focused'),
  );
  const [direction, setDirectionState] = useState<IntervalDirection>(
    () => loadOneOf('isel_direction', DIRECTIONS, 'up'),
  );

  // §5.4: a lone quality cannot be "mixed" or "full" — the tier is pinned to
  // `focused` while exactly one chip is selected. The stored value is kept so
  // widening the selection restores the learner's pick.
  const singleQuality = selectedSizes.length <= 1;
  const difficulty: IntervalDifficulty = singleQuality ? 'focused' : difficultyStored;

  const setExercise = (e: IntervalExercise) => {
    setExerciseState(e);
    saveSetting('isel_exercise', e);
  };

  const commitSizes = (next: number[]) => {
    setSelectedSizesState(next);
    saveSetting('isel_sizes', next);
  };

  // The last interval chip the learner actually tapped. Leaving Multi collapses
  // the selection to this one (when it survives), so the lone remaining chip is
  // the learner's most recent focus rather than always the lowest semitone.
  const lastTappedSize = useRef<number>(DEFAULT_SINGLE);

  /** Tap a chip: replace the selection in single mode, toggle it in Multi. */
  const selectSize = (semitones: number) => {
    if (!Number.isInteger(semitones) || semitones < 1 || semitones > 11) return;
    lastTappedSize.current = semitones;
    if (!multiMode) {
      commitSizes([semitones]);
      return;
    }
    // At least one quality is always in play — like the strings selector, you
    // cannot deselect your last pick (it would leave Start dead with nothing to
    // practise). Tapping the lone selected chip is a no-op.
    if (selectedSizes.length === 1 && selectedSizes.includes(semitones)) return;
    commitSizes(
      selectedSizes.includes(semitones)
        ? selectedSizes.filter((s) => s !== semitones)
        : [...selectedSizes, semitones].sort((a, b) => a - b),
    );
  };

  /** Flip the Multi toggle. Leaving Multi collapses the selection to the last
   *  chip the learner tapped when that one is still selected, otherwise to the
   *  lowest selected chip (or M3 if the selection was empty), mirroring the
   *  strings selector. */
  const toggleMulti = () => {
    const nowMulti = !multiMode;
    setMultiModeState(nowMulti);
    saveSetting('isel_multi', nowMulti);
    if (!nowMulti && selectedSizes.length !== 1) {
      const keep = selectedSizes.includes(lastTappedSize.current)
        ? lastTappedSize.current
        : selectedSizes[0] ?? DEFAULT_SINGLE;
      commitSizes([keep]);
    }
  };

  const setDifficulty = (d: IntervalDifficulty) => {
    // Ignored while clamped to focused — the panel disables the other tiles too.
    if (singleQuality) return;
    setDifficultyState(d);
    saveSetting('isel_difficulty', d);
  };
  const setDirection = (d: IntervalDirection) => {
    setDirectionState(d);
    saveSetting('isel_direction', d);
  };

  // ── Resolved interval-quality pool ────────────────────────────────────
  const pool = useMemo<number[]>(
    () => selectedSizes.filter((s) => s >= 1 && s <= 11).slice().sort((a, b) => a - b),
    [selectedSizes],
  );

  const state: IntervalSelectorState = {
    exercise,
    multiMode,
    selectedSizes,
    difficulty,
    direction,
  };

  /** The manual-session `DrillConfig`. Every Selector control feeds this: the
   *  exercise + direction ride the `interval` spec, the pool is the picked
   *  quality set, and the difficulty tier drives the full §9 question envelope
   *  (count / timer / option count + first-note / register / confuser rules)
   *  through the shared `intervalDifficulty` function. */
  const buildDrill = (): DrillConfig => {
    // Defensive: the panel disables Start on an empty pool, but never emit an
    // interval spec with no qualities.
    const effectivePool = pool.length > 0 ? pool : [...ALL_INTERVAL_SEMITONES];
    const group =
      INTERVAL_CURRICULUM[currentGroupIndex(new Set(masteredSizes))] ?? null;
    const env = intervalDifficulty(difficulty, effectivePool, group, masteredSizes);
    const strings = Array.from({ length: instrument.stringCount }, (_, i) => i + 1);
    const fretTo = Math.max(3, Math.min(12, instrument.maxFret));
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
      questionCount: env.questionCount,
      timeLimit: env.timeLimit,
      accidental,
      order,
      interval: {
        semitones: effectivePool,
        // The learner's explicit Direction control always wins over the tier's
        // direction default (§5.3 / §9.2) — so `state.direction`, not
        // `env.direction`, rides the spec here.
        direction,
        exercise,
        notation,
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
    selectSize,
    toggleMulti,
    setDifficulty,
    setDirection,
    buildDrill,
  };
}
