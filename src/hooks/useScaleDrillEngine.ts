// ── useScaleDrillEngine — Exercise A ("Build the scale") drill runner ────
//
// A dedicated, self-contained engine for the one new answer surface Scales
// Learning needs (`ScaleShapeBoard.tsx`, a multi-string "piano tiles" board)
// — NOT threaded through the shared `useGameEngine`. That hook's byNote path
// only ever narrows a question to one string + one note name (see
// scaleDrill.ts's header comment for why); wedging a genuinely multi-string,
// multi-note-name answer surface into it would mean touching ~1000 lines of
// tightly-coupled ref/closure machinery shared by every other quiz mode.
// Scales Learning is already a sibling domain with its own everything
// (scales-learning-spec.md §0) — a small dedicated runner for just this
// exercise fits that pattern and keeps the shared engine untouched.
//
// Reuses `useScoring` (domain-agnostic session score/streak/multiplier) and
// `audio.ts` / `feedback.ts` exactly like every other quiz surface. Timer
// refs, not state, back the countdown (this repo's convention for
// timer-driven logic — see CLAUDE.md "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem } from '../learning/scaleDrill';
import type { NeckPos } from '../utils/scales';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

export interface ScaleDrillInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
}

export interface ScaleDrillOptions {
  instrument: ScaleDrillInstrument;
  pool: ScalePoolItem[];
  questionCount: number;
  timeLimit: number;
  /** Fired when the run ends after asking `questionCount` questions. Read the
   *  hook's own `session` (already up to date by then) for the final score
   *  rather than relying on an argument here. */
  onComplete?: () => void;
}

function samePos(a: NeckPos, b: NeckPos): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export function useScaleDrillEngine({
  instrument, pool, questionCount, timeLimit, onComplete,
}: ScaleDrillOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<ScaleQuestion | null>(null);
  const [foundPositions, setFoundPositions] = useState<NeckPos[]>([]);
  const [wrongPosition, setWrongPosition] = useState<NeckPos | null>(null);
  const [feedback, setFeedback] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionTime, setQuestionTime] = useState(timeLimit);
  const [questionStart, setQuestionStart] = useState(() => Date.now());

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const foundRef = useRef<NeckPos[]>([]);
  const questionRef = useRef<ScaleQuestion | null>(null);
  const questionStartRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `nextQuestion` calls itself (via setTimeout, after a timeout/wrong/correct
  // pause) before its own `useCallback` has finished being declared — routed
  // through a ref so the self-call always reaches the current closure.
  const nextQuestionRef = useRef<(mySession: number) => void>(() => {});

  const clearCountdown = useCallback(() => {
    if (timeoutRef.current != null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    setRunning(false); runningRef.current = false;
    clearCountdown();
    onComplete?.();
  }, [clearCountdown, onComplete]);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setFeedback('');
    setWrongPosition(null);
    answeredRef.current = false;

    const q = pickScaleQuestion(pool, instrument.notes, instrument.stringCount, instrument.maxFret);
    if (!q) { finish(); return; }
    questionRef.current = q;
    setQuestion(q);
    foundRef.current = [];
    setFoundPositions([]);

    const t = getQuestionTime(timeLimit);
    setQuestionTime(t);
    questionStartRef.current = Date.now();
    setQuestionStart(questionStartRef.current);

    clearCountdown();
    timeoutRef.current = setTimeout(() => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      beep();
      onTimeout();
      setFeedback('⏱');
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession); }, 1200);
    }, t * 1000);
  }, [pool, instrument, questionCount, timeLimit, getQuestionTime, onTimeout, finish, clearCountdown]);
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
    clearCountdown();
  }, [clearCountdown]);

  const selectPosition = useCallback((string: number, fret: number) => {
    if (!runningRef.current || answeredRef.current) return;
    const q = questionRef.current;
    if (!q) return;
    const tapped: NeckPos = { string, fret };
    playNoteSingle(string, fret);

    const alreadyFound = foundRef.current.some((p) => samePos(p, tapped));
    if (alreadyFound) {
      // A redundant tap on an already-found position — harmless, no penalty.
      haptic.tap();
      return;
    }

    const isShapeMember = q.shape.some((p) => samePos(p, tapped));
    if (!isShapeMember) {
      // A tap outside the shape ends the question, mirroring the plain
      // byNote flow's wrong-fret handling (useGameEngine.selectFret).
      onWrong();
      haptic.wrong();
      answeredRef.current = true;
      clearCountdown();
      setWrongPosition(tapped);
      setFeedback('✗');
      const mySession = sessionRef.current;
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestion(mySession); }, 1200);
      return;
    }

    const nextFound = [...foundRef.current, tapped];
    foundRef.current = nextFound;
    setFoundPositions(nextFound);
    haptic.tap();

    if (nextFound.length >= q.shape.length) {
      answeredRef.current = true;
      clearCountdown();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      onCorrect(elapsed, questionTime);
      playCorrectChime();
      setFeedback('✓');
      const mySession = sessionRef.current;
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestion(mySession); }, 700);
    }
  }, [clearCountdown, onCorrect, onWrong, questionTime, nextQuestion]);

  return {
    running, question, foundPositions, wrongPosition, feedback,
    questionNumber, questionCount, questionTime, questionStart,
    session, start, stop, selectPosition,
  };
}
