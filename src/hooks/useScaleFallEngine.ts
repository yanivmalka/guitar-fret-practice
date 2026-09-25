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
// - Only the scale's first note starts lit. When the next note reaches the
//   last stretch of the screen (`HINT_BOTTOM_ROWS`) it is revealed as a
//   rescue, without a penalty — but it counts as a slip.
// - Every tap plays the tapped tile's own note, right or wrong.
// - A note slips when a wrong tap landed while it was the live note, when it
//   was missed, or when it needed the hint. Slipped notes stay marked on the
//   board so the learner sees which ones to work on.
// - One scale is one SRS answer: correct when at most one note in five
//   slipped (`isScaleCorrect`), not voided by a single stumble.
//
// Motion is one `requestAnimationFrame` loop over `performance.now()`. The
// scroll position lives in a ref and is pushed straight to the board through
// `frameListenerRef` (a transform per frame, no React render); state only
// changes when a row resolves or a wrong tap flashes (CLAUDE.md
// "Conventions": timer-read values in refs, state only for rendering).

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem, type ScaleDirection } from '../learning/scaleDrill';
import {
  buildFallStream, hasFallenOff, HINT_BOTTOM_ROWS, isScaleCorrect, rowBottom, scaleAccuracy, speedAt, VISIBLE_ROWS,
  type FallSpeed, type FallStream,
} from '../learning/scaleFall';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';
import { noteRoundEnded, noteRoundStarted } from '../utils/adPacing';

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
  /** The scale's note count and how many of them slipped. */
  notes: number;
  slips: number;
}

export interface ScaleFallOptions {
  instrument: ScaleFallInstrument;
  pool: ScalePoolItem[];
  /** Scales per session. */
  questionCount: number;
  speed: FallSpeed;
  naturalsOnly?: boolean;
  /** Which way the scales run; `'both'` is decided per scale. */
  direction?: ScaleDirection;
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
  instrument, pool, questionCount, speed, naturalsOnly = false, direction = 'up', onComplete, onAnswer,
}: ScaleFallOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout } = useScoring();

  const [running, setRunning] = useState(false);
  const [stream, setStream] = useState<FallStream | null>(null);
  const [rowStates, setRowStates] = useState<FallRowState[]>([]);
  const [nextRow, setNextRow] = useState(0);
  const [wrongTile, setWrongTile] = useState<WrongTile | null>(null);
  /** Rows whose note slipped — wrong tap while live, miss, or hint. */
  const [rowSlips, setRowSlips] = useState<boolean[]>([]);
  /** The live row whose hidden note was revealed as a rescue. */
  const [hintRow, setHintRow] = useState<number | null>(null);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const streamRef = useRef<FallStream | null>(null);
  const rowStatesRef = useRef<FallRowState[]>([]);
  const nextRowRef = useRef(0);
  const rowSlipsRef = useRef<boolean[]>([]);
  const hintRowRef = useRef<number | null>(null);
  const scrollRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Per question: the elapsed time it became live. */
  const statsRef = useRef<{ startedAt: number[] }>({ startedAt: [] });
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

  /** Flags row `index`'s note as slipped; a second slip on it changes nothing. */
  const markSlip = useCallback((index: number) => {
    if (rowSlipsRef.current[index]) return;
    const next = [...rowSlipsRef.current];
    next[index] = true;
    rowSlipsRef.current = next;
    setRowSlips(next);
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
      markSlip(index);
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
      const { notes, slips } = scaleAccuracy(s.rows, rowSlipsRef.current, row.q);
      const correct = isScaleCorrect(notes, slips);
      if (correct) playCorrectChime();
      onAnswerRef.current?.({
        scaleTypeId: q.scaleTypeId,
        positionIndex: q.positionIndex,
        correct,
        seconds: elapsedRef.current - (stats.startedAt[row.q] ?? 0),
        notes,
        slips,
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
        noteRoundEnded();
        onCompleteRef.current?.();
      }, FINISH_DELAY_MS);
    }
  }, [onCorrect, onTimeout, clearTimers, markSlip]);

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
      // The live note is still hidden and about to be lost: reveal it.
      const live = nextRowRef.current;
      const liveRow = s.rows[live];
      if (
        liveRow?.kind === 'note' && liveRow.step > 0 && hintRowRef.current !== live
        && rowBottom(live, scrollRef.current) <= HINT_BOTTOM_ROWS
      ) {
        hintRowRef.current = live;
        setHintRow(live);
        markSlip(live);
      }
    }
    frameListenerRef.current?.(scrollRef.current);
    rafRef.current = requestAnimationFrame((t) => frameRef.current(t, mySession));
  }, [resolveRow, markSlip]);
  useEffect(() => { frameRef.current = frame; }, [frame]);

  // Leaving the screen mid-round ends the round as far as the ad strip goes.
  useEffect(() => () => { if (runningRef.current) noteRoundEnded(); }, []);

  const stop = useCallback(() => {
    // A round stopped part-way still counts toward the ad pacing.
    if (runningRef.current) noteRoundEnded();
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearTimers();
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    reset();
    sessionRef.current += 1;
    noteRoundStarted();
    const mySession = sessionRef.current;

    const questions: ScaleQuestion[] = [];
    for (let i = 0; i < questionCount; i++) {
      const q = pickScaleQuestion(
        pool, instrument.notes, instrument.stringCount, instrument.maxFret, Math.random, naturalsOnly, direction,
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
    statsRef.current = { startedAt: [0] };
    rowSlipsRef.current = [];
    setRowSlips([]);
    hintRowRef.current = null;
    setHintRow(null);
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
  }, [clearTimers, reset, beginRun, questionCount, pool, instrument, naturalsOnly, direction]);

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

    // A dim note, or a lit note of another scale. Charged to the note being
    // played right now.
    if (nextRowRef.current < s.rows.length) markSlip(nextRowRef.current);
    onWrong();
    haptic.wrong();
    setWrongTile({ row: rowIndex, string });
    if (wrongTimeoutRef.current != null) clearTimeout(wrongTimeoutRef.current);
    wrongTimeoutRef.current = setTimeout(() => setWrongTile(null), WRONG_FLASH_MS);
  }, [onWrong, resolveRow, markSlip]);

  useEffect(() => clearTimers, [clearTimers]);

  const liveQ = stream?.rows[Math.min(nextRow, stream.rows.length - 1)]?.q ?? 0;
  return {
    running, stream, rowStates, nextRow, wrongTile, rowSlips, hintRow,
    /** The scale being played now (1-based) and how many the session has. */
    questionNumber: stream ? liveQ + 1 : 0,
    questionCount: stream?.questions.length ?? questionCount,
    currentQuestion: stream?.questions[liveQ] ?? null,
    session, start, stop, tap, frameListenerRef,
  };
}
