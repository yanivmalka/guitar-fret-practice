// ── TabItem identity ─────────────────────────────────────────────────────
//
// tab-reading-spec.md §4. A tab never writes a pitch — it writes a place:
// "fret 3 on the second line". So the atomic thing the learner can know is
// one (string, fret) position read off the tab, and the item id carries
// exactly that. Two places that sound the same pitch are two different
// items, because reading them means reading two different lines.
//
// Slice 2 adds two more kinds of item, still in the same tab lane:
//   • a chord shape  — `tab:chord:<frets>`, the column as written, lowest
//     string first, `x` for a string not played (`x.3.2.0.1.0` = open C);
//   • a technique    — `tab:tech:<technique>`, the symbol itself (h, p, /…):
//     what is learnt is reading the symbol, whatever frets it is written on.
//
// Mirrors staffItem.ts. Tab SRS lives in its OWN `SrsMap`
// (`InstrumentLearningState.tabSrs`), never mixed into another schedule —
// in particular not the note `srs`, whose `"<string>:<fret>"` ids look alike
// but mean "name this fret", not "read this tab number".

export const TAB_ID_PREFIX = 'tab:';
const CHORD_PREFIX = `${TAB_ID_PREFIX}chord:`;
const TECH_PREFIX = `${TAB_ID_PREFIX}tech:`;

export type TabTechnique =
  | 'hammerOn' | 'pullOff' | 'slideUp' | 'slideDown' | 'bend' | 'vibrato' | 'mutedNote' | 'palmMute';
export const TAB_TECHNIQUES: readonly TabTechnique[] = [
  'hammerOn', 'pullOff', 'slideUp', 'slideDown', 'bend', 'vibrato', 'mutedNote', 'palmMute',
];

/** `"tab:<string>:<fret>"`, string 1 = the highest-pitched string. */
export function tabItemId(string: number, fret: number): string {
  return `${TAB_ID_PREFIX}${string}:${fret}`;
}

/** `"tab:chord:<frets>"` — `frets[0]` is the LOWEST string (as a chord is
 *  read and named, bass first); `null` = not played. */
export function tabChordItemId(fretsLowToHigh: readonly (number | null)[]): string {
  return `${CHORD_PREFIX}${fretsLowToHigh.map((f) => (f == null ? 'x' : String(f))).join('.')}`;
}

export function tabTechniqueItemId(t: TabTechnique): string {
  return `${TECH_PREFIX}${t}`;
}

export function isTabItemId(id: string): boolean {
  return id.startsWith(TAB_ID_PREFIX);
}

/** Parse a `"tab:<string>:<fret>"` id back to its position, or `null`
 *  (also `null` for a chord or technique id). */
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

/** Parse a chord id back to its frets (lowest string first), or `null`. */
export function parseTabChordItemId(id: string): (number | null)[] | null {
  if (!id.startsWith(CHORD_PREFIX)) return null;
  const parts = id.slice(CHORD_PREFIX.length).split('.');
  if (parts.length < 2 || parts.length > 12) return null;
  const out: (number | null)[] = [];
  for (const p of parts) {
    if (p === 'x') { out.push(null); continue; }
    const f = Number(p);
    if (!/^\d+$/.test(p) || f > 36) return null;
    out.push(f);
  }
  return out.some((f) => f != null) ? out : null;
}

export function parseTabTechniqueItemId(id: string): TabTechnique | null {
  if (!id.startsWith(TECH_PREFIX)) return null;
  const t = id.slice(TECH_PREFIX.length);
  return (TAB_TECHNIQUES as readonly string[]).includes(t) ? (t as TabTechnique) : null;
}

/** Whether `id` is any valid tab item (a place, a chord or a technique). */
export function isValidTabItemId(id: string): boolean {
  return parseTabItemId(id) != null || parseTabChordItemId(id) != null || parseTabTechniqueItemId(id) != null;
}
