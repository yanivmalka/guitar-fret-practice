// ── NoteItem identity ────────────────────────────────────────────────────
//
// P2 "Premium Teacher for Notes" works at the fretboard-position level: the
// atomic thing the learner can be weak on is a specific (string, fret)
// position, not a note name (the same note name occurs at many positions and
// they are not equally hard). Every learning module — weakness detection, the
// SRS scheduler, the planner, the persisted learning state and its sync —
// keys on the id produced here, and nowhere derives its own.
//
// This is deliberately notes-only and deliberately NOT a generic cross-domain
// `Item` type (see premium-product-plan.md §11 non-goals). If a second domain
// ever lands it gets its own identity helper; this one never grows a `domain`
// field.

export interface NotePos {
  /** 1-based string number, matching `DrillPosition.string` / `HistoryEntry.string`. */
  string: number;
  /** Fret number, 0 = open string. */
  fret: number;
}

/**
 * The stable id for a fretboard position. `"<string>:<fret>"` — plain,
 * greppable, and cheap to parse back. Instrument is NOT part of the id: the
 * learning state is stored per instrument (see `learningState.ts`), so a bare
 * position id is unambiguous within one instrument's slice.
 */
export function noteItemId(string: number, fret: number): string {
  return `${string}:${fret}`;
}

/** `noteItemId` for a `NotePos`. */
export function posId(pos: NotePos): string {
  return noteItemId(pos.string, pos.fret);
}

/** Parse a `"<string>:<fret>"` id back to a `NotePos`, or `null` if malformed. */
export function parseNoteItemId(id: string): NotePos | null {
  const m = /^(\d+):(\d+)$/.exec(id);
  if (!m) return null;
  const string = Number(m[1]);
  const fret = Number(m[2]);
  if (!Number.isInteger(string) || !Number.isInteger(fret)) return null;
  if (string < 1 || fret < 0) return null;
  return { string, fret };
}

/** Stable ordering for a list of position ids — used to make every ranking in
 *  the learning layer deterministic on ties. Sorts by string, then fret. */
export function compareNoteItemId(a: string, b: string): number {
  const pa = parseNoteItemId(a);
  const pb = parseNoteItemId(b);
  if (!pa || !pb) return a < b ? -1 : a > b ? 1 : 0;
  return pa.string - pb.string || pa.fret - pb.fret;
}
