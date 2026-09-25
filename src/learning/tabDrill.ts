// ── tabDrill.ts — the Tab reading question pool and picker ───────────────
//
// tab-reading-spec.md §5–§7. Pure: builds the set of tab positions a session
// may ask (every (string, fret) inside the chosen fret range) and picks the
// next one (or a short riff), favouring positions the learner's own tab SRS
// says are due or new.
//
// The fret ranges are the Staff reading ones (0–3, 0–5, 0–12, 12 to the last
// fret) — the same four slices of the neck, so a learner moving between the
// two domains meets the same choices. Only the range constants are shared;
// the pool, picker and schedule are the tab domain's own.

import { pitchClassName } from '../utils/staff';
import type { SrsMap } from './srs';
import { staffBottomFret, staffTopFret, type StaffInstrument, type StaffPosition, type StaffRange } from './staffDrill';
import { tabItemId } from './tabItem';

export type TabRange = StaffRange;
export { STAFF_RANGES as TAB_RANGES } from './staffDrill';
export const tabTopFret = staffTopFret;
export const tabBottomFret = staffBottomFret;

export interface TabPoolItem {
  itemId: string;
  /** 1-based string number, 1 = highest-pitched (the tab's top line). */
  string: number;
  fret: number;
  /** Sounding pitch. */
  midi: number;
  /** The one place this item is — the reading engine's shape. */
  positions: StaffPosition[];
}

const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

/** Every position in frets bottom…top of `range`, string 1 first, then by
 *  fret. With `naturalsOnly`, only positions that play a natural note. */
export function buildTabPool(inst: StaffInstrument, range: TabRange, naturalsOnly: boolean): TabPoolItem[] {
  const top = tabTopFret(range, inst.maxFret);
  const bottom = tabBottomFret(range, inst.maxFret);
  const out: TabPoolItem[] = [];
  inst.openMidi.forEach((open, idx) => {
    const string = idx + 1;
    const from = Math.max(bottom, inst.minFrets?.[idx] ?? 0);
    for (let fret = from; fret <= top; fret++) {
      const midi = open + fret;
      if (naturalsOnly && !NATURAL_PCS.has(midi % 12)) continue;
      out.push({ itemId: tabItemId(string, fret), string, fret, midi, positions: [{ string, fret }] });
    }
  });
  return out;
}

/** The answer chips for naming a tab number: the seven naturals or all
 *  twelve pitch classes, sharp-spelled in C…B order (the caller spells the
 *  labels with the app's sharps/flats setting). */
export function tabNameOptions(naturalsOnly: boolean): string[] {
  const out: string[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (naturalsOnly && !NATURAL_PCS.has(pc)) continue;
    out.push(pitchClassName(pc));
  }
  return out;
}

function srsWeight(p: TabPoolItem, srs: SrsMap, now: number): number {
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
 * Pick the next position. Weighted toward what the schedule wants: a due
 * position weighs 4, a never-seen one 3, anything else 1. Never repeats the
 * previous position while the pool has another to offer.
 */
export function pickTabQuestion(
  pool: readonly TabPoolItem[],
  srs: SrsMap,
  previousId: string | null,
  now: number,
  rng: () => number = Math.random,
): TabPoolItem | null {
  const candidates = pool.length > 1 ? pool.filter((p) => p.itemId !== previousId) : [...pool];
  if (candidates.length === 0) return null;
  return weightedPick(candidates, candidates.map((p) => srsWeight(p, srs, now)), rng);
}

/** How far one riff note may move from the one before: to the next string
 *  at most, and this many frets along it — so a riff sits under one hand. */
export const RIFF_MAX_STRING_STEP = 1;
export const RIFF_MAX_FRET_STEP = 2;

/**
 * A short riff to read in a row (tab-reading-spec.md §6.4). The first note is
 * an ordinary SRS-weighted pick; each next one is on the same or a
 * neighbouring string and within `RIFF_MAX_FRET_STEP` frets of the one
 * before (never the same position twice in a row), again SRS-weighted — so
 * the riff is playable under one hand while still visiting what is due.
 */
export function buildTabRiff(
  pool: readonly TabPoolItem[],
  srs: SrsMap,
  length: number,
  previousId: string | null,
  now: number,
  rng: () => number = Math.random,
): TabPoolItem[] {
  const first = pickTabQuestion(pool, srs, previousId, now, rng);
  if (!first) return [];
  const out = [first];
  let cur = first;
  while (out.length < length) {
    const near = pool.filter((p) => p.itemId !== cur.itemId
      && Math.abs(p.string - cur.string) <= RIFF_MAX_STRING_STEP
      && Math.abs(p.fret - cur.fret) <= RIFF_MAX_FRET_STEP);
    const options = near.length > 0 ? near : pool.filter((p) => p.itemId !== cur.itemId);
    if (options.length === 0) break;
    cur = weightedPick(options, options.map((p) => srsWeight(p, srs, now)), rng);
    out.push(cur);
  }
  return out;
}
