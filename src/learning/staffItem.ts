// ── StaffItem identity ───────────────────────────────────────────────────
//
// staff-reading-spec.md §4. The atomic thing the learner can know is one
// written pitch on the instrument's own staff — "the G on the second line".
// The clef is fixed per instrument and the learning state is already kept
// per instrument, so the sounding MIDI number alone identifies the item.
// Spelling (sharp vs flat) is a display choice, not part of the item.
//
// Mirrors intervalItem.ts / scaleItem.ts. Staff SRS lives in its OWN
// `SrsMap` (`InstrumentLearningState.staffSrs`), never mixed into the note,
// interval or scale schedules.

export const STAFF_ID_PREFIX = 'staff:';

/** `"staff:<sounding midi>"`. */
export function staffItemId(midi: number): string {
  return `${STAFF_ID_PREFIX}${midi}`;
}

export function isStaffItemId(id: string): boolean {
  return id.startsWith(STAFF_ID_PREFIX);
}

/** Parse a `"staff:<midi>"` id back to its MIDI number, or `null`. */
export function parseStaffItemId(id: string): number | null {
  if (!isStaffItemId(id)) return null;
  const midi = Number(id.slice(STAFF_ID_PREFIX.length));
  return Number.isInteger(midi) && midi >= 0 && midi <= 127 ? midi : null;
}
