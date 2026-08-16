import { useState, useCallback, useRef } from 'react';

export interface SessionScore {
  score: number;
  streak: number;
  longestStreak: number;
  multiplier: number;
  lastPoints: number;      // points from last answer (for display)
  lastLabel: string;       // "PERFECT", "LIGHTNING", "", etc.
}

const MULTIPLIERS = [1, 1.2, 1.4, 1.6, 1.8, 2.0]; // streak 0,1,2,3,4,5+

function getMultiplier(streak: number): number {
  return MULTIPLIERS[Math.min(streak, MULTIPLIERS.length - 1)];
}

function getSpeedLabel(seconds: number, total: number): string {
  const pct = seconds / total;
  if (pct < 0.2) return '⚡ LIGHTNING';
  if (pct < 0.4) return '⚡ PERFECT';
  if (pct > 0.85) return '⏱ Close!';
  return '';
}

export function useScoring(totalTime: number) {
  const [session, setSession] = useState<SessionScore>({
    score: 0, streak: 0, longestStreak: 0, multiplier: 1, lastPoints: 0, lastLabel: '',
  });
  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;

  const reset = useCallback(() => {
    setSession({ score: 0, streak: 0, longestStreak: 0, multiplier: 1, lastPoints: 0, lastLabel: '' });
  }, []);

  const onCorrect = useCallback((seconds: number) => {
    setSession(prev => {
      const time = totalTimeRef.current;
      // Base points: 100 scaled by remaining time percentage
      const speedRatio = Math.max(0, (time - seconds) / time);
      const basePoints = Math.round(100 * speedRatio);

      const newStreak = prev.streak + 1;
      const mult = getMultiplier(newStreak);
      const points = Math.round(basePoints * mult);
      const label = getSpeedLabel(seconds, time);

      return {
        score: prev.score + points,
        streak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        multiplier: mult,
        lastPoints: points,
        lastLabel: label,
      };
    });
  }, []);

  const onWrong = useCallback(() => {
    setSession(prev => ({
      ...prev,
      streak: 0,
      multiplier: 1,
      lastPoints: 0,
      lastLabel: '',
    }));
  }, []);

  const onTimeout = useCallback(() => {
    setSession(prev => ({
      ...prev,
      streak: 0,
      multiplier: 1,
      lastPoints: 0,
      lastLabel: '',
    }));
  }, []);

  return { session, reset, onCorrect, onWrong, onTimeout };
}
