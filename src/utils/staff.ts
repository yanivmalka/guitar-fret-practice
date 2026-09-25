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

// ── Key signatures (staff-reading-spec.md §3.1) ────────────────────────
//
// The keys offered go up to four sharps / four flats. In every one of them
// the plain sharp-or-flat spelling of each pitch class is already the
// correct one (no E♯ / C♭ needed), so a key simply decides which way black
// keys are spelled and which letters are altered by default.

export type KeyId = 'C' | 'G' | 'D' | 'A' | 'E' | 'F' | 'Bb' | 'Eb' | 'Ab';
export const KEY_IDS: readonly KeyId[] = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'];

/** Signed count: +n sharps, −n flats. */
const KEY_ACCIDENTALS: Record<KeyId, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, F: -1, Bb: -2, Eb: -3, Ab: -4,
};
const KEY_TONIC_PC: Record<KeyId, number> = {
  C: 0, G: 7, D: 2, A: 9, E: 4, F: 5, Bb: 10, Eb: 3, Ab: 8,
};
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

/** The sign drawn in front of a note head — `n` is a natural (♮). */
export type StaffSign = '' | '#' | 'b' | 'n';

export function keyAccidentalCount(key: KeyId): number {
  return KEY_ACCIDENTALS[key];
}

/** How black keys are spelled in `key`; C major follows the app setting. */
export function keySpelling(key: KeyId, fallback: AccidentalMode): AccidentalMode {
  const n = KEY_ACCIDENTALS[key];
  return n > 0 ? 'sharps' : n < 0 ? 'flats' : fallback;
}

/** The seven pitch classes of the (major) key, as numbers 0–11. */
export function keyPitchClasses(key: KeyId): Set<number> {
  return new Set(MAJOR_STEPS.map((s) => (KEY_TONIC_PC[key] + s) % 12));
}

/** Letter → the alteration the key signature gives it ('' when none). */
export function keyLetterAccidentals(key: KeyId): Record<Letter, '' | '#' | 'b'> {
  const out = { C: '', D: '', E: '', F: '', G: '', A: '', B: '' } as Record<Letter, '' | '#' | 'b'>;
  const n = KEY_ACCIDENTALS[key];
  const order = n > 0 ? SHARP_ORDER : FLAT_ORDER;
  for (let i = 0; i < Math.abs(n); i++) out[order[i]] = n > 0 ? '#' : 'b';
  return out;
}

// Where each sign of the signature sits, in the conventional order. Treble
// positions (0 = bottom line E4); the bass clef is the same shape two steps
// lower.
const TREBLE_SHARP_POS = [8, 5, 9, 6, 3, 7, 4];
const TREBLE_FLAT_POS = [4, 7, 3, 6, 2, 5, 1];

export function keySignaturePositions(key: KeyId, clef: Clef): { position: number; sign: '#' | 'b' }[] {
  const n = KEY_ACCIDENTALS[key];
  const table = n > 0 ? TREBLE_SHARP_POS : TREBLE_FLAT_POS;
  const shift = clef === 'bass' ? -2 : 0;
  return table.slice(0, Math.abs(n)).map((p) => ({ position: p + shift, sign: n > 0 ? '#' : 'b' }));
}

/**
 * The sign to draw in front of each note of a passage in `key`. An
 * accidental holds for the rest of the passage (one bar) on that same
 * line/space, so a note needs a sign only when its alteration differs from
 * what is in force there — the key signature, or an earlier accidental.
 */
export function passageSigns(
  notes: readonly { position: number; accidental: '' | '#' | 'b'; letter: Letter }[],
  key: KeyId,
): StaffSign[] {
  const byKey = keyLetterAccidentals(key);
  const inForce = new Map<number, '' | '#' | 'b'>();
  return notes.map((n) => {
    const current = inForce.get(n.position) ?? byKey[n.letter];
    if (current === n.accidental) return '';
    inForce.set(n.position, n.accidental);
    return n.accidental === '' ? 'n' : n.accidental;
  });
}

const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * The WRITTEN pitch a note placed at `position` stands for, with `sign` in
 * front of it (`''` = whatever the key signature says). The inverse of
 * `staffPosition` — used by "Where is it written?".
 */
export function writtenMidiAt(position: number, clef: Clef, sign: StaffSign, key: KeyId): number {
  const step = position + BOTTOM_LINE_STEP[clef];
  const letter = LETTERS[((step % 7) + 7) % 7];
  const octave = Math.floor(step / 7);
  const alteration = sign === ''
    ? keyLetterAccidentals(key)[letter]
    : sign === 'n' ? '' : sign;
  const offset = alteration === '#' ? 1 : alteration === 'b' ? -1 : 0;
  return (octave + 1) * 12 + NATURAL_PC[letter] + offset;
}
