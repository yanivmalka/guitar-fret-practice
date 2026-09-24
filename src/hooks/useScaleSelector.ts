// ── useScaleSelector — the Scales Selector's picks + derived pool/envelope ─
//
// The Scales-domain counterpart of `useIntervalSelector.ts` (scales-learning-
// spec.md §5, Session 2 plan step 2) — but simpler, because Scales doesn't
// build a `DrillConfig` (it runs its own dedicated engines, see
// `useScaleFallEngine.ts` / `useScaleChipEngine.ts`'s header comments). This
// hook owns the picks + persistence and derives the `ScalePoolItem[]` pool
// plus the question envelope (count/time/option-count/root-bias) those
// engines consume. Wired into `ScalePracticeScreen.tsx`, which renders a
// minimal segmented-button UI for each control (not yet the richer
// `IntervalSelectorPanel`-style layout).
//
// §5.2 ("scale selection") is built in its simplest form now that a second
// scale type ships: one scale, or all shipped scales. `SHIPPED_SCALE_TYPE_IDS`
// is the one place to widen when the next scale type ships.
//
// Position (§5.3) and Difficulty (§5.4) ARE built: two positions already
// exist per shipped scale type (§4.3's generative "box 1" / "box 2"), so
// "this position vs. all positions" is a real, useful choice today.

