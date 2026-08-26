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

// Streak tiers shared by the score multiplier and the per-question timer
// (useGameEngine scales the difficulty's base time by `timeRatio`, then
// clamps to a 3s floor so no difficulty can be squeezed below playable).
const STREAK_TIERS = [
  { min: 0, multiplier: 1, timeRatio: 1 },
  { min: 3, multiplier: 1.25, timeRatio: 0.875 },
  { min: 5, multiplier: 1.5, timeRatio: 0.75 },
  { min: 7, multiplier: 2, timeRatio: 0.625 },
  { min: 10, multiplier: 2.5, timeRatio: 0.5 },
  { min: 15, multiplier: 3, timeRatio: 0.4375 },
  { min: 20, multiplier: 4, timeRatio: 0.375 },
] as const;

const MIN_QUESTION_TIME = 3;

function getTier(streak: number): (typeof STREAK_TIERS)[number] {
  let tier: (typeof STREAK_TIERS)[number] = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) if (streak >= t.min) tier = t;
  return tier;
}

function getMultiplier(streak: number): number {
  return getTier(streak).multiplier;
}

export function getQuestionTime(baseTime: number, streak: number): number {
  const raw = baseTime * getTier(streak).timeRatio;
  const rounded = Math.round(raw * 2) / 2;
  return Math.max(MIN_QUESTION_TIME, rounded);
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

  const reset = useCallback(() => {
    sessionRef.current = INITIAL_SESSION;
    setSession(INITIAL_SESSION);
  }, []);

  const onCorrect = useCallback((elapsedSeconds: number, timeLimit: number): ScoreResult => {
    const previous = sessionRef.current;
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

  const onWrong = useCallback(() => {
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

  const onTimeout = useCallback(() => {
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

  const getStreak = useCallback(() => sessionRef.current.streak, []);

  return { session, reset, onCorrect, onWrong, onTimeout, getStreak };
}
