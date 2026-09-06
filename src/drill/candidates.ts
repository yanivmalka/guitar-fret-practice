// ── Explicit candidate sets for a drill ──────────────────────────────────
//
// By default the drill engine derives its question pool from filters
// (`wholeToneOnly` / `dotsOnly` / a fret window) applied to whole strings. A
// `DrillConfig` may instead carry an explicit `candidates` list — the exact
// set of positions a question is allowed to land on. That is what lets a
// future Game stage say "only string 6, frets 1–5" or "only the notes A, B, C"
// without inventing a new filter for every shape.
//
// The engine's question atom is a (string, fret) position — it already indexes
// `notes[string - 1][fret]` everywhere — so a candidate is just that pair.
// Anything expressible as a set of positions (specific frets, specific notes
// resolved to their positions, a mix of strings) is expressible here; the
// caller does that resolution, the engine only consumes positions.

import { getValidFrets } from '../utils/music';

export interface DrillPosition {
  /** 1-based string number — matches `DrillConfig.strings`, the value the
   *  engine passes around as `qString`, and `HistoryEntry.string`. */
  string: number;
  /** Fret number, 0 = open string. */
  fret: number;
}

/**
 * Group a candidate list into `string -> sorted unique frets`, dropping any
 * entry that is not a real position on `noteTable` (unknown string, fret out
 * of range, non-integer) and de-duplicating the rest.
 *
 * Returns an empty map when nothing valid survives; callers treat an
 * empty/missing map as "no candidate set — use the filter-based pool", so a
 * malformed set degrades to the classic behaviour instead of breaking the run.
 */
export function groupCandidateFrets(
  candidates: readonly DrillPosition[],
  noteTable: readonly (readonly string[])[],
): Map<number, number[]> {
  const byString = new Map<number, number[]>();
  for (const pos of candidates) {
    const row = noteTable[pos.string - 1];
    if (!row) continue;
    if (!Number.isInteger(pos.fret) || pos.fret < 0 || pos.fret >= row.length) continue;
    const list = byString.get(pos.string);
    if (list) {
      if (!list.includes(pos.fret)) list.push(pos.fret);
    } else {
      byString.set(pos.string, [pos.fret]);
    }
  }
  for (const list of byString.values()) list.sort((a, b) => a - b);
  return byString;
}

/**
 * The strings a question may be asked on while a candidate set is active.
 *
 * - Multi-string drills rotate across every string that has candidates.
 * - Single-string drills stay on `primaryString` when it has candidates;
 *   if it does not (a mis-scoped set), they fall back to the candidate
 *   strings so the drill can still run rather than dead-end.
 */
export function candidateStringPool(
  candidateFretsByString: Map<number, number[]>,
  isMulti: boolean,
  primaryString: number,
): number[] {
  const strings = [...candidateFretsByString.keys()].sort((a, b) => a - b);
  if (isMulti) return strings;
  return candidateFretsByString.has(primaryString) ? [primaryString] : strings;
}

/**
 * The frets the board (FretGrid / NoteCircle) should show and accept for one
 * 1-based string. This is the *rendering* counterpart of the pool the engine
 * draws questions from, so the two never disagree:
 *
 * - With a candidate map (from `groupCandidateFrets`): exactly that string's
 *   candidate frets, and none for a string that carries no candidates. The
 *   fret-window / `wholeToneOnly` / `dotsOnly` filters are ignored, matching
 *   how the engine picks once a candidate set is active.
 * - With `null` (no set, or an empty / all-invalid one): the classic
 *   filter-based `getValidFrets`, so Practice and candidate-less stages keep
 *   their exact previous behaviour.
 */
export function boardFretsForString(
  stringNum: number,
  candidateFretsByString: Map<number, number[]> | null,
  filter: { fretFrom: number; fretTo: number; wholeToneOnly: boolean; dotsOnly: boolean },
): number[] {
  if (candidateFretsByString) return candidateFretsByString.get(stringNum) ?? [];
  return getValidFrets(
    stringNum - 1, filter.fretFrom, filter.fretTo, filter.wholeToneOnly, filter.dotsOnly,
  );
}