import { useMemo, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { buildScalePool, type ScalePoolItem } from '../learning/scaleDrill';
import { scalePositionsFor, type ScalePositionDef } from '../utils/scales';
import type { ScaleChipExercise } from './useScaleChipEngine';
import type { FallSpeed } from '../learning/scaleFall';

/** Widen this the moment a second scale type ships (§4.2) — nothing else in
 *  this file changes shape. */
const SHIPPED_SCALE_TYPE_IDS: readonly string[] = ['minorPentatonic', 'major'];

/** Which scale(s) a session draws from: one scale type id, or every shipped one. */
export type ScaleChoice = 'all' | string;

export type ScaleExercise = 'buildScale' | ScaleChipExercise;
export type ScalePositionMode = 'one' | 'all';
export type ScaleDifficulty = 'focused' | 'mixed' | 'full';

const EXERCISES: readonly ScaleExercise[] = ['buildScale', 'identifyScale', 'nameDegree'];
const POSITION_MODES: readonly ScalePositionMode[] = ['one', 'all'];
const DIFFICULTIES: readonly ScaleDifficulty[] = ['focused', 'mixed', 'full'];

function loadOneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = loadSetting<string>(key, fallback);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** The §9.2 envelope table, tuned separately for Exercise A (tap N
 *  positions, needs more time) vs. the chip exercises (one tap). Concrete
 *  numbers are a starting point, same as Intervals' own "tune in playtest"
 *  note (§9.3 there). */
export interface ScaleEnvelope {
  questionCount: number;
  timeLimit: number;
  optionCount: number;
  /** §9.1's "root bias": naturals-only at `focused`, any root otherwise. */
  naturalsOnlyRoot: boolean;
  /** Exercise A only: how fast the rows fall (rows/second) and how quickly
   *  that ramps up over a session — `timeLimit` has no meaning there. */
  fallSpeed: FallSpeed;
}

/** Exercise A's fall-speed dial, slow (1) to fast (5). 3 is the difficulty's
 *  own tuned speed; the others scale start, cap and ramp together. */
export const FALL_SPEED_LEVELS = [1, 2, 3, 4, 5] as const;
export type FallSpeedLevel = (typeof FALL_SPEED_LEVELS)[number];
const FALL_SPEED_FACTOR: Record<FallSpeedLevel, number> = { 1: 0.5, 2: 0.75, 3: 1, 4: 1.35, 5: 1.8 };

function scaleFallSpeed(speed: FallSpeed, level: FallSpeedLevel): FallSpeed {
  const k = FALL_SPEED_FACTOR[level];
  return { start: speed.start * k, max: speed.max * k, accel: speed.accel * k };
}

function envelopeFor(
  difficulty: ScaleDifficulty, isChipExercise: boolean, speedLevel: FallSpeedLevel,
): ScaleEnvelope {
  const env = baseEnvelopeFor(difficulty, isChipExercise);
  return { ...env, fallSpeed: scaleFallSpeed(env.fallSpeed, speedLevel) };
}

function baseEnvelopeFor(difficulty: ScaleDifficulty, isChipExercise: boolean): ScaleEnvelope {
  switch (difficulty) {
    case 'focused':
      return {
        questionCount: isChipExercise ? 8 : 6, timeLimit: 12, optionCount: 2, naturalsOnlyRoot: true,
        fallSpeed: { start: 1.0, max: 3.0, accel: 0.04 },
      };
    case 'full':
      return {
        questionCount: isChipExercise ? 12 : 10, timeLimit: 8, optionCount: 4, naturalsOnlyRoot: false,
        fallSpeed: { start: 1.6, max: 5.0, accel: 0.07 },
      };
    case 'mixed':
    default:
      return {
        questionCount: isChipExercise ? 10 : 8, timeLimit: 10, optionCount: 4, naturalsOnlyRoot: false,
        fallSpeed: { start: 1.3, max: 4.0, accel: 0.05 },
      };
  }
}

export function useScaleSelector(stringCount: number) {
  const [exercise, setExerciseState] = useState<ScaleExercise>(
    () => loadOneOf('ssel_exercise', EXERCISES, 'buildScale'),
  );
  const [scaleChoiceStored, setScaleChoiceState] = useState<ScaleChoice>(() => {
    const raw = loadSetting<string>('ssel_scale', 'all');
    return raw === 'all' || SHIPPED_SCALE_TYPE_IDS.includes(raw) ? raw : 'all';
  });
  const [positionModeStored, setPositionModeState] = useState<ScalePositionMode>(
    () => loadOneOf('ssel_position_mode', POSITION_MODES, 'all'),
  );
  const [positionIndex, setPositionIndexState] = useState<number>(
    () => loadSetting<number>('ssel_position_index', 1),
  );
  const [difficultyStored, setDifficultyState] = useState<ScaleDifficulty>(
    () => loadOneOf('ssel_difficulty', DIFFICULTIES, 'mixed'),
  );

  const [speedLevel, setSpeedLevelState] = useState<FallSpeedLevel>(() => {
    const raw = loadSetting<number>('ssel_fall_speed', 3);
    return (FALL_SPEED_LEVELS as readonly number[]).includes(raw) ? (raw as FallSpeedLevel) : 3;
  });

  const activeScaleTypeIds = useMemo<readonly string[]>(
    () => (scaleChoiceStored === 'all' ? SHIPPED_SCALE_TYPE_IDS : [scaleChoiceStored]),
    [scaleChoiceStored],
  );
  // One entry per box number: with several scales active, "Box 1" means box 1
  // of every one of them.
  const availablePositions = useMemo<ScalePositionDef[]>(() => {
    const all = activeScaleTypeIds.flatMap((id) => scalePositionsFor(id, stringCount));
    return all.filter((p, i) => all.findIndex((q) => q.positionIndex === p.positionIndex) === i);
  }, [activeScaleTypeIds, stringCount]);
  // "This position / all positions" is only a meaningful choice once a scale
  // type actually has more than one authored position on this instrument.
  const positionChoiceAvailable = availablePositions.length > 1;
  const positionMode: ScalePositionMode = positionChoiceAvailable ? positionModeStored : 'all';
  // Picking a single position IS the "focused pool" idea (§9.1's position-
  // spread dimension) — clamped exactly like Intervals clamps difficulty to
  // `focused` when "One scale" is picked (§5.4).
  const difficulty: ScaleDifficulty = positionMode === 'one' ? 'focused' : difficultyStored;

  const setExercise = (e: ScaleExercise) => { setExerciseState(e); saveSetting('ssel_exercise', e); };
  const setScaleChoice = (c: ScaleChoice) => { setScaleChoiceState(c); saveSetting('ssel_scale', c); };
  const setPositionMode = (m: ScalePositionMode) => { setPositionModeState(m); saveSetting('ssel_position_mode', m); };
  const setPositionIndex = (i: number) => { setPositionIndexState(i); saveSetting('ssel_position_index', i); };
  const setDifficulty = (d: ScaleDifficulty) => { setDifficultyState(d); saveSetting('ssel_difficulty', d); };

  const setSpeedLevel = (l: FallSpeedLevel) => { setSpeedLevelState(l); saveSetting('ssel_fall_speed', l); };

  const pool = useMemo<ScalePoolItem[]>(() => {
    const full = buildScalePool(activeScaleTypeIds, stringCount);
    if (positionMode === 'one') {
      const chosen = full.filter((p) => p.positionIndex === positionIndex);
      return chosen.length > 0 ? chosen : full;
    }
    return full;
  }, [activeScaleTypeIds, stringCount, positionMode, positionIndex]);

  const buildEnvelope = (isChipExercise: boolean): ScaleEnvelope => envelopeFor(difficulty, isChipExercise, speedLevel);

  return {
    speedLevel, setSpeedLevel,
    exercise, setExercise,
    scaleChoice: scaleChoiceStored, setScaleChoice, shippedScaleTypeIds: SHIPPED_SCALE_TYPE_IDS,
    positionMode, setPositionMode, positionChoiceAvailable,
    positionIndex, setPositionIndex, availablePositions,
    difficulty, difficultyStored, setDifficulty,
    pool,
    buildEnvelope,
  };
}
