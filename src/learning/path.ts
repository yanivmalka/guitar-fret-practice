// ── path.ts — the Learning Path: a visible, ordered notes-only journey ────
//
// P3 (premium-product-plan.md §9 P3). A Path is a fixed sequence of
// **checkpoints**, each a cluster of NoteItems (fretboard positions) with a
// tiered goal expressed as "% of the cluster's positions mastered". It lives
// *alongside* the Selector — it never replaces it, and a Premium user can
// ignore it and free-drill (premium-product-plan.md ground rules, §3).
//
// Deliberately notes-only: no intervals / scales / chords / staff / pitch
// (task scope, §11 non-goals). A checkpoint's positions are derived from a
// plain neck region (strings + fret window + whether accidentals count), so
// the ladder works for any instrument's string count / neck length without
// per-instrument data.
//
// Only the **threshold math** from `src/game/` is reused — `StageGoal` /
// `StageTargets` and `evaluateStars` / `meetsGoal` (see
// premium-product-plan.md §13 / §16.1: the World / Stage / GameProgress
// framing is a separate, undecided concept and is NOT adopted here). Each
// checkpoint's `targets` are three ascending `minAccuracy` bars, and the
// metric compared against them is the checkpoint's mastered-position
// percentage, not a single drill run.

import type { StageTargets } from '../game/models';
import { noteItemId } from './noteItem';

/** How a checkpoint's note-name scope is restricted within its neck region. */
export type CheckpointScope =
  /** Natural notes only (no sharps / flats) — the beginner ladder. */
  | 'naturals'
  /** Every chromatic position in the region. */
  | 'all';

export interface CheckpointRegion {
  /** 1-based string numbers the checkpoint covers. A string past the active
   *  instrument's string count is simply skipped when the positions are
   *  materialised, so one ladder fits guitar (6) and bass (4). */
  strings: number[];
  /** Inclusive fret window, 0 = open string. `fretTo` past the neck is
   *  clamped to the instrument's `maxFret`. */
  fretFrom: number;
  fretTo: number;
  scope: CheckpointScope;
}

export interface Checkpoint {
  /** Stable slug, unique across the path (e.g. "open-naturals"). Keyed on by
   *  the persisted per-checkpoint star record and its sync merge. */
  id: string;
  /** Sort position in the path, ascending, 1-based. */
  order: number;
  /** The checkpoint's short name — a plain English string that doubles as its
   *  i18n key (the app convention; see `src/i18n/translations.ts`). The Path
   *  screen renders `t(title)`. */
  title: string;
  /** One-line "what this is" hint, same English-as-key convention. */
  blurb: string;
  region: CheckpointRegion;
  /** The three ascending mastered-percentage bars (see file header). Authored
   *  `oneStar ≤ twoStar ≤ threeStar` on `minAccuracy`. */
  targets: StageTargets;
}

// A gentle, conventional fretboard-learning order: open naturals, then the
// rest of open position, then the first five frets, then the first octave,
// then the whole neck — naturals first, accidentals folded in last. This is
// the "spine" the planner plans against (§9 P3); it is not meant to be an
// exhaustive curriculum.
export const PATH_CHECKPOINTS: readonly Checkpoint[] = [
  {
    id: 'open-naturals',
    order: 1,
    title: 'Open strings',
    blurb: 'The six open-string note names.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 0, scope: 'naturals' },
    targets: {
      oneStar: { minAccuracy: 50 },
      twoStar: { minAccuracy: 75 },
      threeStar: { minAccuracy: 95 },
    },
  },
  {
    id: 'open-position-naturals',
    order: 2,
    title: 'Open position naturals',
    blurb: 'Natural notes in the first three frets, every string.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 3, scope: 'naturals' },
    targets: {
      oneStar: { minAccuracy: 50 },
      twoStar: { minAccuracy: 75 },
      threeStar: { minAccuracy: 92 },
    },
  },
  {
    id: 'first-five-naturals',
    order: 3,
    title: 'First five frets — naturals',
    blurb: 'Every natural note from the nut through fret 5.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 5, scope: 'naturals' },
    targets: {
      oneStar: { minAccuracy: 55 },
      twoStar: { minAccuracy: 78 },
      threeStar: { minAccuracy: 92 },
    },
  },
  {
    id: 'first-octave-naturals',
    order: 4,
    title: 'First octave — naturals',
    blurb: 'All natural notes up to the 12th fret.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 12, scope: 'naturals' },
    targets: {
      oneStar: { minAccuracy: 55 },
      twoStar: { minAccuracy: 78 },
      threeStar: { minAccuracy: 90 },
    },
  },
  {
    id: 'first-five-all',
    order: 5,
    title: 'First five frets — all notes',
    blurb: 'Sharps and flats added, nut through fret 5.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 5, scope: 'all' },
    targets: {
      oneStar: { minAccuracy: 55 },
      twoStar: { minAccuracy: 75 },
      threeStar: { minAccuracy: 90 },
    },
  },
  {
    id: 'first-octave-all',
    order: 6,
    title: 'First octave — all notes',
    blurb: 'Every note name up to the 12th fret.',
    region: { strings: [1, 2, 3, 4, 5, 6], fretFrom: 0, fretTo: 12, scope: 'all' },
    targets: {
      oneStar: { minAccuracy: 55 },
      twoStar: { minAccuracy: 75 },
      threeStar: { minAccuracy: 88 },
    },
  },
] as const;

/** A note name with no sharp / flat. */
export function isNaturalNoteName(name: string): boolean {
  return !!name && !/[#b]/.test(name);
}

export interface CheckpointItem {
  itemId: string;
  string: number;
  fret: number;
}

/**
 * Materialise a checkpoint's positions for one instrument. Pure and
 * deterministic (string-major, then fret). Strings past `stringCount` and
 * frets past `maxFret` are dropped, so a checkpoint authored for six strings
 * still yields a sensible cluster on a four-string bass. `noteTable` is the
 * active `[string-1][fret] -> note name` table (`utils/music`'s `notes`),
 * passed in so this module stays pure and testable.
 */
export function checkpointItemIds(
  cp: Checkpoint,
  instrument: { stringCount: number; maxFret: number },
  noteTable: string[][],
): CheckpointItem[] {
  const out: CheckpointItem[] = [];
  const fretTo = Math.min(cp.region.fretTo, instrument.maxFret);
  for (const string of cp.region.strings) {
    if (string < 1 || string > instrument.stringCount) continue;
    const row = noteTable[string - 1];
    if (!row) continue;
    for (let fret = Math.max(0, cp.region.fretFrom); fret <= fretTo; fret++) {
      const name = row[fret];
      if (name == null) continue;
      if (cp.region.scope === 'naturals' && !isNaturalNoteName(name)) continue;
      out.push({ itemId: noteItemId(string, fret), string, fret });
    }
  }
  return out;
}
