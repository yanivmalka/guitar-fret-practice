// ── useScaleOrderEngine — "Tap the scale in order" drill runner ──────────
//
// The fourth Scales exercise (see `scaleOrder.ts`): a still neck section with
// every note of the scale lit; the learner taps them in the order of the run.
// No falling, no countdown — the order is the whole question.
//
// - A tap on a tile of the next step is a hit: it plays, turns green and
//   shows its number in the run.
// - Any other tile — a lit note out of order, or a dim note that isn't in the
//   scale — is a wrong tap: it still plays, flashes red, penalises, and the
//   step being looked for slips. The scale keeps going.
// - One scale is one SRS answer, judged like Exercise A: correct when at most
//   one note in five slipped (`isScaleCorrect`).
//
// Timer-read values live in refs, state only for rendering (CLAUDE.md
// "Conventions").

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem, type ScaleDirection } from '../learning/scaleDrill';
import { buildOrderBoard, type ScaleOrderBoard } from '../learning/scaleOrder';
import { isScaleCorrect } from '../learning/scaleFall';
import { playNoteSingle } from '../utils/audio';
import { haptic, playCorrectChime } from '../utils/feedback';
import { useScoring } from './useScoring';

/** Milliseconds a wrong tap stays red. */
const WRONG_FLASH_MS = 350;
/** Pause after a scale's last note before the next scale appears. */
const NEXT_SCALE_MS = 900;

export interface ScaleOrderInstrument {
  notes: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
  openMidi: readonly number[];
}

export interface ScaleOrderAnswer {
  scaleTypeId: string;
  positionIndex: number;
  correct: boolean;
  seconds: number;
}

export interface ScaleOrderOptions {
  instrument: ScaleOrderInstrument;
  pool: ScalePoolItem[];
  questionCount: number;
  /** Seconds per note that still earn a speed bonus. */
  noteTime: number;
  naturalsOnly?: boolean;
  direction?: ScaleDirection;
  onComplete?: () => void;
  onAnswer?: (answer: ScaleOrderAnswer) => void;
}

export interface OrderTile {
  string: number;
  fret: number;
}

export function useScaleOrderEngine({
  instrument, pool, questionCount, noteTime, naturalsOnly = false, direction = 'up', onComplete, onAnswer,
}: ScaleOrderOptions) {
  const { session, reset, beginRun, onCorrect, onWrong } = useScoring();

  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState<ScaleQuestion | null>(null);
  const [board, setBoard] = useState<ScaleOrderBoard | null>(null);
  /** How many steps of the run are done — the next step to tap. */
  const [step, setStep] = useState(0);
  /** Steps that slipped (a wrong tap while they were the one looked for). */
  const [slips, setSlips] = useState<boolean[]>([]);
  const [wrongTile, setWrongTile] = useState<OrderTile | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const countRef = useRef(0);
  const questionRef = useRef<ScaleQuestion | null>(null);
  const boardRef = useRef<ScaleOrderBoard | null>(null);
  const stepRef = useRef(0);
  const slipsRef = useRef<boolean[]>([]);
  const questionStartRef = useRef(0);
  const lastHitRef = useRef(0);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const clearTimers = useCallback(() => {
    if (wrongTimeoutRef.current != null) { clearTimeout(wrongTimeoutRef.current); wrongTimeoutRef.current = null; }
    if (nextTimeoutRef.current != null) { clearTimeout(nextTimeoutRef.current); nextTimeoutRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    clearTimers();
    onCompleteRef.current?.();
  }, [clearTimers]);

  const nextQuestion = useCallback(() => {
    if (!runningRef.current) return;
    if (countRef.current >= questionCount) { finish(); return; }
    const q = pickScaleQuestion(
      pool, instrument.notes, instrument.stringCount, instrument.maxFret, Math.random, naturalsOnly, direction,
    );
    if (!q) { finish(); return; }
    countRef.current += 1;
    setQuestionNumber(countRef.current);
    const b = buildOrderBoard(q, instrument.openMidi);
    questionRef.current = q;
    boardRef.current = b;
    stepRef.current = 0;
    slipsRef.current = [];
    setQuestion(q);
    setBoard(b);
    setStep(0);
    setSlips([]);
    setWrongTile(null);
    questionStartRef.current = Date.now();
    lastHitRef.current = questionStartRef.current;
  }, [questionCount, pool, instrument, naturalsOnly, direction, finish]);

  const start = useCallback(() => {
    clearTimers();
    reset();
    sessionRef.current += 1;
    countRef.current = 0;
    runningRef.current = true;
    setRunning(true);
    beginRun(noteTime, questionCount);
    nextQuestion();
  }, [clearTimers, reset, beginRun, noteTime, questionCount, nextQuestion]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    setRunning(false);
    clearTimers();
  }, [clearTimers]);

  /** The learner tapped the tile at `(string, fret)`. */
  const tap = useCallback((string: number, fret: number) => {
    const q = questionRef.current;
    const b = boardRef.current;
    if (!runningRef.current || !q || !b) return;
    // Every tile is a playable note, right or wrong.
    playNoteSingle(string, fret);
    const total = b.runMidi.length;
    if (stepRef.current >= total) return; // scale done, waiting for the next

    const tileStep = b.stepAt.get(`${string}:${fret}`);
    if (tileStep != null && tileStep < stepRef.current) { haptic.tap(); return; } // already found
    if (tileStep === stepRef.current) {
      const now = Date.now();
      onCorrect((now - lastHitRef.current) / 1000, noteTime);
      lastHitRef.current = now;
      haptic.tap();
      stepRef.current += 1;
      setStep(stepRef.current);
      if (stepRef.current >= total) {
        const slipped = slipsRef.current.filter(Boolean).length;
        const correct = isScaleCorrect(total, slipped);
        if (correct) playCorrectChime();
        onAnswerRef.current?.({
          scaleTypeId: q.scaleTypeId,
          positionIndex: q.positionIndex,
          correct,
          seconds: (now - questionStartRef.current) / 1000,
        });
        const mySession = sessionRef.current;
        nextTimeoutRef.current = setTimeout(() => {
          if (sessionRef.current === mySession) nextQuestion();
        }, NEXT_SCALE_MS);
      }
      return;
    }

    // Out of order, or not in the scale — charged to the step being looked for.
    if (!slipsRef.current[stepRef.current]) {
      const next = [...slipsRef.current];
      next[stepRef.current] = true;
      slipsRef.current = next;
      setSlips(next);
    }
    onWrong();
    haptic.wrong();
    setWrongTile({ string, fret });
    if (wrongTimeoutRef.current != null) clearTimeout(wrongTimeoutRef.current);
    wrongTimeoutRef.current = setTimeout(() => setWrongTile(null), WRONG_FLASH_MS);
  }, [onCorrect, onWrong, noteTime, nextQuestion]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    running, question, board, step, slips, wrongTile,
    questionNumber, questionCount,
    session, start, stop, tap,
  };
}
