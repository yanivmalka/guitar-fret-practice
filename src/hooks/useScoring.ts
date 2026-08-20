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

function getMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

function getSpeedBonus(elapsedSeconds: number, timeLimit: number): number {
  if (elapsedSeconds < timeLimit * 0.25) return 10;
  if (elapsedSeconds < timeLimit * 0.5) return 5;
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

  return { session, reset, onCorrect, onWrong, onTimeout };
}
