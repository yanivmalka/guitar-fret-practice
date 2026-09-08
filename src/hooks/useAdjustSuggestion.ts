import { useMemo, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { suggestAdjustment } from '../utils/progress';
import { nextDifficulty, prevDifficulty, type Difficulty } from './useSelector';
import type { HistoryEntry } from '../utils/music';

export type AdjustSuggestion = { direction: 'harder' | 'easier'; target: Difficulty };

interface Params {
  autoAdvance: boolean;
  useFretRange: boolean;
  difficulty: Difficulty;
  isPro: boolean;
  histKey: string;
  getEntriesForKey: (key: string) => HistoryEntry[];
}

// Adaptive suggestion (wishlist §3): once enough questions have been answered
// on the current settings combination, offer a one-tap move to a harder or
// easier difficulty based on recent accuracy for that combination. It's a hint
// layered over the Selector — the old Stage sequence is not revived. Suppressed
// while Auto Advance already marches difficulty on its own, while a precise Pro
// fret window pins difficulty to Full, and once dismissed for this exact
// combination (kept per-key in localStorage so it doesn't nag again).
export function useAdjustSuggestion({
  autoAdvance, useFretRange, difficulty, isPro, histKey, getEntriesForKey,
}: Params) {
  // Dismissals made this session, keyed by historyKey; the persisted copy in
  // localStorage (`sel_suggestDismissed_<key>`) is read in the memo below so a
  // dismissal survives a reload without an effect syncing state.
  const [suggestDismiss, setSuggestDismiss] = useState<Record<string, 'harder' | 'easier'>>({});
  const adjustSuggestion = useMemo<AdjustSuggestion | null>(() => {
    if (autoAdvance) return null;
    if (useFretRange && isPro) return null;
    const verdict = suggestAdjustment(getEntriesForKey(histKey));
    if (!verdict) return null;
    const dismissed = suggestDismiss[histKey]
      ?? loadSetting<'harder' | 'easier' | null>(`sel_suggestDismissed_${histKey}`, null);
    if (verdict === dismissed) return null;
    const target = verdict === 'harder'
      ? nextDifficulty(difficulty)
      : prevDifficulty(difficulty);
    // Already at the hardest / gentlest difficulty — v1 has nothing to offer
    // (widening the fret-range half is a documented future fallback).
    if (!target) return null;
    return { direction: verdict, target };
  }, [autoAdvance, useFretRange, difficulty, isPro, getEntriesForKey, histKey, suggestDismiss]);

  const dismissSuggestion = (direction: 'harder' | 'easier') => {
    saveSetting(`sel_suggestDismissed_${histKey}`, direction);
    setSuggestDismiss(m => ({ ...m, [histKey]: direction }));
  };

  return { adjustSuggestion, dismissSuggestion };
}
