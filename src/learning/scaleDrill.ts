// ── scaleDrill.ts — Exercise A question picking ("Build the scale") ──────
//
// Pure, no React. scales-learning-spec.md §8.1's exercise needs a genuinely
// new answer surface (a piano-tiles-style multi-string board — see
// `ScaleShapeBoard.tsx` / `useScaleDrillEngine.ts`), NOT the single-string
// `FretGrid` byNote flow the spec originally assumed: `FretGrid` renders one
// string per question, but a scale shape spans several. This file is the
// pure question-selection half of that new capability — mirrors
// `intervalDrill.ts`'s role for Intervals, minus the `DrillConfig` plumbing
// (the new board isn't wired through `useGameEngine`/`DrillConfig` yet).

import { scaleTypeById, scalePositionsFor, shapeAtRoot } from '../utils/scales';
import type { NeckPos } from '../utils/scales';

/** One (scale type, position) pair a session may draw questions from. */
export interface ScalePoolItem {
  scaleTypeId: string;
  positionIndex: number;
}

/** Every authored position of `scaleTypeIds`, resolved against a concrete
 *  instrument's string count — the pool a session picks questions from. */
export function buildScalePool(scaleTypeIds: readonly string[], stringCount: number): ScalePoolItem[] {
  return scaleTypeIds.flatMap((id) =>
    scalePositionsFor(id, stringCount).map((p) => ({ scaleTypeId: id, positionIndex: p.positionIndex })),
  );
}

/** One "build the scale" question: a concrete root + the full shape (incl.
 *  the root) the learner must tap every position of. */
export interface ScaleQuestion {
  scaleTypeId: string;
  positionIndex: number;
  rootString: number;
  rootFret: number;
  /** Sharp-spelled root note name. */
  rootName: string;
  /** Every position of the shape at this root, including the root itself. */
  shape: NeckPos[];
}

/** Pick a random (scaleType, position) from `pool` and a random root fret it
 *  fits at (i.e. the position's window stays on the fretboard), and resolve
 *  the concrete shape. Returns `null` for an empty pool, an unknown scale
 *  type/position, or an instrument too short for any position in the pool to
 *  fit at any root. `rng` is injectable for deterministic tests. */
export function pickScaleQuestion(
  pool: readonly ScalePoolItem[],
  noteTable: readonly (readonly string[])[],
  stringCount: number,
  maxFret: number,
  rng: () => number = Math.random,
): ScaleQuestion | null {
  if (pool.length === 0) return null;
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const item of order) {
    const scaleType = scaleTypeById(item.scaleTypeId);
    if (!scaleType) continue;
    const position = scalePositionsFor(item.scaleTypeId, stringCount)
      .find((p) => p.positionIndex === item.positionIndex);
    if (!position) continue;
    const lo = Math.max(0, -position.window.from);
    if (lo > maxFret) continue;
    // Every root fret in [lo, maxFret] keeps the window on the fretboard
    // (shapeAtRoot only rejects a negative low edge; a high edge past the
    // instrument's last fret is simply clamped by shapeAtRoot itself).
    const rootFret = lo + Math.floor(rng() * (maxFret - lo + 1));
    const shape = shapeAtRoot(scaleType, position, rootFret, noteTable);
    if (!shape || shape.length === 0) continue;
    const rootName = noteTable[position.rootString - 1]?.[rootFret];
    if (!rootName) continue;
    return {
      scaleTypeId: item.scaleTypeId,
      positionIndex: item.positionIndex,
      rootString: position.rootString,
      rootFret,
      rootName,
      shape,
    };
  }
  return null;
}
