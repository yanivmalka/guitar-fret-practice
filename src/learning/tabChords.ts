// ── tabChords.ts — chords as they are written in tab ──────────────────────
//
// tab-reading-spec.md §13.1. Pure. A chord in tab is a column of numbers,
// one per string, played together; a line with no number is not played.
// Rather than a hand-typed chord book per instrument and tuning, the shapes
// are FOUND in the instrument's own tuning: for a root, a chord quality and
// a bass string, search the fret window(s) of the chosen range for the
// voicing a player would use —
//   • the root is on the bass string, and every string tuned higher than it
//     is played (a power chord: the next one or two), with no unplayed string
//     in between — so the lowest note names the chord. "Higher" is by pitch,
//     not by string number, so a re-entrant ukulele's high G string joins
//     the chord (C = 0003) as it does in real ukulele tab;
//   • every note of the chord is there — except that a seventh chord may
//     leave out its fifth, as players do (C7 = x32310);
//   • the fretted notes span at most four frets and need at most four
//     fingers (a barre at the lowest fret counts as one);
//   • the lowest-fret, most compact such voicing wins.
// On a standard guitar this reproduces the familiar open shapes by itself
// (C = x32010, G = 320003, D = xx0232, Am = x02210, C7 = x32310, E5 = 022xxx)
// and the E- / A-shape barre and power chords higher up — checked in
// scripts/check-tabs.mts.
//
// One voicing per (root, quality, bass string) inside the range, so the pool
// stays a readable set of shapes, not every inversion on the neck.

import type { InstrumentId } from '../utils/instruments';
import { pitchClassName } from '../utils/staff';
import { tabBottomFret, tabTopFret, type TabRange } from './tabDrill';
import { tabChordItemId } from './tabItem';
import type { StaffInstrument, StaffPosition } from './staffDrill';

export type ChordQuality = 'major' | 'minor' | 'dom7' | 'power';
export const CHORD_QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'dom7', 'power'];

const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  power: [0, 7],
};
/** The suffix after the root in a chord name: C, Cm, C7, C5. */
export const CHORD_SUFFIX: Record<ChordQuality, string> = { major: '', minor: 'm', dom7: '7', power: '5' };

/** Which qualities make sense on each instrument's tab. Bass tab writes
 *  power chords (root + fifth); the mandolin is modelled as eight separate
 *  strings, where a chord would need both strings of a pair — not offered
 *  until the app models courses (tab-reading-spec.md §12). */
export function chordQualitiesFor(id: InstrumentId): ChordQuality[] {
  switch (id) {
    case 'guitar': return ['major', 'minor', 'dom7', 'power'];
    case 'bass': return ['power'];
    case 'ukulele':
    case 'banjo': return ['major', 'minor', 'dom7'];
    default: return [];
  }
}

export interface TabChordItem {
  kind: 'chord';
  itemId: string;
  /** Sounding pitch of the bass (the root). */
  midi: number;
  rootPc: number;
  quality: ChordQuality;
  /** Fret per string, `[0]` = string 1 (the top tab line); `null` = not played. */
  frets: (number | null)[];
  /** The played places, lowest string first — the strum order. */
  positions: StaffPosition[];
}

const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

/** Frets a string may use inside a window starting at `w`. */
function allowedFrets(w: number, bottom: number, top: number, minFret: number): number[] {
  const out: number[] = [];
  if (bottom === 0 && w <= 1 && minFret === 0) out.push(0);
  for (let f = Math.max(w, 1, minFret); f <= Math.min(w + 3, top); f++) out.push(f);
  return out;
}

function fingersNeeded(fretted: readonly number[]): number {
  if (fretted.length === 0) return 0;
  const low = Math.min(...fretted);
  const atLow = fretted.filter((f) => f === low).length;
  return fretted.length - (atLow >= 2 ? atLow - 1 : 0);
}

/**
 * The best voicing of one chord, or `null`. With a `bass` string the root
 * sits on it and the strings tuned higher are played; with `bass = null`
 * (ukulele) every string plays and the root may be anywhere.
 */
