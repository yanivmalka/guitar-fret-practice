// ── scales.ts — scale music theory for the Scales Learning drill ────────
//
// Pure, no React, no storage. Mirrors intervals.ts's role for the Scales
// domain (scales-learning-spec.md §2, §4): the one place that knows a scale
// type's interval formula, its W/H step pattern, and how a movable neck
// "position" (box) resolves to concrete fret positions for a given root.
// Imports intervals.ts (`noteNameAtSemitones`) rather than duplicating its
// pitch-class math — a scale degree IS an interval above the root.
//
// Ships one scale type at a time (spec §4.2): this file currently holds Minor
// Pentatonic (slice 1) and Major (slice 2). Each later scale type is added as a new
// `ScaleTypeDef` row plus its `ScalePositionDef` rows — nothing else in this
// file changes shape for a new type.

import { noteNameAtSemitones } from './intervals';

/** One scale type's interval formula — mirrors `IntervalDef`. */
export interface ScaleTypeDef {
  /** Stable id, used in `scaleItemId` and as the SRS/curriculum key. */
  id: string;
  /** English name; doubles as the i18n lookup key (see `translations.ts`). */
  nameKey: string;
  /** Ascending semitone offsets from the root, root itself omitted (always 0),
   *  octave not included. */
  degrees: number[];
  /** Display label per degree, parallel to `degrees`, e.g. `['b3','4','5','b7']`. */
  degreeLabels: string[];
}

export const SCALE_TYPES: readonly ScaleTypeDef[] = [
  {
    id: 'minorPentatonic',
    nameKey: 'Minor Pentatonic',
    degrees: [3, 5, 7, 10],
    degreeLabels: ['b3', '4', '5', 'b7'],
  },
  {
    id: 'major',
    nameKey: 'Major',
    degrees: [2, 4, 5, 7, 9, 11],
    degreeLabels: ['2', '3', '4', '5', '6', '7'],
  },
] as const;

const BY_ID = new Map(SCALE_TYPES.map((s) => [s.id, s]));

export function scaleTypeById(id: string): ScaleTypeDef | undefined {
  return BY_ID.get(id);
}

/** The W/H step pattern between consecutive degrees (root → d1 → d2 → … →
 *  octave), derived from `degrees` — never authored separately, so the
 *  formula shown to the learner (spec §1.4) can never drift from the
 *  semitone data the engine actually drills. `'W'` = 2 semitones, `'H'` = 1,
 *  `'W+H'` = 3 (a step-and-a-half, e.g. pentatonic/blues). */
export type ScaleStep = 'W' | 'H' | 'W+H';

export function stepPattern(scale: ScaleTypeDef): ScaleStep[] {
  const bounds = [0, ...scale.degrees, 12];
  return bounds.slice(1).map((n, i) => {
    const gap = n - bounds[i];
    return gap === 2 ? 'W' : gap === 1 ? 'H' : 'W+H';
  });
}

/** A movable neck "position" (guitarists' box 1 / box 2) for one scale type —
 *  a window of frets around the root, on every string, rather than a
 *  hand-authored fret chart (spec §4.3). Generative, so the same definition
 *  works on every instrument without per-instrument authoring. */
export interface ScalePositionDef {
  scaleTypeId: string;
  /** 1-based; which occurrence of the root, low to high. */
  positionIndex: number;
  /** Which string this position's root sits on — this, not a fret chart, is
   *  what makes "position 1" different from "position 2". */
  rootString: number;
  /** Fret window around the root fret, inclusive, e.g. `{ from: -1, to: 3 }`. */
  window: { from: number; to: number };
}

/** Position 1 roots on the instrument's lowest string (highest index in the
 *  `notes` table); position 2 on the next string up — same window shape,
 *  applied to a different `rootString` (spec §17 OD-S4). `rootString` here is
 *  a *count from the lowest string*, resolved against the active instrument's
 *  `stringCount` by `scalePositionsFor`, since string count varies by
 *  instrument/variant. */
export interface ScalePositionSpec {
  scaleTypeId: string;
  positionIndex: number;
  /** 0 = the lowest string, 1 = the next string up, … */
  fromLowestString: number;
  window: { from: number; to: number };
}

export const SCALE_POSITION_SPECS: readonly ScalePositionSpec[] = [
  { scaleTypeId: 'minorPentatonic', positionIndex: 1, fromLowestString: 0, window: { from: -1, to: 3 } },
  { scaleTypeId: 'minorPentatonic', positionIndex: 2, fromLowestString: 1, window: { from: -1, to: 3 } },
  { scaleTypeId: 'major', positionIndex: 1, fromLowestString: 0, window: { from: -1, to: 3 } },
  { scaleTypeId: 'major', positionIndex: 2, fromLowestString: 1, window: { from: -1, to: 3 } },
] as const;

/** Resolve every `ScalePositionSpec` for `scaleTypeId` against a concrete
 *  `stringCount` into 1-based `rootString` values (string 1 = highest-pitched,
 *  matching `InstrumentConfig.notes` row order). */
export function scalePositionsFor(scaleTypeId: string, stringCount: number): ScalePositionDef[] {
  return SCALE_POSITION_SPECS
    .filter((s) => s.scaleTypeId === scaleTypeId)
    .map((s) => ({
      scaleTypeId: s.scaleTypeId,
      positionIndex: s.positionIndex,
      rootString: stringCount - s.fromLowestString,
      window: s.window,
    }))
    .filter((p) => p.rootString >= 1 && p.rootString <= stringCount);
}

export interface NeckPos {
  /** 1-based string number. */
  string: number;
  /** Fret number, 0 = open. */
  fret: number;
}

/** Every neck position inside `position`'s window, at the given root fret,
 *  whose note is one of `scale`'s pitch classes above `rootFret`'s note.
 *  `noteTable` is the active `[string-1][fret] -> name` table
 *  (`InstrumentConfig.notes`), exactly as `targetPositionsForInterval` takes
 *  it. Returns `null` if the window would leave the fretboard (root fret too
 *  low), so the question generator tries a different root. */
export function shapeAtRoot(
  scale: ScaleTypeDef,
  position: ScalePositionDef,
  rootFret: number,
  noteTable: readonly (readonly string[])[],
): NeckPos[] | null {
  const rootRow = noteTable[position.rootString - 1];
  const rootName = rootRow?.[rootFret];
  if (!rootName) return null;
  const lo = rootFret + position.window.from;
  const hi = rootFret + position.window.to;
  if (lo < 0) return null;
  const scaleTones = new Set(
    [0, ...scale.degrees].map((s) => noteNameAtSemitones(rootName, s)),
  );
  const out: NeckPos[] = [];
  for (let s = 1; s <= noteTable.length; s++) {
    const row = noteTable[s - 1];
    if (!row) continue;
    for (let f = Math.max(0, lo); f <= hi && f < row.length; f++) {
      if (scaleTones.has(row[f])) out.push({ string: s, fret: f });
    }
  }
  return out;
}
