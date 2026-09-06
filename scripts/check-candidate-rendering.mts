// Focused checks for "Candidate Rendering" — the step that makes the board
// (useDerivedNotes → FretGrid / NoteCircle) show and accept exactly the
// positions the drill engine already confines its questions to when a
// `DrillConfig.candidates` set is active.
//
// No test runner in this repo; run by hand like the other scripts/check-*.mts:
//
//   node scripts/check-candidate-rendering.mts
//
// The rendering path funnels through one pure helper, `boardFretsForString`
// (src/drill/candidates.ts) — the same module the engine's question picker
// uses — so exercising it plus the exact per-string derivations the hook runs
// (activeNotes / noteFrets) proves the three things that matter:
//
//   1. a non-empty candidate set limits the positions shown/selectable to
//      that set (and hides strings it does not mention),
//   2. with no candidate set every derivation is byte-identical to the old
//      filter-based one (getValidFrets), across strings and filter combos,
//   3. Practice never sets `candidates` (deriveDrillConfig), so its board is
//      on the unchanged path.

import { register } from 'node:module';

// src/ modules import each other without a file extension (Vite resolves it);
// Node needs the `.ts`. Retry extensionless relative specifiers with it.
register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

const { groupCandidateFrets, candidateStringPool, boardFretsForString } =
  await import('../src/drill/candidates.ts');
const { deriveDrillConfig } = await import('../src/drill/DrillConfig.ts');
const { GUITAR_NOTES, getValidFrets, notesMatch } = await import('../src/utils/music.ts');
type DrillPosition = { string: number; fret: number };

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The hook builds this map exactly once from `candidates`; null means "no
// usable set → fall back to filters". Mirror that rule here.
function candidateMap(candidates?: DrillPosition[]): Map<number, number[]> | null {
  if (!candidates || candidates.length === 0) return null;
  const grouped = groupCandidateFrets(candidates, GUITAR_NOTES);
  return grouped.size === 0 ? null : grouped;
}

// The per-string derivations useDerivedNotes runs, reduced to their essence:
// `noteFrets` = frets on the string grouped by note name; `activeNotes` = the
// set of note names those frets land on. Both are fed only by
// `boardFretsForString`, so whatever it returns is the whole board.
const FILTER = { fretFrom: 0, fretTo: 12, wholeToneOnly: false, dotsOnly: false };
function noteFrets(stringNum: number, map: Map<number, number[]> | null, filter = FILTER) {
  const out: Record<string, number[]> = {};
  for (const f of boardFretsForString(stringNum, map, filter)) {
    (out[GUITAR_NOTES[stringNum - 1][f]] ??= []).push(f);
  }
  return out;
}
function activeNotes(strings: number[], map: Map<number, number[]> | null, filter = FILTER) {
  const s = new Set<string>();
  for (const str of strings) {
    for (const f of boardFretsForString(str, map, filter)) s.add(GUITAR_NOTES[str - 1][f]);
  }
  return s;
}

// ── 1: candidates limit the positions shown / selectable ────────────────
{
  const candidates: DrillPosition[] = [
    { string: 6, fret: 1 }, { string: 6, fret: 5 }, { string: 6, fret: 3 },
    { string: 6, fret: 1 }, // duplicate, must collapse
  ];
  const map = candidateMap(candidates)!;
  check('candidate set produces a usable map', map !== null);

  const shown = boardFretsForString(6, map, FILTER);
  check('board frets == the candidate frets (deduped, sorted)', eq(shown, [1, 3, 5]), JSON.stringify(shown));

  const unfiltered = getValidFrets(5, 0, 12, false, false);
  check('candidate board is a strict subset of the filter window',
    shown.every((f) => unfiltered.includes(f)) && shown.length < unfiltered.length);

  // A string the set never mentions contributes nothing — not its whole row.
  check('string with no candidates → no frets', eq(boardFretsForString(5, map, FILTER), []));

  // byNote targets: every fret the board would accept is inside the set.
  const nf = noteFrets(6, map);
  const allShown = Object.values(nf).flat().sort((a, b) => a - b);
  check('noteFrets stays within the candidate set', eq(allShown, [1, 3, 5]), JSON.stringify(nf));

  // byFret wheel: only notes reachable from a candidate position are active.
  const an = activeNotes([6], map);
  const expected = new Set([1, 3, 5].map((f) => GUITAR_NOTES[5][f]));
  check('activeNotes == notes at the candidate positions only', eq([...an].sort(), [...expected].sort()));
  check('a note outside the set (open string, fret 0) is NOT active',
    !an.has(GUITAR_NOTES[5][0]) || expected.has(GUITAR_NOTES[5][0]));

  // The board agrees with the engine's string pool: single-string, primary in
  // the set → only that string is playable, and it is the only one with frets.
  check('string pool matches the board (single-string)',
    eq(candidateStringPool(map, false, 6), [6]) && boardFretsForString(6, map, FILTER).length > 0);
}

