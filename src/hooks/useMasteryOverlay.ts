import { useMemo } from 'react';
import type { HistoryEntry } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  historyForInstrument, flattenHistory, fretMasteryMap, noteMasteryMap,
  applyMasteryWindow, FREE_MASTERY_WINDOW,
  type MasteryStat, type MasteryWindow,
} from '../utils/mastery';

interface Params {
  allHistory: Record<string, HistoryEntry[]>;
  instrument: InstrumentConfig;
  safeGuitarString: number;
  cofList: string[];
  masteryWindow: MasteryWindow;
  isPro: boolean;
}

// All-time (every settings combo ever played) mastery, shown as a small
// equalizer-style overlay on the fretboard/note-circle: frets on the current
// string, and each note across all strings. The overlay is free for everyone
// (spec free-pro-tiering §5.2) — Free users see it computed from
// FREE_MASTERY_WINDOW (last 250 questions); Pro users pick the window via the
// "questions counted" control in Settings.
export function useMasteryOverlay({
  allHistory, instrument, safeGuitarString, cofList, masteryWindow, isPro,
}: Params) {
  const allHistoryEntries = useMemo(
    () => historyForInstrument(allHistory, instrument.id),
    [allHistory, instrument.id],
  );
  // Every instrument's history flattened — feeds the player-progress badges
  // (Century, streaks, accuracy…), which are not scoped to the current one.
  const everyInstrumentHistory = useMemo(
    () => flattenHistory(allHistory),
    [allHistory],
  );

  const effectiveMasteryWindow = isPro ? masteryWindow : FREE_MASTERY_WINDOW;
  const windowedMasteryEntries = useMemo(
    () => applyMasteryWindow(allHistoryEntries, effectiveMasteryWindow),
    [allHistoryEntries, effectiveMasteryWindow],
  );
  const fretMastery = useMemo<Record<number, MasteryStat>>(
    () => fretMasteryMap(windowedMasteryEntries, safeGuitarString),
    [windowedMasteryEntries, safeGuitarString],
  );
  const noteMastery = useMemo<Record<string, MasteryStat>>(
    () => noteMasteryMap(windowedMasteryEntries, cofList),
    [windowedMasteryEntries, cofList],
  );

  return { allHistoryEntries, everyInstrumentHistory, fretMastery, noteMastery };
}
