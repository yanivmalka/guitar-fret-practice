// ── intervals.ts — interval music theory for the P4 interval drill ───────
//
// Pure, no React, no storage. The one place that knows how an ascending
// interval maps to a distance in semitones, to a target note name, and to
// target positions on the neck. `useGameEngine`'s interval branch and
// `src/learning/intervalDrill.ts` build on this; nothing here imports either.
//
// Deliberately notes-only and ascending-only for the first vertical slice
// (premium-product-plan.md §9 P4). Descending intervals, compound intervals
// and enharmonic spelling by key are later refinements.

import { notesMatch } from './music';
import { CHROMATIC } from './instruments';

/** An ascending interval quality, m2 … M7. */
export interface IntervalDef {
  /** Ascending distance in semitones, 1 (m2) … 11 (M7). This is also the
   *  identity the SRS schedule keys on — see `src/learning/intervalItem.ts`. */
  semitones: number;
  /** Compact label, e.g. `'M3'`, `'P5'`, `'TT'`. */
  short: string;
  /** English name; doubles as the i18n lookup key (see `translations.ts`). */
  nameKey: string;
}

export const INTERVALS: readonly IntervalDef[] = [
  { semitones: 1, short: 'm2', nameKey: 'Minor 2nd' },
  { semitones: 2, short: 'M2', nameKey: 'Major 2nd' },
  { semitones: 3, short: 'm3', nameKey: 'Minor 3rd' },
  { semitones: 4, short: 'M3', nameKey: 'Major 3rd' },
  { semitones: 5, short: 'P4', nameKey: 'Perfect 4th' },
  { semitones: 6, short: 'TT', nameKey: 'Tritone' },
  { semitones: 7, short: 'P5', nameKey: 'Perfect 5th' },
  { semitones: 8, short: 'm6', nameKey: 'Minor 6th' },
  { semitones: 9, short: 'M6', nameKey: 'Major 6th' },
  { semitones: 10, short: 'm7', nameKey: 'Minor 7th' },
  { semitones: 11, short: 'M7', nameKey: 'Major 7th' },
] as const;

const BY_SEMITONES = new Map(INTERVALS.map((i) => [i.semitones, i]));

/** All interval sizes this slice drills, ascending. */
export const ALL_INTERVAL_SEMITONES: readonly number[] = INTERVALS.map((i) => i.semitones);

export function intervalBySemitones(semitones: number): IntervalDef | undefined {
  return BY_SEMITONES.get(semitones);
}

/** How the two answer surfaces differ for an interval question. */
export type IntervalForm =
  /** "M6 above ◉" — a reference fret is shown; tap the target fret. Reuses the
   *  by-note flow. */
  | 'onNeck'
  /** "Perfect 5th above G" — tap the note on the NoteCircle. Reuses the
   *  by-fret flow. */
  | 'byName';

/** The optional interval question spec a `DrillConfig` / `GameSettings` may
 *  carry. Absent ⇒ the engine behaves exactly as it did before intervals. */
export interface IntervalDrillSpec {
  /** Interval sizes (semitones) the drill may ask, in preference order. */
  semitones: number[];
  /** Ascending only for the first slice. */
  direction: 'up';
  form: IntervalForm;
}

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

function pitchClassIndex(noteName: string): number {
  const i = CHROMATIC.indexOf(noteName);
  if (i >= 0) return i;
  return CHROMATIC.indexOf(FLAT_TO_SHARP[noteName] ?? noteName);
}

/**
 * The sharp-spelled note name `semitones` above `rootName` (octave-equivalent).
 * Returns `rootName` unchanged if it is not a recognised pitch class.
 */
export function noteNameAtSemitones(rootName: string, semitones: number): string {
  const idx = pitchClassIndex(rootName);
  if (idx < 0) return rootName;
  const step = ((semitones % 12) + 12) % 12;
  return CHROMATIC[(idx + step) % 12];
}

export interface NeckPos {
  /** 1-based string number. */
  string: number;
  /** Fret number, 0 = open. */
  fret: number;
}

/** Absolute MIDI pitch of a fretted position, given the instrument's open
 *  strings. */
export function positionMidi(pos: NeckPos, openMidi: readonly number[]): number {
  return (openMidi[pos.string - 1] ?? 0) + pos.fret;
}

/** Signed semitone distance from `a` to `b` (positive = `b` is higher). */
export function semitonesBetween(
  a: NeckPos,
  b: NeckPos,
  openMidi: readonly number[],
): number {
  return positionMidi(b, openMidi) - positionMidi(a, openMidi);
}

export interface FretWindow {
  /** 1-based string numbers in scope. */
  strings: number[];
  fretFrom: number;
  fretTo: number;
}

/**
 * Every position inside `window` whose note name is exactly `semitones` above
 * the note at `refPos` — octave-equivalent, matching how the by-note flow
 * already accepts any fret of the asked note. `noteTable` is the active
 * `[string-1][fret] -> name` table (`InstrumentConfig.notes`).
 */
export function targetPositionsForInterval(
  refPos: NeckPos,
  semitones: number,
  noteTable: readonly (readonly string[])[],
  window: FretWindow,
): NeckPos[] {
  const rootName = noteTable[refPos.string - 1]?.[refPos.fret];
  if (!rootName) return [];
  const targetName = noteNameAtSemitones(rootName, semitones);
  const out: NeckPos[] = [];
  for (const s of window.strings) {
    const row = noteTable[s - 1];
    if (!row) continue;
    for (let f = Math.max(0, window.fretFrom); f <= window.fretTo; f++) {
      if (f >= row.length) break;
      if (notesMatch(row[f], targetName)) out.push({ string: s, fret: f });
    }
  }
  return out;
}
