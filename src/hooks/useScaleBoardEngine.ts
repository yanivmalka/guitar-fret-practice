// ── useScaleBoardEngine — Exercise A ("Build the scale") drill runner ────
//
// Replaces `useScaleTilesEngine.ts` (the falling-lane Piano Tiles mechanic)
// per the product owner's Session 3 correction, scales-learning-spec.md §17:
// the whole neck is on screen at once, every note visible, the shape's notes
// lit and everything else dim. There is no per-tile arrival schedule and no
// timing window left to police — a question is "tap every lit position",
// answered in any order, so this runner is the earlier per-question
// countdown shape again rather than the real-time one.
//
// Not threaded through the shared `useGameEngine`: that hook's byNote path
// only ever narrows a question to one string + one note name (see
// scaleDrill.ts's header comment), and a scale shape spans several strings
// with several note names. Reuses `useScoring` / `audio.ts` / `feedback.ts`
// like every other quiz surface, and backs its timers with refs, not state
// (CLAUDE.md "Conventions").
//
// Tapping a dim (non-shape) note flashes it red and scores a penalty but
// does **not** end the question — the same continue-on-mistake rule the
// tiles engine established, and the only one that makes sense here: with the
// shape already lit, a stray tap is exploration, not a failed guess.

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem } from '../learning/scaleDrill';
import type { NeckPos } from '../utils/scales';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

/** Milliseconds a wrong (dim) tap stays lit red. */
const WRONG_FLASH_MS = 600;

export interface ScaleBoardInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
}

/** One resolved question — what `learningState.ts`'s `recordScaleAnswer`
 *  needs to fold the position into `scaleSrs` (spec §10). */
export interface ScaleBoardAnswer {
  scaleTypeId: string;
  positionIndex: number;
  /** Every lit position was found before the clock ran out. */
  correct: boolean;
  seconds: number;
}

export interface ScaleBoardOptions {
  instrument: ScaleBoardInstrument;
  pool: ScalePoolItem[];
  questionCount: number;
  timeLimit: number;
  naturalsOnly?: boolean;
  onComplete?: () => void;
  onAnswer?: (answer: ScaleBoardAnswer) => void;
}

function samePos(a: NeckPos, b: NeckPos): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export function useScaleBoardEngine({
  instrument, pool, questionCount, timeLimit, naturalsOnly = false, onComplete, onAnswer,
}: ScaleBoardOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<ScaleQuestion | null>(null);
  const [foundPositions, setFoundPositions] = useState<NeckPos[]>([]);
  const [wrongPosition, setWrongPosition] = useState<NeckPos | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionTime, setQuestionTime] = useState(timeLimit);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const foundRef = useRef<NeckPos[]>([]);
  const questionRef = useRef<ScaleQuestion | null>(null);
  const questionStartRef = useRef(0);
  const questionTimeRef = useRef(timeLimit);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `nextQuestion` schedules itself (via setTimeout, after the between-
  // questions pause) before its own `useCallback` has finished being
  // declared — routed through a ref so the self-call reaches the current
  // closure.
  const nextQuestionRef = useRef<(mySession: number) => void>(() => {});
  const onAnswerRef = useRef(onAnswer);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current != null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (wrongTimeoutRef.current != null) { clearTimeout(wrongTimeoutRef.current); wrongTimeoutRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    setRunning(false); runningRef.current = false;
    clearTimers();
    onComplete?.();
  }, [clearTimers, onComplete]);

  const reportAnswer = useCallback((q: ScaleQuestion, correct: boolean) => {
    onAnswerRef.current?.({
      scaleTypeId: q.scaleTypeId,
      positionIndex: q.positionIndex,
      correct,
      seconds: (Date.now() - questionStartRef.current) / 1000,
    });
  }, []);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setWrongPosition(null);
    answeredRef.current = false;

    const q = pickScaleQuestion(
      pool, instrument.notes, instrument.stringCount, instrument.maxFret, Math.random, naturalsOnly,
    );
    if (!q) { finish(); return; }
    questionRef.current = q;
    setQuestion(q);
    foundRef.current = [];
    setFoundPositions([]);

    const t = getQuestionTime(timeLimit);
    questionTimeRef.current = t;
    setQuestionTime(t);
    questionStartRef.current = Date.now();

    clearTimers();
    timeoutRef.current = setTimeout(() => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      beep();
      onTimeout();
      reportAnswer(q, false);
      setTimeout(() => {
        if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession);
      }, 1200);
    }, t * 1000);
  }, [pool, instrument, questionCount, timeLimit, naturalsOnly, getQuestionTime, onTimeout, finish, clearTimers, reportAnswer]);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const start = useCallback(() => {
    reset();
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    countRef.current = 0;
    beginRun(timeLimit, questionCount);
    nextQuestion(mySession);
  }, [reset, beginRun, timeLimit, questionCount, nextQuestion]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearTimers();
  }, [clearTimers]);

  const selectPosition = useCallback((string: number, fret: number) => {
    if (!runningRef.current || answeredRef.current) return;
    const q = questionRef.current;
    if (!q) return;
    const tapped: NeckPos = { string, fret };
    // Every tap sounds its own note, lit or dim — the board doubles as a
    // playable neck (product-owner instruction).
    playNoteSingle(string, fret);

    if (foundRef.current.some((p) => samePos(p, tapped))) { haptic.tap(); return; }

    if (!q.shape.some((p) => samePos(p, tapped))) {
      onWrong();
      haptic.wrong();
      setWrongPosition(tapped);
      if (wrongTimeoutRef.current != null) clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = setTimeout(() => setWrongPosition(null), WRONG_FLASH_MS);
      return;
    }

    const nextFound = [...foundRef.current, tapped];
    foundRef.current = nextFound;
    setFoundPositions(nextFound);
    haptic.tap();

    if (nextFound.length >= q.shape.length) {
      answeredRef.current = true;
      clearTimers();
      onCorrect((Date.now() - questionStartRef.current) / 1000, questionTimeRef.current);
      playCorrectChime();
      reportAnswer(q, true);
      const mySession = sessionRef.current;
      setTimeout(() => {
        if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession);
      }, 700);
    }
  }, [onCorrect, onWrong, clearTimers, reportAnswer]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    running, question, foundPositions, wrongPosition,
    questionNumber, questionCount, questionTime,
    found: foundPositions.length,
    session, start, stop, selectPosition,
  };
}
