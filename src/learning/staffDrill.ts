// ── staffDrill.ts — the Staff reading question pool and picker ───────────
//
// staff-reading-spec.md §5–§7. Pure: builds the set of pitches a session may
// ask (every pitch playable inside the chosen fret range, on any string) and
// picks the next one, favouring pitches the learner's own staff SRS says are
// due or new. The clef / octave shift come from `utils/staff.ts`.

import { isNaturalMidi, pitchClassName } from '../utils/staff';
import type { SrsMap } from './srs';
import { staffItemId } from './staffItem';

export type StaffRange = 'open' | 'low' | 'twelve';
export const STAFF_RANGES: readonly StaffRange[] = ['open', 'low', 'twelve'];
export const STAFF_RANGE_TOP_FRET: Record<StaffRange, number> = { open: 3, low: 5, twelve: 12 };

export interface StaffInstrument {
  /** MIDI of each open string, `[0]` = the highest-pitched string (string 1). */
  openMidi: readonly number[];
  maxFret: number;
  /** Per-string lowest playable fret (banjo's short drone string). */
  minFrets?: readonly number[];
}

export interface StaffPosition {
  /** 1-based string number, 1 = highest-pitched. */
  string: number;
  fret: number;
}

export interface StaffPoolItem {
  /** Sounding pitch. */
  midi: number;
  itemId: string;
  /** Every place on the neck, inside the range, that plays this pitch. */
  positions: StaffPosition[];
}

export function staffTopFret(range: StaffRange, maxFret: number): number {
  return Math.min(STAFF_RANGE_TOP_FRET[range], maxFret);
}

/** Every pitch playable in frets 0…top of `range`, ascending. */
export function buildStaffPool(
  inst: StaffInstrument,
  range: StaffRange,
  naturalsOnly: boolean,
): StaffPoolItem[] {
  const top = staffTopFret(range, inst.maxFret);
  const byMidi = new Map<number, StaffPosition[]>();
  inst.openMidi.forEach((open, idx) => {
    const from = inst.minFrets?.[idx] ?? 0;
    for (let fret = from; fret <= top; fret++) {
      const midi = open + fret;
      if (naturalsOnly && !isNaturalMidi(midi)) continue;
      const list = byMidi.get(midi) ?? [];
      list.push({ string: idx + 1, fret });
      byMidi.set(midi, list);
    }
  });
  return [...byMidi.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([midi, positions]) => ({ midi, itemId: staffItemId(midi), positions }));
}

/** The answer chips for "name the note": the seven naturals, or all twelve
 *  pitch classes, as sharp-spelled values in C…B order. */
export function staffNameOptions(naturalsOnly: boolean): string[] {
  const out: string[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const name = pitchClassName(pc);
    if (naturalsOnly && name.includes('#')) continue;
    out.push(name);
  }
  return out;
}

/**
 * Pick the next pitch. Weighted toward what the schedule wants: a due pitch
 * weighs 4, a never-seen one 3, anything else 1. Never repeats the previous
 * pitch while the pool has another to offer.
 */
export function pickStaffQuestion(
  pool: readonly StaffPoolItem[],
  srs: SrsMap,
  previousMidi: number | null,
  now: number,
  rng: () => number = Math.random,
): StaffPoolItem | null {
  const candidates = pool.length > 1 ? pool.filter((p) => p.midi !== previousMidi) : [...pool];
  if (candidates.length === 0) return null;
  const weights = candidates.map((p) => {
    const item = srs[p.itemId];
    if (!item) return 3;
    return item.dueAt <= now ? 4 : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
