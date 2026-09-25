// ── useStaffEngine — the Staff reading drill runner ──────────────────────
//
// staff-reading-spec.md §6. One small dedicated engine for every exercise:
//   • nameNote    — a note is written on the staff; pick its name from a chip row.
//   • findOnNeck  — a note is written on the staff; tap a place on the neck that
//                   plays it (any string — every matching place counts).
//   • findOnStaff — a place on the neck is marked; put the note where it is
//                   written on the staff.
//   • readPhrase  — a short phrase is written; name its notes in order.
// A sibling of `useScaleChipEngine`, not a branch of the shared `useGameEngine`:
// the prompt is a written pitch, not a fret or a note name, and the answer to
// "find it" is an exact pitch rather than a pitch class.
//
// A question holds one note, or a phrase of several; each note is its own
// answer (its own SRS review, its own score), and the question is over once
// every note is answered or the time runs out.
//
// Reuses `useScoring` / `audio.ts` / `feedback.ts` like every other quiz
// surface. Timer refs, not state, back the countdown (CLAUDE.md "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildStaffPhrase, pickStaffQuestion, type StaffPoolItem, type StaffPosition,
} from '../learning/staffDrill';
import type { SrsMap } from '../learning/srs';
import type { StaffForm } from '../learning/learningState';
import { pitchClassName } from '../utils/staff';
import { playNoteSingle, beep } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

export type StaffExercise = StaffForm;

export interface StaffAnswer {
  itemId: string;
  form: StaffExercise;
  correct: boolean;
  seconds: number;
}

export interface StaffQuestion {
  /** One note, or the notes of a phrase in reading order. */
  items: StaffPoolItem[];
  /** findOnStaff: the place on the neck the question points at. */
  marked: StaffPosition | null;
}

export interface StaffNoteResult {
  correct: boolean;
  /** nameNote / readPhrase: the chip picked (absent on a timeout). */
  picked?: string;
}

export interface StaffEngineOptions {
  exercise: StaffExercise;
  pool: StaffPoolItem[];
  /** MIDI of each open string, `[0]` = string 1 (the highest-pitched). */
  openMidi: readonly number[];
  questionCount: number;
  /** Notes per question — above 1 only for readPhrase. */
  notesPerQuestion: number;
  /** Seconds per note. */
  timeLimit: number;
  /** Read fresh on every pick, so the answers of this session steer the rest of it. */
  getSrs: () => SrsMap;
  onComplete?: () => void;
  onAnswer?: (answer: StaffAnswer) => void;
}

const PHRASE_NOTE_GAP_MS = 420;

