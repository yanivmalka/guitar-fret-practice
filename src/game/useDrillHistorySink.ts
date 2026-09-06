// ── useDrillHistorySink — an isolated HistoryOps for the Game ──────────────
//
// `useDrillSession` (and the engine underneath it) records every answered
// question by calling the `HistoryOps` it is handed. Practice passes an
// adapter over `useHistory`, which persists to `localStorage['selectorHistory']`
// and write-throughs to Supabase, and which also feeds Practice mastery /
// stats / personal-best / badges / leaderboard.
//
// The Game must not touch any of that. This hook supplies a `HistoryOps`
// whose entire backing store is one in-memory `HistoryEntry[]` in React
// state:
//   • `addEntry`   — appends to that array only.
//   • `resetSession` — clears it (the engine calls this on every `start()`).
//   • `markPlayed` — a deliberate no-op. In Practice this marks a selector
//     combination as "ever played" and drives first-play UI; the Game has no
//     such notion and must never write Practice's `everPlayed` set.
//   • `history`    — the array itself, which is all `computeSessionResult`
//     needs to derive the run's `SessionResult`.
//
// Nothing here reads or writes localStorage, the network, or any Practice
// module.

import { useCallback, useMemo, useState } from 'react';
import type { HistoryEntry } from '../utils/music';
import type { HistoryOps } from '../hooks/useGameEngine';

export function useDrillHistorySink(): HistoryOps {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry]);
  }, []);

  const resetSession = useCallback(() => {
    setHistory([]);
  }, []);

  const markPlayed = useCallback(() => {
    /* intentionally empty — see the module comment */
  }, []);

  return useMemo<HistoryOps>(
    () => ({ history, addEntry, markPlayed, resetSession }),
    [history, addEntry, markPlayed, resetSession],
  );
}
