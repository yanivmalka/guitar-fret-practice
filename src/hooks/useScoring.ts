import { useState, useRef, useCallback } from 'react';

export type Milestone = 3 | 5 | 10;

export interface ScoreResult {
  points: number;
  streak: number;
  multiplier: number;
  speedBonus: number;
  milestone: Milestone | null;
}

export interface SessionScore {
  score: number;
  streak: number;
  longestStreak: number;
  lastPoints: number;
  lastSpeedBonus: number;
  multiplier: number;
  questionsAnswered: number;
}

const INITIAL_SESSION: SessionScore = {
  score: 0,
  streak: 0,
  longestStreak: 0,
  lastPoints: 0,
  lastSpeedBonus: 0,
  multiplier: 1,
  questionsAnswered: 0,
};

// Streak tiers for the score multiplier (1×, 1.25×, 1.5×, 2×, 2.5×, 3×, 4×
// at streaks 0, 3, 5, 7, 10, 15, 20). The per-question timer no longer uses
// these tiers — see getQuestionTime below.
const STREAK_TIERS = [
  { min: 0, multiplier: 1 },
  { min: 3, multiplier: 1.25 },
  { min: 5, multiplier: 1.5 },
  { min: 7, multiplier: 2 },
  { min: 10, multiplier: 2.5 },
  { min: 15, multiplier: 3 },
  { min: 20, multiplier: 4 },
] as const;

// Absolute floor: no difficulty/streak combination is ever squeezed below this.
const MIN_QUESTION_TIME = 3;

function getTier(streak: number): (typeof STREAK_TIERS)[number] {
  let tier: (typeof STREAK_TIERS)[number] = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) if (streak >= t.min) tier = t;
  return tier;
}

function getMultiplier(streak: number): number {
  return getTier(streak).multiplier;
}

// ── Per-question time limit: one linear ramp across the WHOLE run ───────────
//
// Timing is a single linear progression driven by `runStreak` — consecutive
// correct answers across the *entire* run, including across Auto Advance stage
// boundaries — so speed does not jump just because a new stage begins.
//
// Fixed for the whole run (set once by `beginRun`, at manual Play):
//   • runBase      — base time of the difficulty the run STARTS on. For a
//                    manual single stage this is just that stage's base.
//   • runStepsToFloor = max(1, runQuestions - 2), where runQuestions is the
//                    total number of questions the run will ask (Auto Advance:
//                    sum over every stage from the starting difficulty to the
//                    last; otherwise just this stage's count).
//
// Per question:  p = min(runStreak, runStepsToFloor) / runStepsToFloor
//                rampTime = runBase - p * (runBase - MIN_QUESTION_TIME)
//                time     = max(MIN, round½( min(currentDifficultyBase, rampTime) ))
// `currentDifficultyBase` only clamps the ceiling so a stage never shows more
// than its own base; the ramp itself is one continuous line from runBase to
// MIN across all runQuestions.
//
// runStreak lifecycle (see useScoring below):
//   • Manual Play (beginRun): runStreak = 0  -> the run's first question is at
//     exactly runBase.
//   • Correct: runStreak += 1  (keeps counting across stage boundaries).
//   • Wrong / timeout: runStreak snaps back to the ramp point where rampTime
//     equals the CURRENT difficulty's base (= 0 on the first/only stage), so
//     the next question is at that base and the progression rebuilds from
//     there within the same run.
//   • Pause / Resume, Auto Advance boundary: untouched.
//   • Stop -> new Play: a fresh beginRun resets everything.

function computeQuestionTime(
  runBase: number,
  runStepsToFloor: number,
  currentDifficultyBase: number,
  runStreak: number,
): number {
  const p = Math.min(Math.max(0, runStreak), runStepsToFloor) / runStepsToFloor;
  const rampTime = runBase - p * (runBase - MIN_QUESTION_TIME);
  const rounded = Math.round(Math.min(currentDifficultyBase, rampTime) * 2) / 2; // 0.5s
  return Math.max(MIN_QUESTION_TIME, rounded);
}

