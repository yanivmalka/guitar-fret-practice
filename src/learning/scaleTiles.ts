// ── scaleTiles.ts — tile scheduling for Exercise A, the real Piano Tiles
// mechanic (§8.1, corrected per the product owner — see
// scales-learning-spec.md's "Session 2 progress" correction note) ──────────
//
// Pure, no React, no DOM. The real Piano Tiles game streams tiles down a
// fixed set of lanes and the player taps each one in time as it crosses a
// line (confirmed by research, not assumed — see the spec correction).
// Translated to Scales: **one lane per string** (the product owner's
// explicit instruction — the lane count must track `instrument.stringCount`
// for every instrument/variant, not a fixed 6), and only the current scale
// shape's real `(string, fret)` positions ever become tiles — nothing else
// in a lane is tappable, mirroring how the old static board's decoys are
// gone (a miss here is missing/mistiming a real note, not a trick tile).
//
// A "run" is one scale shape at one root (reuses `pickScaleQuestion`
// unchanged — the shape/root resolution logic didn't need to change, only
// what the player does with it). Tiles are ordered by ascending fret (ties
// broken by string) — not by pitch — so the run visually reads as "moving up
// the neck," matching the product owner's "the neck moves" framing exactly.

import { pickScaleQuestion, type ScaleQuestion, type ScalePoolItem } from './scaleDrill';

export interface ScaleTile {
  string: number;
  fret: number;
  /** Milliseconds from run start when this tile crosses the hit-line. */
  atMs: number;
}

export interface ScaleTilesRun extends ScaleQuestion {
  tiles: ScaleTile[];
  /** Milliseconds from run start until the last tile's hit window closes —
   *  the point at which the run is fully resolved (all tiles hit or missed)
   *  even if the player never taps again. */
  endMs: number;
}

/** Milliseconds a tile takes to fall from spawn (top of the lane) to the
 *  hit-line — the visual lead time a player gets to react. */
export const TRAVEL_MS = 1800;
/** A tap counts if it lands within this many ms of a tile's `atMs` on either
 *  side. */
export const HIT_WINDOW_MS = 260;

/** Orders `shape` ascending by fret (ties by string) and assigns evenly
 *  spaced arrival times, `beatMs` apart, starting at `TRAVEL_MS` (so the
 *  first tile's spawn delay is exactly 0 — it starts falling the instant the
 *  run begins, arriving after one full `TRAVEL_MS`). */
export function scheduleTiles(shape: readonly { string: number; fret: number }[], beatMs: number): ScaleTile[] {
  const ordered = [...shape].sort((a, b) => a.fret - b.fret || a.string - b.string);
  return ordered.map((p, i) => ({ string: p.string, fret: p.fret, atMs: TRAVEL_MS + i * beatMs }));
}

/** Picks a run the same way Exercise A always has (`pickScaleQuestion`,
 *  unchanged) and schedules its tiles. `beatMs` is the tempo — smaller means
 *  faster/harder, driven by the Selector's difficulty envelope. */
export function pickScaleTilesRun(
  pool: readonly ScalePoolItem[],
  noteTable: readonly (readonly string[])[],
  stringCount: number,
  maxFret: number,
  beatMs: number,
  rng: () => number = Math.random,
  naturalsOnly = false,
): ScaleTilesRun | null {
  const base = pickScaleQuestion(pool, noteTable, stringCount, maxFret, rng, naturalsOnly);
  if (!base) return null;
  const tiles = scheduleTiles(base.shape, beatMs);
  const last = tiles[tiles.length - 1];
  const endMs = (last?.atMs ?? 0) + HIT_WINDOW_MS;
  return { ...base, tiles, endMs };
}
