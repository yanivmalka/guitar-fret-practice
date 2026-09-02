import { useMemo } from 'react';
import { notes, getCofNotes, getStringStartIndex, getValidFrets } from '../utils/music';
import type { AccidentalMode, OrderMode } from '../utils/music';

export function useDerivedNotes(
  guitarString: number,
  fretFrom: number,
  fretTo: number,
  wholeToneOnly: boolean,
  dotsOnly: boolean,
  accidental: AccidentalMode,
  order: OrderMode,
  byString: boolean,
  multiStrings: number[],
  // Only a memo-invalidation key: the note-name table itself is the live
  // `notes` binding from utils/music (swapped by setActiveInstrument). Without
  // this, switching between two instruments that happen to share the same
  // string/fret numbers would keep stale note data.
  instrumentId: string,
) {
  // Clamp to the active instrument's string count: right after an instrument
  // switch a stale, larger string number can still arrive for one render
  // before the selector/App state catches up, and it would index past the new
  // (shorter) `notes` table.
  const clamp = (s: number) => Math.min(Math.max(s, 1), notes.length);
  const gs = clamp(guitarString);
  const isMulti = multiStrings.length > 0;
  const activeStrings = (isMulti ? multiStrings : [guitarString]).map(clamp);
  const activeStringsKey = activeStrings.join(',');

  // Always show full note list on circle — wholeToneOnly only disables non-whole notes, not hides them
  const cofList = getCofNotes(accidental, order, false);
  const startIndex = byString ? getStringStartIndex(accidental, order, false, gs - 1) : 0;

  const activeNotes = useMemo(() => {
    const noteSet = new Set<string>();
    activeStrings.forEach(s => {
      getValidFrets(s - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[s - 1][f]));
    });
    return noteSet;
  }, [activeStringsKey, fretFrom, fretTo, wholeToneOnly, dotsOnly, instrumentId]);

  const questionActiveNotes = useMemo(() => {
    const noteSet = new Set<string>();
    getValidFrets(gs - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[gs - 1][f]));
    return noteSet;
  }, [gs, fretFrom, fretTo, wholeToneOnly, dotsOnly, instrumentId]);

  const fretDots = useMemo(() => {
    const dotFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
    const result: Record<string, number[]> = {};
    getValidFrets(gs - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      if (dotFrets.includes(f)) {
        const note = notes[gs - 1][f];
        if (!result[note]) result[note] = [];
        result[note].push(f);
      }
    });
    return result;
  }, [gs, fretFrom, fretTo, wholeToneOnly, dotsOnly, instrumentId]);

  const noteFrets = useMemo(() => {
    const result: Record<string, number[]> = {};
    getValidFrets(gs - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      const note = notes[gs - 1][f];
      if (!result[note]) result[note] = [];
      result[note].push(f);
    });
    return result;
  }, [gs, fretFrom, fretTo, wholeToneOnly, dotsOnly, instrumentId]);

  return {
    cofList,
    startIndex,
    activeNotes,
    questionActiveNotes,
    fretDots,
    noteFrets,
    isMulti,
    activeStrings,
  };
}