// runStreak value a wrong/timeout resets to: the point on the global ramp where
// rampTime == the current difficulty's base (0 when currentBase == runBase).
function missResetStreak(
  runBase: number,
  runStepsToFloor: number,
  currentDifficultyBase: number,
): number {
  const frac = (runBase - currentDifficultyBase) / (runBase - MIN_QUESTION_TIME);
  return Math.round(Math.max(0, Math.min(1, frac)) * runStepsToFloor);
}

function getSpeedBonus(elapsedSeconds: number, timeLimit: number): number {
  const remainingFraction = 1 - elapsedSeconds / timeLimit;
  if (remainingFraction > 0.75) return 50;
  if (remainingFraction >= 0.5) return 25;
  if (remainingFraction >= 0.25) return 10;
  return 0;
}

function getMilestone(streak: number): Milestone | null {
  return streak === 3 || streak === 5 || streak === 10 ? streak : null;
}

export function useScoring() {
  const sessionRef = useRef<SessionScore>(INITIAL_SESSION);
  const [session, setSession] = useState<SessionScore>(INITIAL_SESSION);

  // Timing progression (refs only — read inside game-loop callbacks, never
  // rendered directly). See the timing model comment above.
  const runStreakRef = useRef(0);            // consecutive correct across the whole run
  const runBaseRef = useRef(0);              // base time of the difficulty the run started on
  const runStepsToFloorRef = useRef(1);      // = max(1, total run questions - 2)
  const currentBaseRef = useRef(0);          // current difficulty's base (last asked question)

  const reset = useCallback(() => {
    sessionRef.current = INITIAL_SESSION;
    setSession(INITIAL_SESSION);
    runStreakRef.current = 0;
  }, []);

  // Called once from App.start() when a run begins. `runBase` is the starting
  // difficulty's base time; `runQuestions` is the total questions the run will
  // ask (all Auto Advance stages summed, or just this stage).
  const beginRun = useCallback((runBase: number, runQuestions: number) => {
    runBaseRef.current = runBase;
    currentBaseRef.current = runBase;
    runStepsToFloorRef.current = Math.max(1, runQuestions - 2);
    runStreakRef.current = 0;
  }, []);

  // Time limit for the question about to be asked. `baseTime` is the CURRENT
  // difficulty's base (changes at each Auto Advance boundary); it is recorded
  // so a subsequent miss knows which base to reset the ramp to.
  const getQuestionTime = useCallback((baseTime: number): number => {
    currentBaseRef.current = baseTime;
    return computeQuestionTime(
      runBaseRef.current, runStepsToFloorRef.current, baseTime, runStreakRef.current,
    );
  }, []);

  const onCorrect = useCallback((elapsedSeconds: number, timeLimit: number): ScoreResult => {
    const previous = sessionRef.current;
    runStreakRef.current += 1;
    const streak = previous.streak + 1;
    const speedBonus = getSpeedBonus(elapsedSeconds, timeLimit);
    const multiplier = getMultiplier(streak);
    const points = Math.round((10 + speedBonus) * multiplier);
    const next: SessionScore = {
      score: previous.score + points,
      streak,
      longestStreak: Math.max(previous.longestStreak, streak),
      lastPoints: points,
      lastSpeedBonus: speedBonus,
      multiplier,
      questionsAnswered: previous.questionsAnswered + 1,
    };

    sessionRef.current = next;
    setSession(next);
    return { points, streak, multiplier, speedBonus, milestone: getMilestone(streak) };
  }, []);

  // Shared by wrong answer and timeout: break the multiplier streak and snap
  // the timing ramp back to the current difficulty's base, so the next
  // question is at that base and the progression rebuilds from there within
  // the same continuous run.
  const registerMiss = useCallback(() => {
    runStreakRef.current = missResetStreak(
      runBaseRef.current, runStepsToFloorRef.current, currentBaseRef.current,
    );
    const next: SessionScore = {
      ...sessionRef.current,
      streak: 0,
      lastPoints: 0,
      lastSpeedBonus: 0,
      multiplier: 1,
      questionsAnswered: sessionRef.current.questionsAnswered + 1,
    };
    sessionRef.current = next;
    setSession(next);
  }, []);

  const onWrong = registerMiss;
  const onTimeout = registerMiss;

  return { session, reset, beginRun, onCorrect, onWrong, onTimeout, getQuestionTime };
}