export function useStaffEngine({
  exercise, pool, openMidi, questionCount, notesPerQuestion, timeLimit, getSrs, onComplete, onAnswer,
}: StaffEngineOptions) {
  const { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<StaffQuestion | null>(null);
  /** Index of the note being answered (a phrase moves it along). */
  const [cursor, setCursor] = useState(0);
  const [results, setResults] = useState<(StaffNoteResult | null)[]>([]);
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
  const questionRef = useRef<StaffQuestion | null>(null);
  const cursorRef = useRef(0);
  const resultsRef = useRef<(StaffNoteResult | null)[]>([]);
  /** When the current note became the one to answer. */
  const noteStartRef = useRef(0);
  const noteTimeRef = useRef(timeLimit);
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

  const setResultsBoth = useCallback((next: (StaffNoteResult | null)[]) => {
    resultsRef.current = next;
    setResults(next);
  }, []);

  /** Play a phrase back note by note, so the learner hears what they read. */
  const playPhrase = useCallback((items: readonly StaffPoolItem[], mySession: number) => {
    items.forEach((it, i) => {
      setTimeout(() => {
        const pos = it.positions[0];
        if (sessionRef.current === mySession && pos) void playNoteSingle(pos.string, pos.fret);
      }, i * PHRASE_NOTE_GAP_MS);
    });
  }, []);

  const nextQuestion = useCallback((mySession: number) => {
    if (!runningRef.current || sessionRef.current !== mySession) return;
    if (countRef.current >= questionCount) { finish(); return; }
    const srs = getSrsRef.current();
    const now = Date.now();
    const prev = questionRef.current;
    const previousMidi = prev ? prev.items[prev.items.length - 1].midi : null;
    const items = notesPerQuestion > 1
      ? buildStaffPhrase(pool, srs, notesPerQuestion, previousMidi, now)
      : [pickStaffQuestion(pool, srs, previousMidi, now)].filter((q): q is StaffPoolItem => q != null);
    if (items.length === 0) { finish(); return; }
    const marked = exercise === 'findOnStaff'
      ? items[0].positions[Math.floor(Math.random() * items[0].positions.length)] ?? null
      : null;
    const q: StaffQuestion = { items, marked };

    countRef.current += 1;
    setQuestionNumber(countRef.current);
    setTapped(null);
    setAnswered(false);
    answeredRef.current = false;
    cursorRef.current = 0;
    setCursor(0);
    setResultsBoth(items.map(() => null));
    questionRef.current = q;
    setQuestion(q);

    const perNote = getQuestionTime(timeLimit);
    const total = perNote * items.length;
    noteTimeRef.current = perNote;
    setQuestionTime(total);
    noteStartRef.current = Date.now();
    setQuestionStart(noteStartRef.current);

    clearCountdown();
    timeoutRef.current = setTimeout(() => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      onTimeout();
      // Every note not answered yet counts as missed.
      const next = [...resultsRef.current];
      next.forEach((r, i) => {
        if (r != null) return;
        next[i] = { correct: false };
        onAnswerRef.current?.({ itemId: items[i].itemId, form: exercise, correct: false, seconds: perNote });
      });
      setResultsBoth(next);
      if (items.length > 1) playPhrase(items, mySession);
      scheduleNext(mySession, items.length > 1 ? 1800 + items.length * PHRASE_NOTE_GAP_MS : 1800);
    }, total * 1000);
  }, [exercise, pool, questionCount, notesPerQuestion, getQuestionTime, timeLimit, onTimeout, finish, clearCountdown, scheduleNext, setResultsBoth, playPhrase]);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const start = useCallback(() => {
    reset();
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    countRef.current = 0;
    questionRef.current = null;
    beginRun(timeLimit, questionCount * notesPerQuestion);
    nextQuestion(mySession);
  }, [reset, beginRun, timeLimit, questionCount, notesPerQuestion, nextQuestion]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearCountdown();
  }, [clearCountdown]);

  /** Answer the note under the cursor: score, record, feedback, move on. */
  const resolve = useCallback((correct: boolean, extra: Omit<StaffNoteResult, 'correct'> = {}) => {
    const q = questionRef.current;
    if (!q) return;
    const i = cursorRef.current;
    const item = q.items[i];
    const mySession = sessionRef.current;
    const now = Date.now();
    const elapsed = (now - noteStartRef.current) / 1000;
    onAnswerRef.current?.({ itemId: item.itemId, form: exercise, correct, seconds: elapsed });
    const next = [...resultsRef.current];
    next[i] = { correct, ...extra };
    setResultsBoth(next);
    const isPhrase = q.items.length > 1;
    if (correct) {
      onCorrect(elapsed, noteTimeRef.current);
      if (isPhrase) haptic.tap(); else { playCorrectChime(); haptic.correct(); }
    } else {
      onWrong();
      haptic.wrong();
    }

    if (i + 1 < q.items.length) {
      cursorRef.current = i + 1;
      setCursor(i + 1);
      noteStartRef.current = now;
      return;
    }
    answeredRef.current = true;
    setAnswered(true);
    clearCountdown();
    if (isPhrase) {
      const allRight = next.every((r) => r?.correct);
      if (allRight) playCorrectChime();
      playPhrase(q.items, mySession);
      scheduleNext(mySession, 1500 + q.items.length * PHRASE_NOTE_GAP_MS);
    } else {
      scheduleNext(mySession, correct ? 900 : 1800);
    }
  }, [exercise, clearCountdown, onCorrect, onWrong, scheduleNext, setResultsBoth, playPhrase]);

  /** nameNote / readPhrase: a chip was picked for the current note. */
  const selectName = useCallback((value: string) => {
    const q = questionRef.current;
    if (!runningRef.current || answeredRef.current || !q) return;
    const item = q.items[cursorRef.current];
    // A single note plays after the answer, so the written note, its name and
    // its sound connect; a phrase plays back as a whole at the end.
    if (q.items.length === 1) {
      const pos = item.positions[0];
      if (pos) void playNoteSingle(pos.string, pos.fret);
    }
    resolve(value === pitchClassName(item.midi), { picked: value });
  }, [resolve]);

  /** findOnNeck: a place on the neck was tapped. */
  const tapPosition = useCallback((string: number, fret: number) => {
    const q = questionRef.current;
    void playNoteSingle(string, fret);
    if (!runningRef.current || answeredRef.current || !q) return;
    const correct = (openMidi[string - 1] ?? NaN) + fret === q.items[0].midi;
    setTapped({ string, fret, correct });
    resolve(correct);
  }, [openMidi, resolve]);

  /** findOnStaff: the learner committed a note on the staff (its sounding pitch). */
  const placeOnStaff = useCallback((soundingMidi: number) => {
    const q = questionRef.current;
    if (!runningRef.current || answeredRef.current || !q) return;
    const pos = q.marked ?? q.items[0].positions[0];
    if (pos) void playNoteSingle(pos.string, pos.fret);
    resolve(soundingMidi === q.items[0].midi);
  }, [resolve]);

  return {
    running, question, cursor, results, tapped, answered,
    questionNumber, questionCount, questionTime, questionStart,
    session, start, stop, selectName, tapPosition, placeOnStaff,
  };
}
