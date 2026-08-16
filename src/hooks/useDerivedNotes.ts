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
) {
  const isMulti = multiStrings.length > 0;
  const activeStrings = isMulti ? multiStrings : [guitarString];

  // Always show full note list on circle — wholeToneOnly only disables non-whole notes, not hides them
  const cofList = getCofNotes(accidental, order, false);
  const startIndex = byString ? getStringStartIndex(accidental, order, false, guitarString - 1) : 0;

  const activeNotes = useMemo(() => {
    const noteSet = new Set<string>();
    activeStrings.forEach(s => {
      getValidFrets(s - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[s - 1][f]));
    });
    return noteSet;
  }, [JSON.stringify(activeStrings), fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const questionActiveNotes = useMemo(() => {
    const noteSet = new Set<string>();
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[guitarString - 1][f]));
    return noteSet;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const fretDots = useMemo(() => {
    const dotFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    const result: Record<string, number[]> = {};
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      if (dotFrets.includes(f)) {
        const note = notes[guitarString - 1][f];
        if (!result[note]) result[note] = [];
        result[note].push(f);
      }
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const noteFrets = useMemo(() => {
    const result: Record<string, number[]> = {};
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      const note = notes[guitarString - 1][f];
      if (!result[note]) result[note] = [];
      result[note].push(f);
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

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