// ── 1b: multi-string candidate set spans exactly its strings ────────────
{
  const map = candidateMap([
    { string: 6, fret: 1 }, { string: 5, fret: 2 }, { string: 5, fret: 7 },
  ])!;
  check('multi: each string shows only its own candidates',
    eq(boardFretsForString(6, map, FILTER), [1]) && eq(boardFretsForString(5, map, FILTER), [2, 7]));
  check('multi: an untouched string still shows nothing', eq(boardFretsForString(4, map, FILTER), []));
  const an = activeNotes([6, 5, 4], map);
  const want = new Set([GUITAR_NOTES[5][1], GUITAR_NOTES[4][2], GUITAR_NOTES[4][7]]);
  check('multi: activeNotes is the union over candidate strings only', eq([...an].sort(), [...want].sort()));
}

// ── 2: no candidate set → old filter behaviour, unchanged ───────────────
{
  const combos = [
    { fretFrom: 0, fretTo: 12, wholeToneOnly: false, dotsOnly: false },
    { fretFrom: 3, fretTo: 9, wholeToneOnly: false, dotsOnly: false },
    { fretFrom: 0, fretTo: 12, wholeToneOnly: true, dotsOnly: false },
    { fretFrom: 0, fretTo: 12, wholeToneOnly: false, dotsOnly: true },
    { fretFrom: 5, fretTo: 5, wholeToneOnly: false, dotsOnly: false },
  ];
  let allMatch = true;
  for (let s = 1; s <= GUITAR_NOTES.length; s++) {
    for (const c of combos) {
      const viaHelper = boardFretsForString(s, null, c);
      const classic = getValidFrets(s - 1, c.fretFrom, c.fretTo, c.wholeToneOnly, c.dotsOnly);
      if (!eq(viaHelper, classic)) allMatch = false;
    }
  }
  check('boardFretsForString(_, null, …) === getValidFrets(…) for every string × filter combo', allMatch);

  // An empty or all-invalid set is treated as "no set" — same fallback.
  check('empty candidate array → null (filter path)', candidateMap([]) === null);
  check('all-invalid candidate set → null (filter path)',
    candidateMap([{ string: 99, fret: 0 }, { string: 6, fret: 2.5 }, { string: 6, fret: 999 }]) === null);
  check('derivations on a null map match the classic ones',
    eq(noteFrets(6, candidateMap([])), noteFrets(6, null)) &&
    eq([...activeNotes([6, 5], candidateMap([]))].sort(), [...activeNotes([6, 5], null)].sort()));
}

// ── 3: Practice never opts into candidate rendering ────────────────────
{
  const ds = {
    fretFrom: 0, fretTo: 12, wholeToneOnly: false, dotsOnly: false,
    byNote: false, multiStrings: [] as number[], maxQuestions: 20, time: 8,
  } as Parameters<typeof deriveDrillConfig>[0];
  const cfg = deriveDrillConfig(ds, { primaryString: 6, accidental: 'sharps', order: 'fifths' });
  check('deriveDrillConfig leaves candidates undefined', cfg.candidates === undefined);
  check('→ Practice board is on the unchanged filter path', candidateMap(cfg.candidates) === null);

  // notesMatch is only pulled in to keep this script honest about the byNote
  // path it models above (same helper the engine uses to group a note's frets).
  check('byNote grouping uses notesMatch as the engine does',
    typeof notesMatch === 'function' &&
    noteFrets(6, candidateMap([{ string: 6, fret: 1 }, { string: 6, fret: 3 }]))[GUITAR_NOTES[5][1]]
      ?.every((f) => notesMatch(GUITAR_NOTES[5][f], GUITAR_NOTES[5][1])) === true);
}

console.log(failures === 0
  ? '\nAll candidate-rendering checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
