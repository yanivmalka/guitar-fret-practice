// ── NoteItem — the canonical identity of one fretboard position ─────────
//
// The Premium learning layer (see .kiro/specs/roadmap/premium-product-plan.md,
// §5 "The shared learning engine") keys mastery and spaced-repetition state on
// an *item* — "the atomic thing a learner can know". The first and, for now,
// only kind of item is a **note item**: a single position on the neck,
// identified by a (string, fret) pair.
//
// This module is the foundation for that and nothing more: the `NoteItem` type
// plus the helpers that turn one into, and back from, a stable string id. It is
// deliberately self-contained — it does not touch the drill engine, history,
// mastery, `DrillConfig`, `useDrillSession` or any Premium feature. Those build
// on it in later roadmap steps (P2+).
//
// Conventions match the rest of the codebase, which has no dedicated
// string/fret types — both are plain `number`:
//   • `string` is 1-based (as in `DrillConfig.strings`, `HistoryEntry.string`
//     and the engine's `qString`); string 1 is the highest-pitched.
//   • `fret` is 0-based, with 0 = the open string.
// `src/drill/candidates.ts`'s `DrillPosition` already describes the same
// (string, fret) shape for the drill engine's explicit question pool;
// `NoteItem` is the learning layer's name for that identity and is kept
// structurally compatible with it on purpose. Unifying the two
// (`DrillPosition` → a general `Item`) is a later step, not this one.

export interface NoteItem {
  /** 1-based string number; string 1 is the highest-pitched. */
  string: number;
  /** Fret number, 0 = open string. */
  fret: number;
}

/**
 * Whether `value` is a structurally valid `NoteItem`: a non-null object with an
 * integer `string` >= 1 and an integer `fret` >= 0.
 *
 * It does *not* check the position against any instrument's neck size — callers
 * that need that still validate against a note table (see `groupCandidateFrets`
 * in `src/drill/candidates.ts`).
 */
export function isNoteItem(value: unknown): value is NoteItem {
  if (typeof value !== 'object' || value === null) return false;
  const { string, fret } = value as Record<string, unknown>;
  return (
    typeof string === 'number' && Number.isInteger(string) && string >= 1 &&
    typeof fret === 'number' && Number.isInteger(fret) && fret >= 0
  );
}

/**
 * A stable, compact id for a note item — `"<string>:<fret>"`, e.g. `"6:3"`.
 *
 * This is the value mastery / SRS state will be keyed on, so the format must
 * stay stable. It matches the informal `${string}:${fret}` position key already
 * used in `scripts/check-candidates.mts`.
 */
export function noteItemId(item: NoteItem): string {
  return `${item.string}:${item.fret}`;
}

/**
 * Parse an id produced by `noteItemId` back into a `NoteItem`, or `null` when
 * the string is not a well-formed, valid id. Round-trips with `noteItemId`.
 */
export function parseNoteItemId(id: string): NoteItem | null {
  const match = /^(\d+):(\d+)$/.exec(id);
  if (!match) return null;
  const item = { string: Number(match[1]), fret: Number(match[2]) };
  return isNoteItem(item) ? item : null;
}

/** Structural equality of two note items (same string and same fret). */
export function noteItemsEqual(a: NoteItem, b: NoteItem): boolean {
  return a.string === b.string && a.fret === b.fret;
}
