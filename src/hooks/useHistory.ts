import { useState, useCallback, useEffect } from 'react';
import type { HistoryEntry } from '../utils/music';

export function useHistory() {
  // All history keyed by selector-derived string key (e.g. "6|0-12|byFret|dots")
  const [allHistory, setAllHistory] = useState<Record<string, HistoryEntry[]>>(() => {
    try {
      const raw = localStorage.getItem('selectorHistory');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Current session history (resets on start/switch)
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Track which keys have ever been played
  const [everPlayed, setEverPlayed] = useState<Set<string>>(new Set());

  // Persist allHistory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectorHistory', JSON.stringify(allHistory));
  }, [allHistory]);

  const addEntry = useCallback((key: string, entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
    setAllHistory(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), entry],
    }));
  }, []);

  const markPlayed = useCallback((key: string) => {
    setEverPlayed(prev => { const s = new Set(prev); s.add(key); return s; });
  }, []);

  const clearHistory = useCallback((key: string) => {
    setHistory([]);
    setAllHistory(prev => { const u = { ...prev }; delete u[key]; return u; });
  }, []);

  const resetSession = useCallback(() => {
    setHistory([]);
  }, []);

  const getEntriesForKey = useCallback((key: string): HistoryEntry[] => {
    return allHistory[key] ?? [];
  }, [allHistory]);

  return { history, allHistory, everPlayed, addEntry, markPlayed, clearHistory, resetSession, getEntriesForKey };
}
