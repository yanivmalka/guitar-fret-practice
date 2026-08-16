import { useState, useCallback } from 'react';

export interface SessionScore {
  score: number;
  streak: number;
  longestStreak: number;
  lastPoints: number;
  questionsAnswered: number;
}

export function useScoring() {
  const [session, setSession] = useState<SessionScore>({
    score: 0, streak: 0, longestStreak: 0, lastPoints: 0, questionsAnswered: 0,
  });

  const reset = useCallback(() => {
    setSession({ score: 0, streak: 0, longestStreak: 0, lastPoints: 0, questionsAnswered: 0 });
  }, []);

  const onCorrect = useCallback(() => {
    setSession(prev => {
      const newStreak = prev.streak + 1;
      // 10 base + 2 per streak level (capped at streak 10 = +20 bonus)
      const bonus = Math.min(newStreak - 1, 10) * 2;
      const points = 10 + bonus;
      return {
        score: prev.score + points,
        streak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastPoints: points,
        questionsAnswered: prev.questionsAnswered + 1,
      };
    });
  }, []);

  const onWrong = useCallback(() => {
    setSession(prev => ({
      ...prev,
      streak: 0,
      lastPoints: 0,
      questionsAnswered: prev.questionsAnswered + 1,
    }));
  }, []);

  const onTimeout = useCallback(() => {
    setSession(prev => ({
      ...prev,
      streak: 0,
      lastPoints: 0,
      questionsAnswered: prev.questionsAnswered + 1,
    }));
  }, []);

  return { session, reset, onCorrect, onWrong, onTimeout };
}
