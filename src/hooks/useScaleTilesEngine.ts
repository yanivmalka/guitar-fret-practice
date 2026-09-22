// ── useScaleTilesEngine — Exercise A, the real Piano Tiles mechanic ──────
//
// Replaces `useScaleDrillEngine.ts` (rejected — see
// scales-learning-spec.md's "Session 2 progress" correction: the old static
// tap-any-order grid was never actually the Piano Tiles mechanic it was
// named after). This engine drives a real-time run: tiles fall down
// per-string lanes on a fixed schedule (`scaleTiles.ts`, pure), the player
// taps a LANE (not a specific tile) in time, and each tile resolves to a hit
// or a miss independently — **a miss does not end the run**, it scores a
// penalty and the run continues (explicit product-owner decision, unlike
// the real game's one-mistake-ends-everything rule).
//
// No `requestAnimationFrame` loop here: each tile's fall is a pure CSS
// animation (`ScaleTilesBoard.tsx`, `animation-delay` computed from
// `tile.atMs`), so this engine only needs one `setTimeout` per tile — fired
// at the close of its hit window — to auto-resolve a miss if the player
// never tapped its lane in time. `performance.now()` timestamps, not state,
// back "how long into the run are we" (this repo's convention for
// timer-driven logic — see CLAUDE.md "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleTilesRun, HIT_WINDOW_MS, type ScaleTile, type ScaleTilesRun } from '../learning/scaleTiles';
import type { ScalePoolItem } from '../learning/scaleDrill';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

export type TileResolution = 'pending' | 'hit' | 'miss';

export interface ScaleTilesInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
}

/** One resolved question, reported after every tile in it has hit/missed —
 *  what `learningState.ts`'s `recordScaleAnswer` needs to fold the position
 *  into `scaleSrs` (scales-learning-spec.md §10). */
export interface ScaleTilesAnswer {
  scaleTypeId: string;
  positionIndex: number;
  /** Every tile of the shape was hit — the run's own pass/fail line for SRS
   *  purposes (a run never ends early on a miss, §17's Session 2 note). */
  correct: boolean;
  /** Seconds from the first tile's arrival to the last tile's resolution. */
  seconds: number;
}

export interface ScaleTilesOptions {
  instrument: ScaleTilesInstrument;
  pool: ScalePoolItem[];
  questionCount: number;
  /** Milliseconds between consecutive tile arrivals — the tempo. */
  beatMs: number;
  naturalsOnly?: boolean;
  onComplete?: () => void;
  /** Fired once per question, once every tile has resolved. */
  onAnswer?: (answer: ScaleTilesAnswer) => void;
}

