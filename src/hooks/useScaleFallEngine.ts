// ── useScaleFallEngine — Exercise A ("Build the scale"), Piano Tiles style ─
//
// Replaces `useScaleBoardEngine.ts` (the static whole-neck lit/dim board) per
// the product owner's Session 5 correction, scales-learning-spec.md: the
// exercise plays like Piano Tiles over the whole screen. The stream of rows
// (`scaleFall.ts`, pure) falls continuously and speeds up; the learner taps
// each row's lit tile in order, bottom row first — a run up the scale.
//
// - A tap on the lit tile of the next row — or of any later row of the same
//   scale, even high on the screen — is a hit; notes skipped below it are
//   settled without penalty. Any other tile — a dim note, or a note of a
//   different scale — is a wrong tap: penalty, red flash, and the stream keeps
//   falling (the continue-on-mistake rule the product owner chose, unlike the
//   real game's instant game over).
// - A lit tile that falls off the bottom unhit is a miss: penalty, and the
//   stream keeps falling.
// - Every tap plays the tapped tile's own note, right or wrong.
// - One scale is one SRS answer: correct only if every note of the run was
//   hit with no wrong tap and no miss along the way.
//
// Motion is one `requestAnimationFrame` loop over `performance.now()`. The
// scroll position lives in a ref and is pushed straight to the board through
// `frameListenerRef` (a transform per frame, no React render); state only
// changes when a row resolves or a wrong tap flashes (CLAUDE.md
// "Conventions": timer-read values in refs, state only for rendering).

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem } from '../learning/scaleDrill';
import {
  buildFallStream, hasFallenOff, rowBottom, speedAt, VISIBLE_ROWS,
  type FallSpeed, type FallStream,
} from '../learning/scaleFall';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

/** Milliseconds a wrong tap stays red. */
const WRONG_FLASH_MS = 350;
/** Pause after the last row resolves before the summary shows. */
const FINISH_DELAY_MS = 700;
/** Longest frame step honoured — a backgrounded tab resumes where it was
 *  instead of dumping every row off the screen at once. */
const MAX_FRAME_SECONDS = 0.1;

export type FallRowState = 'pending' | 'hit' | 'miss';

export interface ScaleFallInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
  /** String-1-first open-string MIDI numbers (`InstrumentConfig.openMidi`). */
  openMidi: readonly number[];
}

/** One resolved scale — what `learningState.ts`'s `recordScaleAnswer` needs
 *  to fold the position into `scaleSrs` (spec §10). */
export interface ScaleFallAnswer {
  scaleTypeId: string;
  positionIndex: number;
  correct: boolean;
  seconds: number;
}

export interface ScaleFallOptions {
  instrument: ScaleFallInstrument;
  pool: ScalePoolItem[];
  /** Scales per session. */
  questionCount: number;
  speed: FallSpeed;
  naturalsOnly?: boolean;
  onComplete?: () => void;
  onAnswer?: (answer: ScaleFallAnswer) => void;
}

export interface WrongTile {
  row: number;
  string: number;
}

/** First pending note row at or after `from`, or `rows.length` when done. */
function findNext(s: FallStream, states: readonly FallRowState[], from: number): number {
  let i = from;
  while (i < s.rows.length && (s.rows[i].kind !== 'note' || states[i] !== 'pending')) i++;
  return i;
}

