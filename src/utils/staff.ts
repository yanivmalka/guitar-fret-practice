// ── staff.ts — pure staff-notation theory (staff-reading-spec.md §3) ─────
//
// Maps a pitch to where it is written on a five-line staff. No React, no
// instrument state — the Staff reading domain (`src/learning/staffDrill.ts`)
// and the renderer (`components/StaffNotation.tsx`) both build on it.
//
// Positions count diatonic steps from the staff's BOTTOM line: 0 = bottom
// line, 1 = the space above it, 2 = the second line … 8 = the top line.
// Negative / above-8 positions sit on or between ledger lines.
//
// Guitar, bass and banjo are transposing instruments: their music is written
// one octave ABOVE the sounding pitch (the treble clef with a small 8 under
// it, and the bass clef read the same way). Mandolin and ukulele are written
// at pitch in the treble clef.

import type { AccidentalMode } from './music';
import type { InstrumentId } from './instruments';

export type Clef = 'treble' | 'bass';

export interface StaffSpec {
  clef: Clef;
  /** Semitones added to the sounding pitch to get the written one. */
  writtenShift: number;
  /** Draw the small "8" under the clef (an octave-transposing staff). */
  octaveMark: boolean;
}

export function staffSpecFor(instrumentId: InstrumentId): StaffSpec {
  switch (instrumentId) {
    case 'bass':
      return { clef: 'bass', writtenShift: 12, octaveMark: false };
    case 'guitar':
    case 'banjo':
      return { clef: 'treble', writtenShift: 12, octaveMark: true };
    default:
      return { clef: 'treble', writtenShift: 0, octaveMark: false };
  }
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** The sharp-spelled pitch-class name of a MIDI number ("C#"), matching the
 *  spelling of the instruments' note tables. */
export function pitchClassName(midi: number): string {
  return SHARP_NAMES[((midi % 12) + 12) % 12];
}

export function isNaturalMidi(midi: number): boolean {
  return !pitchClassName(midi).includes('#');
}

export interface SpelledPitch {
  letter: Letter;
  /** '' for a natural, otherwise the sign written before the note head. */
  accidental: '' | '#' | 'b';
  /** Scientific octave (middle C = C4 = MIDI 60). */
  octave: number;
}

/** Spell a MIDI pitch with the user's accidental preference: a black key is
 *  written as a sharp of the letter below or a flat of the letter above. */
export function spellPitch(midi: number, accidental: AccidentalMode): SpelledPitch {
  const pc = ((midi % 12) + 12) % 12;
  const name = (accidental === 'flats' ? FLAT_NAMES : SHARP_NAMES)[pc];
  return {
    letter: name[0] as Letter,
    accidental: name.length > 1 ? (name[1] as '#' | 'b') : '',
    octave: Math.floor(midi / 12) - 1,
  };
}

/** Diatonic step number of a spelled pitch (C0 = 0, D0 = 1 … C4 = 28). */
function diatonicStep(p: SpelledPitch): number {
  return p.octave * 7 + LETTERS.indexOf(p.letter);
}

/** The bottom line of each clef: E4 for treble, G2 for bass. */
const BOTTOM_LINE_STEP: Record<Clef, number> = {
  treble: 4 * 7 + 2,
  bass: 2 * 7 + 4,
};

/** Where a WRITTEN pitch sits on the staff (0 = bottom line). */
export function staffPosition(writtenMidi: number, clef: Clef, accidental: AccidentalMode): number {
  return diatonicStep(spellPitch(writtenMidi, accidental)) - BOTTOM_LINE_STEP[clef];
}

/** The ledger-line positions a note at `position` needs — every line
 *  between the staff and the note, plus the note's own line. */
export function ledgerLines(position: number): number[] {
  const out: number[] = [];
  for (let p = -2; p >= position; p -= 2) out.push(p);
  for (let p = 10; p <= position; p += 2) out.push(p);
  return out;
}
