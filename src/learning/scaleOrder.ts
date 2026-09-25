// ── scaleOrder.ts — the still neck section behind "Tap the scale in order" ─
//
// Pure, no React, no DOM. The fourth Scales exercise: a section of the neck
// (the box's own frets, every string) is shown still, with every note of the
// scale lit. The learner taps them in the order the scale is played — up from
// its lowest note or down from its highest, the same run `scaleRun` gives
// Exercise A.
//
// A pitch the box holds on two strings (the G–B major third can put one pitch
// on two neighbouring strings) is one step of the run: either tile answers it.

import type { ScaleQuestion } from './scaleDrill';
import type { NeckPos } from '../utils/scales';
import { midiAt, scaleRun } from './scaleFall';

export interface ScaleOrderBoard {
  /** First and last fret shown, inclusive. */
  fromFret: number;
  toFret: number;
  /** The run in the order it must be tapped — one tile per step (for a
   *  pitch on two strings, the one on the thicker string). */
  run: NeckPos[];
  /** The run's pitches in the order they must be tapped. */
  runMidi: number[];
  /** `"<string>:<fret>"` → the run step that tile answers. Only scale notes
   *  are in the map; every other tile of the section is dim. */
  stepAt: Map<string, number>;
}

export function tileKey(pos: NeckPos): string {
  return `${pos.string}:${pos.fret}`;
}

/** Lays out one question as a still board: the section spans the shape's
 *  frets, and each shape tile is keyed to its step in the run. */
export function buildOrderBoard(q: ScaleQuestion, openMidi: readonly number[]): ScaleOrderBoard {
  const run = scaleRun(q.shape, openMidi, q.direction);
  const runMidi = run.map((p) => midiAt(p, openMidi));
  const stepAt = new Map<string, number>();
  for (const p of q.shape) {
    const step = runMidi.indexOf(midiAt(p, openMidi));
    if (step >= 0) stepAt.set(tileKey(p), step);
  }
  const frets = q.shape.map((p) => p.fret);
  return {
    fromFret: Math.min(...frets),
    toFret: Math.max(...frets),
    run,
    runMidi,
    stepAt,
  };
}