export function useScaleFallEngine({
  instrument, pool, questionCount, speed, naturalsOnly = false, onComplete, onAnswer,
}: ScaleFallOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout } = useScoring();

  const [running, setRunning] = useState(false);
  const [stream, setStream] = useState<FallStream | null>(null);
  const [rowStates, setRowStates] = useState<FallRowState[]>([]);
  const [nextRow, setNextRow] = useState(0);
  const [wrongTile, setWrongTile] = useState<WrongTile | null>(null);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const streamRef = useRef<FallStream | null>(null);
  const rowStatesRef = useRef<FallRowState[]>([]);
  const nextRowRef = useRef(0);
  const scrollRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Per question: wrong taps, misses, and the elapsed time it became live. */
  const statsRef = useRef<{ wrong: number[]; miss: number[]; startedAt: number[] }>({ wrong: [], miss: [], startedAt: [] });
  /** The board registers here to move the stream each frame. */
  const frameListenerRef = useRef<((scroll: number) => void) | null>(null);
  // `frame` schedules itself before its own `useCallback` has finished being
  // declared — routed through a ref so each frame reaches the current closure.
  const frameRef = useRef<(ts: number, mySession: number) => void>(() => {});
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const onAnswerRef = useRef(onAnswer);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const clearTimers = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (wrongTimeoutRef.current != null) { clearTimeout(wrongTimeoutRef.current); wrongTimeoutRef.current = null; }
    if (finishTimeoutRef.current != null) { clearTimeout(finishTimeoutRef.current); finishTimeoutRef.current = null; }
  }, []);

  const resolveRow = useCallback((index: number, kind: 'hit' | 'miss') => {
    const s = streamRef.current;
    const row = s?.rows[index];
    if (!s || !row || row.kind !== 'note' || rowStatesRef.current[index] !== 'pending') return;
    const nextStates = [...rowStatesRef.current];
    nextStates[index] = kind;
    rowStatesRef.current = nextStates;
    setRowStates(nextStates);

    const stats = statsRef.current;
    if (kind === 'hit') {
      // Tapping a row while it is still high on the screen scores the speed
      // bonus; one about to fall off scores none.
      const height = rowBottom(index, scrollRef.current) / VISIBLE_ROWS;
      onCorrect(1 - Math.min(1, Math.max(0, height)), 1);
    } else {
      stats.miss[row.q] = (stats.miss[row.q] ?? 0) + 1;
      onTimeout();
      haptic.wrong();
      beep();
    }

    const next = findNext(s, nextStates, index + 1);
    nextRowRef.current = next;
    setNextRow(next);

    // The run's last note just resolved — report the scale.
    const nextRowQ = s.rows[next]?.q;
    if (nextRowQ !== row.q) {
      const q = s.questions[row.q];
      const correct = (stats.wrong[row.q] ?? 0) === 0 && (stats.miss[row.q] ?? 0) === 0;
      if (correct) playCorrectChime();
      onAnswerRef.current?.({
        scaleTypeId: q.scaleTypeId,
        positionIndex: q.positionIndex,
        correct,
        seconds: elapsedRef.current - (stats.startedAt[row.q] ?? 0),
      });
      if (nextRowQ != null) stats.startedAt[nextRowQ] = elapsedRef.current;
    }

    if (next >= s.rows.length) {
      const mySession = sessionRef.current;
      finishTimeoutRef.current = setTimeout(() => {
        if (sessionRef.current !== mySession) return;
        runningRef.current = false;
        setRunning(false);
        clearTimers();
        onCompleteRef.current?.();
      }, FINISH_DELAY_MS);
    }
  }, [onCorrect, onTimeout, clearTimers]);

  const frame = useCallback((ts: number, mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    const last = lastTsRef.current ?? ts;
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, (ts - last) / 1000));
    lastTsRef.current = ts;
    const s = streamRef.current;
    // Once every row has resolved the stream stops where it is.
    if (s && nextRowRef.current < s.rows.length) {
      elapsedRef.current += dt;
      scrollRef.current += speedAt(speedRef.current, elapsedRef.current) * dt;
      while (nextRowRef.current < s.rows.length && hasFallenOff(nextRowRef.current, scrollRef.current)) {
        resolveRow(nextRowRef.current, 'miss');
      }
    }
    frameListenerRef.current?.(scrollRef.current);
    rafRef.current = requestAnimationFrame((t) => frameRef.current(t, mySession));
  }, [resolveRow]);
  useEffect(() => { frameRef.current = frame; }, [frame]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearTimers();
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    reset();
    sessionRef.current += 1;
    const mySession = sessionRef.current;

    const questions: ScaleQuestion[] = [];
    for (let i = 0; i < questionCount; i++) {
      const q = pickScaleQuestion(
        pool, instrument.notes, instrument.stringCount, instrument.maxFret, Math.random, naturalsOnly,
      );
      if (!q) break;
      questions.push(q);
    }
    const s = buildFallStream(questions, instrument.openMidi);
    if (!s.rows.some((r) => r.kind === 'note')) { onCompleteRef.current?.(); return; }

    streamRef.current = s;
    setStream(s);
    const states: FallRowState[] = s.rows.map(() => 'pending');
    rowStatesRef.current = states;
    setRowStates(states);
    statsRef.current = { wrong: [], miss: [], startedAt: [0] };
    scrollRef.current = 0;
    elapsedRef.current = 0;
    lastTsRef.current = null;
    const first = findNext(s, states, 0);
    nextRowRef.current = first;
    setNextRow(first);
    setWrongTile(null);
    beginRun(1, s.rows.filter((r) => r.kind === 'note').length);

    runningRef.current = true;
    setRunning(true);
    rafRef.current = requestAnimationFrame((t) => frameRef.current(t, mySession));
  }, [clearTimers, reset, beginRun, questionCount, pool, instrument, naturalsOnly]);

  /** The learner tapped lane `string` of row `rowIndex`. */
  const tap = useCallback((rowIndex: number, string: number) => {
    if (!runningRef.current) return;
    const s = streamRef.current;
    const row = s?.rows[rowIndex];
    if (!s || !row || row.kind === 'banner') return;
    // Every tile is a playable note, right or wrong.
    playNoteSingle(string, row.fret);

    // A gap row has no lit tile, so every tile of it falls through to the
    // wrong-tap branch below.
    const isTarget = row.kind === 'note' && string === row.string;
    const state = rowStatesRef.current[rowIndex];
    if (state === 'hit' && isTarget) { haptic.tap(); return; }
    if (rowIndex === nextRowRef.current && isTarget) {
      haptic.tap();
      resolveRow(rowIndex, 'hit');
      return;
    }

    // The right note of the same scale further up the screen: the learner ran
    // ahead. Take it now — no need to wait for it to fall — and settle the
    // notes skipped below it without any penalty or score.
    const from = nextRowRef.current;
    if (isTarget && state === 'pending' && rowIndex > from && s.rows[from]?.q === row.q) {
      const states = [...rowStatesRef.current];
      for (let i = from; i < rowIndex; i++) {
        if (s.rows[i].kind === 'note' && states[i] === 'pending') states[i] = 'hit';
      }
      rowStatesRef.current = states;
      haptic.tap();
      resolveRow(rowIndex, 'hit');
      return;
    }

    // A dim note, or a lit note of another scale. Charged to the scale being
    // played right now.
    const liveQ = s.rows[nextRowRef.current]?.q ?? row.q;
    statsRef.current.wrong[liveQ] = (statsRef.current.wrong[liveQ] ?? 0) + 1;
    onWrong();
    haptic.wrong();
    setWrongTile({ row: rowIndex, string });
    if (wrongTimeoutRef.current != null) clearTimeout(wrongTimeoutRef.current);
    wrongTimeoutRef.current = setTimeout(() => setWrongTile(null), WRONG_FLASH_MS);
  }, [onWrong, resolveRow]);

  useEffect(() => clearTimers, [clearTimers]);

  const liveQ = stream?.rows[Math.min(nextRow, stream.rows.length - 1)]?.q ?? 0;
  return {
    running, stream, rowStates, nextRow, wrongTile,
    /** The scale being played now (1-based) and how many the session has. */
    questionNumber: stream ? liveQ + 1 : 0,
    questionCount: stream?.questions.length ?? questionCount,
    currentQuestion: stream?.questions[liveQ] ?? null,
    session, start, stop, tap, frameListenerRef,
  };
}
