// Focused checks for the explicit-candidate-set support added in the
// Practice/Game split (Task 2). There is no test runner in this repo, so this
// is a standalone script in the same spirit as the other scripts/*.mts —
// run by hand, never part of `npm run build`:
//
//   node scripts/check-candidates.mts
//
// It exercises the pure pieces the drill engine now leans on
// (src/drill/candidates.ts) plus a small simulation of the engine's
// "pick a string, then a fret" step, to confirm:
//   1. a non-empty candidate set only ever yields listed positions,
//   2. a tiny candidate set never picks outside itself,
//   3. duplicate candidates don't break selection,
//   4. an empty / all-invalid set collapses to null (→ engine keeps its old
//      filter-based behaviour),
//   5. byFret and byNote position resolution both stay within the set,
//   6. multi-string rotation stays within the set.

import { groupCandidateFrets, candidateStringPool, type DrillPosition } from '../src/drill/candidates.ts';
import { GUITAR_NOTES, notesMatch } from '../src/utils/music.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// A faithful copy of the engine's shuffle-bag pick (useGameEngine.pickSmartFret),
// minus the React refs — enough to prove selection stays inside `validFrets`
// and survives duplicates / a length-1 pool.
function makePicker() {
  let pool: number[] = [];
  let lastNote: string | null = null;
  return function pick(validFrets: number[], strIdx: number): number {
    if (validFrets.length === 0) return 0;
    pool = pool.filter((f) => validFrets.includes(f));
    if (pool.length === 0) {
      const bag = [...validFrets];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      pool = bag;
    }
    const lastFret = lastNote !== null
      ? validFrets.find((f) => GUITAR_NOTES[strIdx]?.[f] === lastNote) ?? -1
      : -1;
    if (pool[0] === lastFret && pool.length > 1) pool.push(pool.shift()!);
    const picked = pool.shift()!;
    lastNote = GUITAR_NOTES[strIdx][picked];
    return picked ?? validFrets[0];
  };
}

// ── 1/2/3: grouping ─────────────────────────────────────────────────────
{
  const set: DrillPosition[] = [
    { string: 6, fret: 1 }, { string: 6, fret: 5 }, { string: 6, fret: 3 },
    { string: 6, fret: 1 }, // duplicate
    { string: 5, fret: 7 },
  ];
  const grouped = groupCandidateFrets(set, GUITAR_NOTES);
  check('grouped by string', [...grouped.keys()].sort().join(',') === '5,6');
  check('string 6 frets deduped + sorted', JSON.stringify(grouped.get(6)) === '[1,3,5]',
    JSON.stringify(grouped.get(6)));
  check('string 5 frets', JSON.stringify(grouped.get(5)) === '[7]');
}

// ── 4: invalid / empty ─────────────────────────────────────────────────
{
  check('empty set → empty map', groupCandidateFrets([], GUITAR_NOTES).size === 0);
  const bad: DrillPosition[] = [
    { string: 99, fret: 1 },      // no such string
    { string: 6, fret: -1 },      // below range
    { string: 6, fret: 999 },     // above range
    { string: 6, fret: 2.5 },     // non-integer
  ];
  check('all-invalid set → empty map', groupCandidateFrets(bad, GUITAR_NOTES).size === 0);
  const mixed = groupCandidateFrets(
    [...bad, { string: 6, fret: 4 }], GUITAR_NOTES,
  );
  check('invalid entries dropped, valid kept', JSON.stringify(mixed.get(6)) === '[4]');
}

// ── 5: string pool ─────────────────────────────────────────────────────
{
  const grouped = groupCandidateFrets(
    [{ string: 6, fret: 1 }, { string: 5, fret: 2 }], GUITAR_NOTES,
  );
  check('multi → every candidate string',
    JSON.stringify(candidateStringPool(grouped, true, 6)) === '[5,6]');
  check('single, primary in set → just primary',
    JSON.stringify(candidateStringPool(grouped, false, 6)) === '[6]');
  check('single, primary absent → fall back to candidate strings',
    JSON.stringify(candidateStringPool(grouped, false, 1)) === '[5,6]');
}

// ── 1/2/3/6: selection never leaves the set ─────────────────────────────
{
  const set: DrillPosition[] = [
    { string: 6, fret: 1 }, { string: 6, fret: 5 },
    { string: 5, fret: 3 }, { string: 5, fret: 3 }, // dup
  ];
  const grouped = groupCandidateFrets(set, GUITAR_NOTES);
  const allowed = new Set(set.map((p) => `${p.string}:${p.fret}`));

  // byFret, multi-string: 2000 questions, every one inside the set.
  const pickA = makePicker();
  let strayFret = false;
  const stringsSeen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const pool = candidateStringPool(grouped, true, 6);
    const s = pool[Math.floor(Math.random() * pool.length)];
    stringsSeen.add(s);
    const frets = grouped.get(s)!;
    const f = pickA(frets, s - 1);
    if (!allowed.has(`${s}:${f}`)) strayFret = true;
  }
  check('byFret/multi: no pick outside candidate set', !strayFret);
  check('byFret/multi: rotates across candidate strings', stringsSeen.size === 2);

  // byNote: the required-fret list is the candidate frets on that string whose
  // note matches — always a subset of the set.
  let strayNoteFret = false;
  for (let i = 0; i < 500; i++) {
    const s = 5;
    const frets = grouped.get(s)!;
    const asked = frets[Math.floor(Math.random() * frets.length)];
    const note = GUITAR_NOTES[s - 1][asked];
    const required = frets.filter((f) => notesMatch(GUITAR_NOTES[s - 1][f], note));
    if (required.some((f) => !allowed.has(`${s}:${f}`))) strayNoteFret = true;
    if (required.length === 0) strayNoteFret = true;
  }
  check('byNote: required frets stay within the set', !strayNoteFret);
}

// ── 3: degenerate single-candidate pool doesn't loop/throw ──────────────
{
  const grouped = groupCandidateFrets([{ string: 6, fret: 7 }], GUITAR_NOTES);
  const pick = makePicker();
  let ok = true;
  for (let i = 0; i < 50; i++) if (pick(grouped.get(6)!, 5) !== 7) ok = false;
  check('single-candidate pool always returns that candidate', ok);
}

console.log(failures === 0
  ? '\nAll candidate-selection checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
