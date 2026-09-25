// ── useStaffEngine — the Staff reading drill runner ──────────────────────
//
// staff-reading-spec.md §6. One small dedicated engine for both exercises:
//   • nameNote   — a note is written on the staff; pick its name from a chip row.
//   • findOnNeck — a note is written on the staff; tap a place on the neck that
//                  plays it (any string — every matching place counts).
// A sibling of `useScaleChipEngine`, not a branch of the shared `useGameEngine`:
// the prompt is a written pitch, not a fret or a note name, and the answer to
// "find it" is an exact pitch rather than a pitch class.
//
// Reuses `useScoring` / `audio.ts` / `feedback.ts` like every other quiz
// surface. Timer refs, not state, back the countdown (CLAUDE.md "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickStaffQuestion, type StaffPoolItem, type StaffPosition } from '../learning/staffDrill';
import type { SrsMap } from '../learning/srs';
import { pitchClassName } from '../utils/staff';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

export type StaffExercise = 'nameNote' | 'findOnNeck';

export interface StaffAnswer {
  itemId: string;
  form: StaffExercise;
  correct: boolean;
  seconds: number;
}

export interface StaffEngineOptions {
  exercise: StaffExercise;
  pool: StaffPoolItem[];
  /** MIDI of each open string, `[0]` = string 1 (the highest-pitched). */
  openMidi: readonly number[];
  questionCount: number;
  timeLimit: number;
  /** Read fresh on every pick, so the answers of this session steer the rest of it. */
  getSrs: () => SrsMap;
  onComplete?: () => void;
  onAnswer?: (answer: StaffAnswer) => void;
}

export function useStaffEngine({
  exercise, pool, openMidi, questionCount, timeLimit, getSrs, onComplete, onAnswer,
}: StaffEngineOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<StaffPoolItem | null>(null);
  /** nameNote: the chip picked. */
  const [selected, setSelected] = useState<string | null>(null);
  /** findOnNeck: the place tapped, and whether it was right. */
  const [tapped, setTapped] = useState<(StaffPosition & { correct: boolean }) | null>(null);
  const [answered, setAnswered] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questionTime, setQuestionTime] = useState(timeLimit);
  const [questionStart, setQuestionStart] = useState(() => Date.now());

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const questionRef = useRef<StaffPoolItem | null>(null);
  const questionStartRef = useRef(0);
  const questionTimeRef = useRef(timeLimit);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextQuestionRef = useRef<(mySession: number) => void>(() => {});
  const onAnswerRef = useRef(onAnswer);
  const getSrsRef = useRef(getSrs);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
    getSrsRef.current = getSrs;
  }, [onAnswer, getSrs]);

  const clearCountdown = useCallback(() => {
    if (timeoutRef.current != null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    setRunning(false); runningRef.current = false;
    clearCountdown();
    onComplete?.();
  }, [clearCountdown, onComplete]);

  const scheduleNext = useCallback((mySession: number, delay: number) => {
    setTimeout(() => {
      if (runningRef.current && sessionRef.current === mySession) nextQuestionRef.current(mySession);
    }, delay);
  }, []);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    const q = pickStaffQuestion(pool, getSrsRef.current(), questionRef.current?.midi ?? null, Date.now());
    if (!q) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setSelected(null);
    setTapped(null);
    setAnswered(false);
    answeredRef.current = false;
    questionRef.current = q;
    setQuestion(q);

    const t = getQuestionTime(timeLimit);
    questionTimeRef.current = t;
    setQuestionTime(t);
    questionStartRef.current = Date.now();
    setQuestionStart(questionStartRef.current);

    clearCountdown();
    timeoutRef.current = setTimeout(() => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      onTimeout();
      onAnswerRef.current?.({ itemId: q.itemId, form: exercise, correct: false, seconds: t });
      scheduleNext(mySession, 1800);
    }, t * 1000);
  }, [exercise, pool, questionCount, getQuestionTime, timeLimit, onTimeout, finish, clearCountdown, scheduleNext]);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const start = useCallback(() => {
    reset();
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    countRef.current = 0;
    questionRef.current = null;
    beginRun(timeLimit, questionCount);
    nextQuestion(mySession);
  }, [reset, beginRun, timeLimit, questionCount, nextQuestion]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearCountdown();
  }, [clearCountdown]);

  /** Shared tail of an answer: score, feedback, record, move on. */
  const resolve = useCallback((q: StaffPoolItem, correct: boolean) => {
    answeredRef.current = true;
    setAnswered(true);
    clearCountdown();
    const mySession = sessionRef.current;
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    onAnswerRef.current?.({ itemId: q.itemId, form: exercise, correct, seconds: elapsed });
    if (correct) {
      onCorrect(elapsed, questionTimeRef.current);
      playCorrectChime();
      haptic.correct();
      scheduleNext(mySession, 900);
    } else {
      onWrong();
      haptic.wrong();
      scheduleNext(mySession, 1800);
    }
  }, [exercise, clearCountdown, onCorrect, onWrong, scheduleNext]);

  const selectName = useCallback((value: string) => {
    const q = questionRef.current;
    if (!runningRef.current || answeredRef.current || !q) return;
    setSelected(value);
    // Let the learner hear the note they just read, right or wrong.
    const pos = q.positions[0];
    if (pos) void playNoteSingle(pos.string, pos.fret);
    resolve(q, value === pitchClassName(q.midi));
  }, [resolve]);

  const tapPosition = useCallback((string: number, fret: number) => {
    const q = questionRef.current;
    void playNoteSingle(string, fret);
    if (!runningRef.current || answeredRef.current || !q) return;
    const correct = (openMidi[string - 1] ?? NaN) + fret === q.midi;
    setTapped({ string, fret, correct });
    resolve(q, correct);
  }, [openMidi, resolve]);

  return {
    running, question, selected, tapped, answered,
    questionNumber, questionCount, questionTime, questionStart,
    session, start, stop, selectName, tapPosition,
    answerName: question ? pitchClassName(question.midi) : null,
  };
}
