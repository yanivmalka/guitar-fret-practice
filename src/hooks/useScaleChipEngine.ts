// ── useScaleChipEngine — Exercises B & C ("identify the scale" /
// "name the degree") drill runner ─────────────────────────────────────────
//
// A second small dedicated engine, sibling to `useScaleDrillEngine.ts`
// (Exercise A) — not merged with it, because the two answer shapes are
// different enough (tap N neck positions vs. pick one chip) that a shared
// state machine would need a branch on almost every field. Both exercises
// answer through a single chip tap, so they share one engine here (mirrors
// how Intervals' two exercises share one `DrillBoard` + `IntervalChoiceRow`
// flow), selected via the `exercise` option.
//
// Reuses `useScoring` / `audio.ts` / `feedback.ts` exactly like every other
// quiz surface. Timer refs, not state, back the countdown (this repo's
// convention — see CLAUDE.md "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  pickScaleIdentifyQuestion, pickScaleDegreeQuestion,
  type ScaleIdentifyQuestion, type ScaleDegreeQuestion, type ScalePoolItem, type ScaleDirection,
} from '../learning/scaleDrill';
import { playNoteSequence, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';
import { noteRoundEnded, noteRoundStarted } from '../utils/adPacing';

export type ScaleChipExercise = 'identifyScale' | 'nameDegree';

export interface ScaleChipDrillInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
}

/** One resolved question — what `learningState.ts`'s `recordScaleAnswer`
 *  needs to fold the position into `scaleSrs` (scales-learning-spec.md §10). */
export interface ScaleChipAnswer {
  scaleTypeId: string;
  positionIndex: number;
  form: 'identifyScale' | 'nameDegree';
  correct: boolean;
  seconds: number;
}

export interface ScaleChipEngineOptions {
  exercise: ScaleChipExercise;
  instrument: ScaleChipDrillInstrument;
  pool: ScalePoolItem[];
  questionCount: number;
  timeLimit: number;
  optionCount?: number;
  /** §9.1's "root bias": naturals-only at `focused`, any root otherwise. */
  naturalsOnly?: boolean;
  /** Which way "identify the scale" plays the scale; `'both'` is decided per
   *  question. "Name the degree" is direction-free (a degree is the same note
   *  either way). */
  direction?: ScaleDirection;
  onComplete?: () => void;
  /** Fired once per question, on a tap or a timeout. */
  onAnswer?: (answer: ScaleChipAnswer) => void;
}

export type ScaleChipQuestion = ScaleIdentifyQuestion | ScaleDegreeQuestion;

const PLAYBACK_MS = 1400;

export function useScaleChipEngine({
  exercise, instrument, pool, questionCount, timeLimit, optionCount = 4, naturalsOnly = false, direction = 'up', onComplete, onAnswer,
}: ScaleChipEngineOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<ScaleChipQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionTime, setQuestionTime] = useState(timeLimit);
  const [questionStart, setQuestionStart] = useState(() => Date.now());

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const questionRef = useRef<ScaleChipQuestion | null>(null);
  const questionStartRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextQuestionRef = useRef<(mySession: number) => void>(() => {});
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const answerValue = useCallback((q: ScaleChipQuestion): string =>
    exercise === 'identifyScale' ? (q as ScaleIdentifyQuestion).scaleTypeId : (q as ScaleDegreeQuestion).targetNote,
  [exercise]);

  const clearCountdown = useCallback(() => {
    if (timeoutRef.current != null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    setRunning(false); runningRef.current = false;
    clearCountdown();
    noteRoundEnded();
    onComplete?.();
  }, [clearCountdown, onComplete]);

  const playStimulus = useCallback((q: ScaleIdentifyQuestion) => {
    void playNoteSequence(q.rootString, q.playFrets, PLAYBACK_MS);
  }, []);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setFeedback('');
    setSelected(null);
    answeredRef.current = false;

    const q = exercise === 'identifyScale'
      ? pickScaleIdentifyQuestion(pool, instrument.notes, instrument.stringCount, instrument.maxFret, optionCount, Math.random, naturalsOnly, direction)
      : pickScaleDegreeQuestion(pool, instrument.notes, instrument.stringCount, instrument.maxFret, optionCount, Math.random, naturalsOnly);
    if (!q) { finish(); return; }
    questionRef.current = q;
    setQuestion(q);
    if (exercise === 'identifyScale') playStimulus(q as ScaleIdentifyQuestion);

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
      onAnswerRef.current?.({
        scaleTypeId: q.scaleTypeId, positionIndex: q.positionIndex, form: exercise,
        correct: false, seconds: t,
      });
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession); }, 1200);
    }, t * 1000);
  }, [exercise, pool, instrument, questionCount, optionCount, naturalsOnly, direction, getQuestionTime, timeLimit, onTimeout, finish, clearCountdown, playStimulus]);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const start = useCallback(() => {
    reset();
    sessionRef.current += 1;
    noteRoundStarted();
    const mySession = sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    countRef.current = 0;
    beginRun(timeLimit, questionCount);
    nextQuestion(mySession);
  }, [reset, beginRun, timeLimit, questionCount, nextQuestion]);

  const stop = useCallback(() => {
    // A round stopped part-way still counts toward the ad pacing.
    if (runningRef.current) noteRoundEnded();
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearCountdown();
  }, [clearCountdown]);

  const replay = useCallback(() => {
    const q = questionRef.current;
    if (exercise === 'identifyScale' && q && runningRef.current && !answeredRef.current) {
      playStimulus(q as ScaleIdentifyQuestion);
    }
  }, [exercise, playStimulus]);

  const selectOption = useCallback((value: string) => {
    if (!runningRef.current || answeredRef.current) return;
    const q = questionRef.current;
    if (!q) return;
    answeredRef.current = true;
    clearCountdown();
    setSelected(value);

    const answer = answerValue(q);
    const mySession = sessionRef.current;
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const correct = value === answer;
    onAnswerRef.current?.({
      scaleTypeId: q.scaleTypeId, positionIndex: q.positionIndex, form: exercise,
      correct, seconds: elapsed,
    });
    if (correct) {
      onCorrect(elapsed, questionTime);
      playCorrectChime();
      haptic.correct();
      setFeedback('✓');
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestion(mySession); }, 700);
    } else {
      onWrong();
      haptic.wrong();
      setFeedback('✗');
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextQuestion(mySession); }, 1200);
    }
  }, [exercise, answerValue, clearCountdown, onCorrect, onWrong, questionTime, nextQuestion]);

  return {
    running, question, selected, feedback,
    questionNumber, questionCount, questionTime, questionStart,
    session, start, stop, selectOption, replay,
    answerValue: question ? answerValue(question) : null,
  };
}
