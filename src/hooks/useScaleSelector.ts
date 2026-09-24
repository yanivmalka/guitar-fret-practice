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
// §5.2 ("scale selection": one scale / group / all learned / all 5 types) is
// deliberately NOT built yet — with only Minor Pentatonic shipped (§4.2's
// phased rollout) that control would always resolve to the same single
// choice, exactly the "meaningless with only one X to choose between"
// reasoning the spec already applies to Exercise choice and to Exercise B's
// option row. `SHIPPED_SCALE_TYPE_IDS` is the one place to widen once scale
// type 2 ships.
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
const SHIPPED_SCALE_TYPE_IDS: readonly string[] = ['minorPentatonic'];

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

function envelopeFor(difficulty: ScaleDifficulty, isChipExercise: boolean): ScaleEnvelope {
  switch (difficulty) {
    case 'focused':
      return {
        questionCount: isChipExercise ? 8 : 6, timeLimit: 12, optionCount: 2, naturalsOnlyRoot: true,
        fallSpeed: { start: 0.9, max: 1.8, accel: 0.012 },
      };
    case 'full':
      return {
        questionCount: isChipExercise ? 12 : 10, timeLimit: 8, optionCount: 4, naturalsOnlyRoot: false,
        fallSpeed: { start: 1.5, max: 3.2, accel: 0.02 },
      };
    case 'mixed':
    default:
      return {
        questionCount: isChipExercise ? 10 : 8, timeLimit: 10, optionCount: 4, naturalsOnlyRoot: false,
        fallSpeed: { start: 1.2, max: 2.5, accel: 0.015 },
      };
  }
}

export function useScaleSelector(stringCount: number) {
  const [exercise, setExerciseState] = useState<ScaleExercise>(
    () => loadOneOf('ssel_exercise', EXERCISES, 'buildScale'),
  );
  const [positionModeStored, setPositionModeState] = useState<ScalePositionMode>(
    () => loadOneOf('ssel_position_mode', POSITION_MODES, 'all'),
  );
  const [positionIndex, setPositionIndexState] = useState<number>(
    () => loadSetting<number>('ssel_position_index', 1),
  );
  const [difficultyStored, setDifficultyState] = useState<ScaleDifficulty>(
    () => loadOneOf('ssel_difficulty', DIFFICULTIES, 'mixed'),
  );

  const availablePositions = useMemo<ScalePositionDef[]>(
    () => SHIPPED_SCALE_TYPE_IDS.flatMap((id) => scalePositionsFor(id, stringCount)),
    [stringCount],
  );
  // "This position / all positions" is only a meaningful choice once a scale
  // type actually has more than one authored position on this instrument.
  const positionChoiceAvailable = availablePositions.length > 1;
  const positionMode: ScalePositionMode = positionChoiceAvailable ? positionModeStored : 'all';
  // Picking a single position IS the "focused pool" idea (§9.1's position-
  // spread dimension) — clamped exactly like Intervals clamps difficulty to
  // `focused` when "One scale" is picked (§5.4).
  const difficulty: ScaleDifficulty = positionMode === 'one' ? 'focused' : difficultyStored;

  const setExercise = (e: ScaleExercise) => { setExerciseState(e); saveSetting('ssel_exercise', e); };
  const setPositionMode = (m: ScalePositionMode) => { setPositionModeState(m); saveSetting('ssel_position_mode', m); };
  const setPositionIndex = (i: number) => { setPositionIndexState(i); saveSetting('ssel_position_index', i); };
  const setDifficulty = (d: ScaleDifficulty) => { setDifficultyState(d); saveSetting('ssel_difficulty', d); };

  const pool = useMemo<ScalePoolItem[]>(() => {
    const full = buildScalePool(SHIPPED_SCALE_TYPE_IDS, stringCount);
    if (positionMode === 'one') {
      const chosen = full.filter((p) => p.positionIndex === positionIndex);
      return chosen.length > 0 ? chosen : full;
    }
    return full;
  }, [stringCount, positionMode, positionIndex]);

  const buildEnvelope = (isChipExercise: boolean): ScaleEnvelope => envelopeFor(difficulty, isChipExercise);

  return {
    exercise, setExercise,
    positionMode, setPositionMode, positionChoiceAvailable,
    positionIndex, setPositionIndex, availablePositions,
    difficulty, difficultyStored, setDifficulty,
    pool,
    buildEnvelope,
  };
}
