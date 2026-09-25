// ── staffDrill.ts — the Staff reading question pool and picker ───────────
//
// staff-reading-spec.md §5–§7. Pure: builds the set of pitches a session may
// ask (every pitch playable inside the chosen fret range, on any string) and
// picks the next one (or a short phrase), favouring pitches the learner's
// own staff SRS says are due or new. The clef / octave shift and the keys
// come from `utils/staff.ts`.

import { keyPitchClasses, pitchClassName, type KeyId } from '../utils/staff';
import type { SrsMap } from './srs';
import { staffItemId } from './staffItem';

export type StaffRange = 'open' | 'low' | 'twelve' | 'high';
export const STAFF_RANGES: readonly StaffRange[] = ['open', 'low', 'twelve', 'high'];
/** Top fret of each range; `Infinity` = the instrument's last fret. */
export const STAFF_RANGE_TOP_FRET: Record<StaffRange, number> = { open: 3, low: 5, twelve: 12, high: Infinity };
/** Bottom fret of each range: the high range is the neck above the 12th fret only. */
export const STAFF_RANGE_BOTTOM_FRET: Record<StaffRange, number> = { open: 0, low: 0, twelve: 0, high: 12 };

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

export function staffBottomFret(range: StaffRange, maxFret: number): number {
  return Math.min(STAFF_RANGE_BOTTOM_FRET[range], maxFret);
}

/** Every pitch playable in frets bottom…top of `range`, ascending. With
 *  `inKeyOnly`, only the seven notes of `key` (in C: the naturals). */
export function buildStaffPool(
  inst: StaffInstrument,
  range: StaffRange,
  inKeyOnly: boolean,
  key: KeyId = 'C',
): StaffPoolItem[] {
  const top = staffTopFret(range, inst.maxFret);
  const bottom = staffBottomFret(range, inst.maxFret);
  const inKey = keyPitchClasses(key);
  const byMidi = new Map<number, StaffPosition[]>();
  inst.openMidi.forEach((open, idx) => {
    const from = Math.max(bottom, inst.minFrets?.[idx] ?? 0);
    for (let fret = from; fret <= top; fret++) {
      const midi = open + fret;
      if (inKeyOnly && !inKey.has(midi % 12)) continue;
      const list = byMidi.get(midi) ?? [];
      list.push({ string: idx + 1, fret });
      byMidi.set(midi, list);
    }
  });
  return [...byMidi.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([midi, positions]) => ({ midi, itemId: staffItemId(midi), positions }));
}

/** The answer chips for "name the note": the seven notes of `key`, or all
 *  twelve pitch classes, as sharp-spelled values in C…B order (the caller
 *  spells the labels). */
export function staffNameOptions(inKeyOnly: boolean, key: KeyId = 'C'): string[] {
  const inKey = keyPitchClasses(key);
  const out: string[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (inKeyOnly && !inKey.has(pc)) continue;
    out.push(pitchClassName(pc));
  }
  return out;
}

function srsWeight(p: StaffPoolItem, srs: SrsMap, now: number): number {
  const item = srs[p.itemId];
  if (!item) return 3;
  return item.dueAt <= now ? 4 : 1;
}

function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
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
  return weightedPick(candidates, candidates.map((p) => srsWeight(p, srs, now)), rng);
}

/** How far (in pool steps) one phrase note may move from the one before —
 *  the pool is ordered by pitch, so this keeps the line singable. */
export const PHRASE_MAX_LEAP = 3;

/**
 * A short phrase to read in a row (staff-reading-spec.md §6.4). The first
 * note is an ordinary SRS-weighted pick; each next one lies within
 * `PHRASE_MAX_LEAP` pool steps of the one before (never the same pitch
 * twice in a row), again weighted by the SRS — so a phrase moves like a
 * melody while still visiting the notes that are due.
 */
export function buildStaffPhrase(
  pool: readonly StaffPoolItem[],
  srs: SrsMap,
  length: number,
  previousMidi: number | null,
  now: number,
  rng: () => number = Math.random,
): StaffPoolItem[] {
  const first = pickStaffQuestion(pool, srs, previousMidi, now, rng);
  if (!first) return [];
  const out = [first];
  let idx = pool.indexOf(first);
  while (out.length < length) {
    const near: StaffPoolItem[] = [];
    for (let i = Math.max(0, idx - PHRASE_MAX_LEAP); i <= Math.min(pool.length - 1, idx + PHRASE_MAX_LEAP); i++) {
      if (i !== idx) near.push(pool[i]);
    }
    if (near.length === 0) break;
    const next = weightedPick(near, near.map((p) => srsWeight(p, srs, now)), rng);
    out.push(next);
    idx = pool.indexOf(next);
  }
  return out;
}
