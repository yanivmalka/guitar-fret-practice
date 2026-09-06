// ── IntervalItem identity ────────────────────────────────────────────────
//
// P4 first vertical slice. The atomic thing the learner can be weak on is an
// interval *quality*, ascending — "recognising / finding a major 3rd" —
// regardless of its root or which strings it spans. Granularity is deliberately
// coarse for the first slice (~11 items); per-root and per-string-set
// refinements are a later step (premium-product-plan.md §9 P4/P5).
//
// Mirrors `noteItem.ts`. Interval SRS lives in its OWN `SrsMap`
// (`InstrumentLearningState.intervalSrs`), never mixed into the note schedule,
// so the notes-only planner / weakness / path code never has to know intervals
// exist. The `interval:` prefix still makes an interval id unmistakable if the
// two ever meet (e.g. a future unified schedule), and `parseNoteItemId`
// already returns `null` for it.

export const INTERVAL_ID_PREFIX = 'interval:';

/** The stable id for an ascending interval quality. `"interval:<semitones>"`. */
export function intervalItemId(semitones: number): string {
  return `${INTERVAL_ID_PREFIX}${semitones}`;
}

export function isIntervalItemId(id: string): boolean {
  return id.startsWith(INTERVAL_ID_PREFIX);
}

/** Parse an `"interval:<semitones>"` id back to its semitone size, or `null`
 *  if it is not a well-formed interval id in the drilled range (m2…M7). */
export function parseIntervalItemId(id: string): number | null {
  if (!isIntervalItemId(id)) return null;
  const n = Number(id.slice(INTERVAL_ID_PREFIX.length));
  return Number.isInteger(n) && n >= 1 && n <= 11 ? n : null;
}
