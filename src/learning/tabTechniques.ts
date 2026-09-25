// ── tabTechniques.ts — playing-technique symbols as written in tab ────────
//
// tab-reading-spec.md §13.2. Pure. Eight symbols a tab reader meets
// everywhere: 5h7 (hammer-on), 7p5 (pull-off), 5/7 and 7\5 (slides), 7b9
// (bend — the second number is the fret whose pitch the bend reaches),
// 7~ (vibrato), x (muted note) and PM (palm mute, written above the notes).
//
// The item is the SYMBOL (`tab:tech:<technique>`): what is learnt is reading
// it, so each question writes it on a fresh string and fret inside the
// chosen range.

import type { StaffInstrument, StaffPosition } from './staffDrill';
import { tabBottomFret, tabTopFret, type TabRange } from './tabDrill';
import { TAB_TECHNIQUES, tabTechniqueItemId, type TabTechnique } from './tabItem';

export interface TabTechniqueItem {
  kind: 'technique';
  itemId: string;
  technique: TabTechnique;
  string: number;
  /** The fret picked first. */
  from: number;
  /** The fret the technique ends on (the bend's target pitch); `null` when
   *  it stays on one note or has no pitch (x). */
  to: number | null;
  /** Sounding pitch at the end — what "which note do you hear at the end?"
   *  asks for. */
  midi: number;
  /** What is written on the line: `5h7`, `7b9`, `x`… */
  text: string;
  /** Written above the tab (palm mute). */
  above?: string;
  /** The places the technique touches (the reading engine's shape). */
  positions: StaffPosition[];
}

/** The techniques that end on a pitch (the muted note has none). */
export const PITCHED_TECHNIQUES: readonly TabTechnique[] = TAB_TECHNIQUES.filter((t) => t !== 'mutedNote');

const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

function textOf(t: TabTechnique, from: number, to: number | null): string {
  switch (t) {
    case 'hammerOn': return `${from}h${to}`;
    case 'pullOff': return `${from}p${to}`;
    case 'slideUp': return `${from}/${to}`;
    case 'slideDown': return `${from}\\${to}`;
    case 'bend': return `${from}b${to}`;
    case 'vibrato': return `${from}~`;
    case 'mutedNote': return 'x';
    case 'palmMute': return `${from}`;
  }
}

/** Every (from, to) a technique can be written with inside frets
 *  bottom…top of one string. */
function fretPairs(t: TabTechnique, bottom: number, top: number, maxFret: number): [number, number | null][] {
  const out: [number, number | null][] = [];
  const low = Math.max(bottom, 1); // slides, bends and vibrato need a fretted note
  switch (t) {
    case 'hammerOn':
      for (let f = bottom; f <= top; f++) for (const d of [1, 2]) if (f + d <= top) out.push([f, f + d]);
      break;
    case 'pullOff':
      for (let f = bottom; f <= top; f++) for (const d of [1, 2]) if (f - d >= bottom) out.push([f, f - d]);
      break;
    case 'slideUp':
      for (let f = low; f <= top; f++) for (const d of [2, 3]) if (f + d <= top) out.push([f, f + d]);
      break;
    case 'slideDown':
      for (let f = low; f <= top; f++) for (const d of [2, 3]) if (f - d >= low) out.push([f, f - d]);
      break;
    case 'bend':
      // A whole-step bend; its target is a pitch, not a fret to press, so
      // it may lie just past the range but never past the neck.
      for (let f = Math.max(low, 2); f <= top; f++) if (f + 2 <= maxFret) out.push([f, f + 2]);
      break;
    case 'vibrato':
      for (let f = low; f <= top; f++) out.push([f, null]);
      break;
    case 'mutedNote':
      out.push([0, null]);
      break;
    case 'palmMute':
      for (let f = bottom; f <= top; f++) out.push([f, null]);
      break;
  }
  return out;
}

/**
 * Write `technique` on a random string and fret of the range. With
 * `naturalsOnly` the note it ends on is a natural. `null` when the range
 * has no room for it (e.g. a slide needs three frets).
 */
export function buildTechniqueQuestion(
  inst: StaffInstrument,
  range: TabRange,
  technique: TabTechnique,
  naturalsOnly: boolean,
  rng: () => number = Math.random,
): TabTechniqueItem | null {
  const top = tabTopFret(range, inst.maxFret);
  const bottom = tabBottomFret(range, inst.maxFret);
  const options: TabTechniqueItem[] = [];
  inst.openMidi.forEach((open, i) => {
    const string = i + 1;
    const minFret = inst.minFrets?.[i] ?? 0;
    for (const [from, to] of fretPairs(technique, Math.max(bottom, minFret), top, inst.maxFret)) {
      if (from < minFret) continue;
      const midi = open + (to ?? from);
      if (naturalsOnly && technique !== 'mutedNote' && !NATURAL_PCS.has(midi % 12)) continue;
      options.push({
        kind: 'technique',
        itemId: tabTechniqueItemId(technique),
        technique,
        string,
        from,
        to,
        midi,
        text: textOf(technique, from, to),
        above: technique === 'palmMute' ? 'PM' : undefined,
        positions: to == null ? [{ string, fret: from }] : [{ string, fret: from }, { string, fret: to }],
      });
    }
  });
  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length)];
}

/** The technique pool for a session: the symbols the range has room for
 *  (only the pitched ones when the question asks for the note at the end). */
export function tabTechniquePool(
  inst: StaffInstrument,
  range: TabRange,
  pitchedOnly: boolean,
): TabTechnique[] {
  return (pitchedOnly ? PITCHED_TECHNIQUES : TAB_TECHNIQUES)
    .filter((t) => buildTechniqueQuestion(inst, range, t, false, () => 0) != null);
}
