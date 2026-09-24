// ── scaleFall.ts — the falling-rows stream for Exercise A ("Build the scale")
//
// Pure, no React, no DOM. Exercise A plays like Piano Tiles across the whole
// screen (scales-learning-spec.md's Session 5 correction): one lane per
// string, rows falling together from the top, and the learner taps the lit
// tile of each row, bottom row first, before it falls off the screen.
//
// A row is a **slice of the neck at one fret**: one tile per string, each
// carrying the real note at `(string, fret)`. Exactly one tile per row is the
// target — the next note of the scale run, ascending by pitch from the lowest
// shape note (a run up the scale, product-owner instruction). The rest of the
// slice is ordinary, tappable, "wrong" neck.
//
// Each scale (`ScaleQuestion`, picked by `pickScaleQuestion` unchanged) is
// preceded by one banner row naming it, so the stream reads as a sequence of
// runs. Geometry and speed are measured in **rows**, not pixels — the board
// maps a row to whatever height the screen gives it.

import type { ScaleQuestion } from './scaleDrill';
import type { NeckPos } from '../utils/scales';

/** How many rows fit on the play area at once — the board sizes a row as
 *  `playHeight / VISIBLE_ROWS`. */
export const VISIBLE_ROWS = 5;

/** Where row 0's bottom edge sits (rows above the play area's bottom) when a
 *  session starts — the banner of the first scale is on screen, its first
 *  notes stacked above it. */
export const START_OFFSET = 1;

export interface FallBannerRow {
  kind: 'banner';
  /** Index into the stream's `questions`. */
  q: number;
}

export interface FallNoteRow {
  kind: 'note';
  q: number;
  /** The target tile: the lane (string) that must be tapped. */
  string: number;
  /** The neck slice this row shows — every lane's tile is `(lane, fret)`. */
  fret: number;
  /** 0-based position of this note in its scale's run. */
  step: number;
  /** Semitones from this note to the next note of the run — shown on the tile
   *  once it is tapped, so the learner works out where the next note is.
   *  Absent on the run's last note. */
  toNext?: number;
}

/** A fret the run steps over between two notes — a neck slice with no lit
 *  tile, so the fret numbers on screen count through without a jump. Nothing
 *  to tap; tapping any tile of it is a wrong tap. */
export interface FallGapRow {
  kind: 'gap';
  q: number;
  fret: number;
}

export type FallRow = FallBannerRow | FallNoteRow | FallGapRow;

export interface FallStream {
  questions: ScaleQuestion[];
  rows: FallRow[];
}

/** `openMidi` is string-1-first (highest string first), as in
 *  `InstrumentConfig.openMidi`. */
export function midiAt(pos: NeckPos, openMidi: readonly number[]): number {
  return (openMidi[pos.string - 1] ?? 0) + pos.fret;
}

/** The shape as a run up the scale: ascending by pitch. A pitch the shape
 *  holds twice (a box can reach the same note on two neighbouring strings
 *  across the G–B major third) is played once, on the thicker string, the
 *  way a run goes through a box. */
export function scaleRun(
  shape: readonly NeckPos[], openMidi: readonly number[], direction: 'up' | 'down' = 'up',
): NeckPos[] {
  const sorted = [...shape].sort(
    (a, b) => midiAt(a, openMidi) - midiAt(b, openMidi) || b.string - a.string,
  );
  const out: NeckPos[] = [];
  let lastMidi = -Infinity;
  for (const p of sorted) {
    const m = midiAt(p, openMidi);
    if (m === lastMidi) continue;
    out.push(p);
    lastMidi = m;
  }
  // A descending run is the same notes, top to bottom.
  return direction === 'down' ? out.reverse() : out;
}

/** Lays `questions` out as one stream: a banner row, then the run's notes,
 *  per question, bottom (row 0) to top. Between two notes on different frets
 *  every fret the run steps over gets an empty row, in the direction of
 *  travel (5 → 8 shows 6, 7; 8 → 5 shows 7, 6). */
export function buildFallStream(questions: readonly ScaleQuestion[], openMidi: readonly number[]): FallStream {
  const rows: FallRow[] = [];
  questions.forEach((q, qi) => {
    rows.push({ kind: 'banner', q: qi });
    let prevFret: number | null = null;
    const run = scaleRun(q.shape, openMidi, q.direction);
    run.forEach((p, step) => {
      if (prevFret !== null) {
        const dir = Math.sign(p.fret - prevFret);
        for (let f = prevFret + dir; dir !== 0 && f !== p.fret; f += dir) {
          rows.push({ kind: 'gap', q: qi, fret: f });
        }
      }
      const next = run[step + 1];
      rows.push({
        kind: 'note', q: qi, string: p.string, fret: p.fret, step,
        ...(next ? { toNext: Math.abs(midiAt(next, openMidi) - midiAt(p, openMidi)) } : {}),
      });
      prevFret = p.fret;
    });
  });
  return { questions: [...questions], rows };
}

/** Whether row `index` is where the run turns back — the frets were climbing
 *  (14, 15, 16, 17) and now head down again (16, 15, 14 …), or the reverse.
 *  The board draws a line on the boundary below this row so each pass reads
 *  as its own stretch of the neck. */
export function isTurnRow(rows: readonly FallRow[], index: number): boolean {
  const row = rows[index];
  if (!row || row.kind === 'banner') return false;
  const prev = rows[index - 1];
  if (!prev || prev.kind === 'banner' || prev.q !== row.q) return false;
  const dir = Math.sign(row.fret - prev.fret);
  if (dir === 0) return false;
  // The direction the run was travelling before this row: the last non-zero
  // fret step within the same scale.
  for (let i = index - 1; i > 0; i--) {
    const a = rows[i];
    const b = rows[i - 1];
    if (a.kind === 'banner' || b.kind === 'banner' || a.q !== row.q || b.q !== row.q) return false;
    const before = Math.sign(a.fret - b.fret);
    if (before !== 0) return before !== dir;
  }
  return false;
}

/** A semitone distance as tones: 1 → "½", 2 → "1", 3 → "1½", 4 → "2". */
export function formatTones(semitones: number): string {
  const whole = Math.floor(semitones / 2);
  const half = semitones % 2 === 1;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
}

/** Bottom edge of row `index`, in rows above the play area's bottom, after
 *  the stream has scrolled `scroll` rows. */
export function rowBottom(index: number, scroll: number): number {
  return index + START_OFFSET - scroll;
}

/** A row is missed once it has fallen completely below the play area. */
export function hasFallenOff(index: number, scroll: number): boolean {
  return rowBottom(index, scroll) + 1 <= 0;
}

/** Fall speed in rows per second, ramping up linearly over the session and
 *  capped — the real game's "it keeps getting faster". */
export interface FallSpeed {
  start: number;
  max: number;
  /** Rows/second gained per second of play. */
  accel: number;
}

export function speedAt(speed: FallSpeed, elapsedSeconds: number): number {
  return Math.min(speed.max, speed.start + speed.accel * Math.max(0, elapsedSeconds));
}