export function findChordVoicing(
  inst: StaffInstrument,
  range: TabRange,
  rootPc: number,
  quality: ChordQuality,
  bass: number | null,
): TabChordItem | null {
  const top = tabTopFret(range, inst.maxFret);
  const bottom = tabBottomFret(range, inst.maxFret);
  const pcs = new Set(QUALITY_INTERVALS[quality].map((i) => (rootPc + i) % 12));
  const fifth = (rootPc + 7) % 12;
  const required = quality === 'dom7' ? [...pcs].filter((pc) => pc !== fifth) : [...pcs];
  const isDrone = (s: number) => (inst.minFrets?.[s - 1] ?? 0) > 0;
  // Played strings, in pitch order. A short drone string (banjo) is left out.
  let played: number[];
  if (bass == null) {
    played = inst.openMidi
      .map((m, i) => ({ s: i + 1, m }))
      .filter((x) => !isDrone(x.s))
      .sort((a, b) => a.m - b.m)
      .map((x) => x.s);
  } else {
    if (isDrone(bass)) return null;
    const bassOpen = inst.openMidi[bass - 1];
    let higher = inst.openMidi
      .map((m, i) => ({ s: i + 1, m }))
      .filter((x) => x.s !== bass && x.m > bassOpen && !isDrone(x.s))
      .sort((a, b) => a.m - b.m)
      .map((x) => x.s);
    if (quality === 'power') higher = higher.slice(0, 2);
    played = [bass, ...higher];
    // No unplayed string between two played ones on the neck.
    const idx = [...played].sort((x, y) => x - y);
    if (idx[idx.length - 1] - idx[0] + 1 !== idx.length) return null;
  }
  const minStrings = quality === 'power' ? 2 : QUALITY_INTERVALS[quality].length === 4 ? 4 : 3;
  if (played.length < minStrings) return null;

  let best: { frets: number[]; score: number } | null = null;
  const lastWindow = Math.max(bottom, top - 3);
  for (let w = bottom; w <= lastWindow; w++) {
    const options = played.map((s, i) => allowedFrets(w, bottom, top, inst.minFrets?.[s - 1] ?? 0)
      .filter((f) => {
        const pc = (inst.openMidi[s - 1] + f) % 12;
        return i === 0 && bass != null ? pc === rootPc : pcs.has(pc);
      }));
    if (options.some((o) => o.length === 0)) continue;
    // Exhaustive over the (at most four) options per string.
    const pick: number[] = [];
    const walk = (i: number) => {
      if (i === played.length) {
        const heard = new Set(pick.map((f, k) => (inst.openMidi[played[k] - 1] + f) % 12));
        if (required.some((pc) => !heard.has(pc))) return;
        const fretted = pick.filter((f) => f > 0);
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
        if (span > 3 || fingersNeeded(fretted) > 4) return;
        const hasOpen = fretted.length < pick.length;
        if (hasOpen) {
          // An open-string chord lives in the first position: nothing
          // above fret 3 (C = x32010, never B = x21402). A power chord
          // only rings open when its root is the open string.
          if (fretted.some((f) => f > 3)) return;
          if (quality === 'power' && pick[0] !== 0) return;
        } else if (bass != null && pick[0] !== Math.min(...fretted)) {
          // A movable shape holds its root at the lowest fret, where the
          // barre or the first finger is (799877, never 764447).
          return;
        }
        const score = pick.reduce((acc, f) => acc + f, 0) + 2 * span;
        if (!best || score < best.score) best = { frets: [...pick], score };
        return;
      }
      for (const f of options[i]) {
        pick.push(f);
        walk(i + 1);
        pick.pop();
      }
    };
    walk(0);
    if (best) break; // the lowest window that has one wins
  }
  if (!best) return null;
  const chosen: number[] = (best as { frets: number[] }).frets;

  const frets: (number | null)[] = inst.openMidi.map(() => null);
  played.forEach((s, i) => { frets[s - 1] = chosen[i]; });
  const lowToHigh = [...frets].reverse();
  return {
    kind: 'chord',
    itemId: tabChordItemId(lowToHigh),
    // The lowest-sounding played note (the root, with a bass string).
    midi: Math.min(...played.map((st, i) => inst.openMidi[st - 1] + chosen[i])),
    rootPc,
    quality,
    frets,
    positions: played.map((s, i) => ({ string: s, fret: chosen[i] })),
  };
}

/** Whether the instrument's chords are written root-in-bass (guitar, bass,
 *  banjo) or with every string ringing and the root anywhere (ukulele — its
 *  G = 0232 has no G in the bass). */
export function chordsRootInBass(id: InstrumentId): boolean {
  return id !== 'ukulele';
}

/** Every chord the range offers: one voicing per root, quality and bass
 *  string (the three lowest-tuned strings; on a ukulele one voicing per
 *  chord), deduplicated by shape. */
export function buildTabChordPool(
  inst: StaffInstrument,
  instrumentId: InstrumentId,
  range: TabRange,
  naturalsOnly: boolean,
): TabChordItem[] {
  const qualities = chordQualitiesFor(instrumentId);
  const bassStrings: (number | null)[] = chordsRootInBass(instrumentId)
    ? inst.openMidi
      .map((m, i) => ({ s: i + 1, m }))
      .sort((a, b) => a.m - b.m)
      .slice(0, 3)
      .map((x) => x.s)
    : [null];
  const byId = new Map<string, TabChordItem>();
  for (const quality of qualities) {
    for (let pc = 0; pc < 12; pc++) {
      if (naturalsOnly && !NATURAL_PCS.has(pc)) continue;
      for (const bass of bassStrings) {
        const v = findChordVoicing(inst, range, pc, quality, bass);
        if (v && !byId.has(v.itemId)) byId.set(v.itemId, v);
      }
    }
  }
  return [...byId.values()];
}

/** `"C"`, `"Am"`, `"G7"`, `"E5"` — the root in C…B sharp spelling (the
 *  screen respells it with the app's settings). */
export function chordName(c: Pick<TabChordItem, 'rootPc' | 'quality'>): string {
  return `${pitchClassName(c.rootPc)}${CHORD_SUFFIX[c.quality]}`;
}

/** The shape as a player writes it, lowest string first: `x32010`, or
 *  dotted when a fret has two digits (`x.10.12.12.12.10`). */
export function chordShapeLabel(c: Pick<TabChordItem, 'frets'>): string {
  const low = [...c.frets].reverse();
  const parts = low.map((f) => (f == null ? 'x' : String(f)));
  return parts.some((p) => p.length > 1) ? parts.join('.') : parts.join('');
}
