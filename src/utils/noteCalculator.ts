import type { InstrumentConfig } from '../utils/instruments';

/**
 * Calculate the number of unique notes available for given strings and fret range.
 * This respects the instrument's note table structure.
 */
export function calculateUniqueNotes(
  instrument: InstrumentConfig,
  selectedStrings: number[],
  fretLo: number,
  fretHi: number,
): number {
  const noteSet = new Set<string>();
  
  // For each selected string, add all notes in the fret range
  selectedStrings.forEach(stringNum => {
    const stringIdx = stringNum - 1;
    if (stringIdx < 0 || stringIdx >= instrument.notes.length) return;
    
    const row = instrument.notes[stringIdx];
    for (let f = fretLo; f <= fretHi; f++) {
      if (f >= 0 && f < row.length) {
        noteSet.add(row[f]);
      }
    }
  });
  
  return noteSet.size;
}

/**
 * Calculate the minimum fret range needed to get at least `minNotes` unique notes
 * for the given string selection. Returns [lo, hi] or null if impossible.
 */
export function calculateMinimalFretRange(
  instrument: InstrumentConfig,
  selectedStrings: number[],
  minNotes: number,
): [number, number] | null {
  const maxFret = instrument.maxFret;
  
  // Try each possible window size, starting from 0 and expanding
  for (let windowSize = 0; windowSize <= maxFret; windowSize++) {
    // Try each possible starting position
    for (let lo = 0; lo + windowSize <= maxFret; lo++) {
      const hi = lo + windowSize;
      const uniqueNotes = calculateUniqueNotes(instrument, selectedStrings, lo, hi);
      
      if (uniqueNotes >= minNotes) {
        return [lo, hi];
      }
    }
  }
  
  return null;
}
