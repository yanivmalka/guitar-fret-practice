import { useState, useRef, useCallback, useEffect } from 'react';
import type { HistoryEntry } from '../utils/music';

export function useHistory(stageId: number) {
  // Per-stage history retained across stage switches, keyed by stage id
  const [allHistory, setAllHistory] = useState<Record<number, HistoryEntry[]>>({});
  // Current session history (resets on start/switchStage)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Track which stages have ever been played (so we don't show "no stats" on first visit)
  const [everPlayed, setEverPlayed] = useState<Set<number>>(new Set());

  const stageIdRef = useRef(stageId);
  useEffect(() => { stageIdRef.current = stageId; }, [stageId]);

  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
    setAllHistory(prev => {
      const sid = stageIdRef.current;
      return { ...prev, [sid]: [...(prev[sid] ?? []), entry] };
    });
  }, []);

  const markPlayed = useCallback((id: number) => {
    setEverPlayed(prev => { const s = new Set(prev); s.add(id); return s; });
  }, []);

  const clearStage = useCallback((id: number) => {
    setHistory([]);
    setAllHistory(prev => { const u = { ...prev }; delete u[id]; return u; });
    setEverPlayed(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const resetSession = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, allHistory, everPlayed, addEntry, markPlayed, clearStage, resetSession };
}