export function useScaleTilesEngine({
  instrument, pool, questionCount, beatMs, naturalsOnly = false, onComplete, onAnswer,
}: ScaleTilesOptions) {
  const { session, reset, beginRun, onCorrect, onWrong } = useScoring();

  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<ScaleTilesRun | null>(null);
  const [resolutions, setResolutions] = useState<TileResolution[]>([]);
  const [lastLaneFlash, setLastLaneFlash] = useState<{ string: number; hit: boolean } | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [hits, setHits] = useState(0);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const runRef = useRef<ScaleTilesRun | null>(null);
  const resolutionsRef = useRef<TileResolution[]>([]);
  const runStartRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextQuestionRef = useRef<(mySession: number) => void>(() => {});
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const clearTimeouts = useCallback(() => {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }, []);

  const finish = useCallback(() => {
    setRunning(false); runningRef.current = false;
    clearTimeouts();
    onComplete?.();
  }, [clearTimeouts, onComplete]);

  const resolveTile = useCallback((index: number, kind: 'hit' | 'miss', mySession: number) => {
    if (sessionRef.current !== mySession) return;
    const cur = resolutionsRef.current;
    if (!cur[index] || cur[index] !== 'pending') return;
    const next = [...cur];
    next[index] = kind;
    resolutionsRef.current = next;
    setResolutions(next);

    const tile = runRef.current?.tiles[index];
    if (kind === 'hit') {
      setHits((h) => h + 1);
      onCorrect(0, 1);
      playCorrectChime();
      haptic.correct();
      if (tile) setLastLaneFlash({ string: tile.string, hit: true });
    } else {
      onWrong();
      haptic.wrong();
      beep();
      if (tile) setLastLaneFlash({ string: tile.string, hit: false });
    }

    if (next.every((r) => r !== 'pending')) {
      const r = runRef.current;
      if (r) {
        onAnswerRef.current?.({
          scaleTypeId: r.scaleTypeId,
          positionIndex: r.positionIndex,
          correct: next.every((res) => res === 'hit'),
          seconds: (performance.now() - runStartRef.current) / 1000,
        });
      }
      const mySessionCaptured = mySession;
      setTimeout(() => {
        if (runningRef.current && sessionRef.current === mySessionCaptured) nextQuestionRef.current(mySessionCaptured);
      }, 400);
    }
  }, [onCorrect, onWrong]);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setHits(0);
    setLastLaneFlash(null);
    clearTimeouts();

    const r = pickScaleTilesRun(pool, instrument.notes, instrument.stringCount, instrument.maxFret, beatMs, Math.random, naturalsOnly);
    if (!r) { finish(); return; }
    runRef.current = r;
    setRun(r);
    const initialResolutions: TileResolution[] = r.tiles.map(() => 'pending');
    resolutionsRef.current = initialResolutions;
    setResolutions(initialResolutions);
    runStartRef.current = performance.now();

    r.tiles.forEach((tile: ScaleTile, i: number) => {
      const id = setTimeout(() => resolveTile(i, 'miss', mySession), tile.atMs + HIT_WINDOW_MS);
      timeoutsRef.current.push(id);
    });
    // Safety net: if every tile somehow never fires (shouldn't happen), still
    // advance so the run can never hang.
    const endId = setTimeout(() => {
      if (resolutionsRef.current.every((r2) => r2 !== 'pending')) return;
      if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession);
    }, r.endMs + 500);
    timeoutsRef.current.push(endId);
  }, [pool, instrument, questionCount, beatMs, naturalsOnly, finish, clearTimeouts, resolveTile]);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const start = useCallback(() => {
    reset();
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    countRef.current = 0;
    beginRun(beatMs / 1000, questionCount);
    nextQuestion(mySession);
  }, [reset, beginRun, beatMs, questionCount, nextQuestion]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearTimeouts();
  }, [clearTimeouts]);

  /** The player tapped lane `stringNum`. Finds the nearest unresolved tile in
   *  that lane within the hit window of "now"; hits it, or — if none is in
   *  range — counts as a wrong tap (penalty, run continues). */
  const tapLane = useCallback((stringNum: number) => {
    if (!runningRef.current) return;
    const r = runRef.current;
    if (!r) return;
    const now = performance.now() - runStartRef.current;
    let bestIndex = -1;
    let bestDelta = Infinity;
    r.tiles.forEach((tile: ScaleTile, i: number) => {
      if (resolutionsRef.current[i] !== 'pending') return;
      if (tile.string !== stringNum) return;
      const delta = Math.abs(now - tile.atMs);
      if (delta <= HIT_WINDOW_MS && delta < bestDelta) { bestDelta = delta; bestIndex = i; }
    });
    const mySession = sessionRef.current;
    if (bestIndex >= 0) {
      const tile = r.tiles[bestIndex];
      playNoteSingle(tile.string, tile.fret);
      resolveTile(bestIndex, 'hit', mySession);
    } else {
      onWrong();
      haptic.wrong();
      setLastLaneFlash({ string: stringNum, hit: false });
    }
  }, [onWrong, resolveTile]);

  return {
    running, run, resolutions, lastLaneFlash,
    questionNumber, questionCount, hits,
    session, start, stop, tapLane,
  };
}
