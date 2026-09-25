// ── TabItem identity ─────────────────────────────────────────────────────
//
// tab-reading-spec.md §4. A tab never writes a pitch — it writes a place:
// "fret 3 on the second line". So the atomic thing the learner can know is
// one (string, fret) position read off the tab, and the item id carries
// exactly that. Two places that sound the same pitch are two different
// items, because reading them means reading two different lines.
//
// Mirrors staffItem.ts. Tab SRS lives in its OWN `SrsMap`
// (`InstrumentLearningState.tabSrs`), never mixed into another schedule —
// in particular not the note `srs`, whose `"<string>:<fret>"` ids look alike
// but mean "name this fret", not "read this tab number".

export const TAB_ID_PREFIX = 'tab:';

/** `"tab:<string>:<fret>"`, string 1 = the highest-pitched string. */
export function tabItemId(string: number, fret: number): string {
  return `${TAB_ID_PREFIX}${string}:${fret}`;
}

export function isTabItemId(id: string): boolean {
  return id.startsWith(TAB_ID_PREFIX);
}

/** Parse a `"tab:<string>:<fret>"` id back to its position, or `null`. */
export function parseTabItemId(id: string): { string: number; fret: number } | null {
  if (!isTabItemId(id)) return null;
  const parts = id.slice(TAB_ID_PREFIX.length).split(':');
  if (parts.length !== 2) return null;
  const string = Number(parts[0]);
  const fret = Number(parts[1]);
  if (!Number.isInteger(string) || string < 1 || string > 12) return null;
  if (!Number.isInteger(fret) || fret < 0 || fret > 36) return null;
  return { string, fret };
}
