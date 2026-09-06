// Focused checks for the NoteItem foundation (src/learning/noteItem.ts), the
// P1 step of the Premium roadmap. There is no test runner in this repo, so this
// is a standalone script in the same spirit as the other scripts/check-*.mts —
// run by hand, never part of `npm run build`:
//
//   node scripts/check-note-item.mts
//
// It confirms:
//   1. noteItemId produces the documented "<string>:<fret>" form,
//   2. noteItemId <-> parseNoteItemId round-trips for every position,
//   3. parseNoteItemId rejects malformed / negative / non-integer ids,
//   4. isNoteItem accepts valid positions and rejects the obvious bad shapes,
//   5. noteItemsEqual is true only for the same position.

import {
  isNoteItem,
  noteItemId,
  parseNoteItemId,
  noteItemsEqual,
  type NoteItem,
} from '../src/learning/noteItem.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── 1: id format ───────────────────────────────────────────────────────
check('noteItemId format', noteItemId({ string: 6, fret: 3 }) === '6:3');
check('open-string id', noteItemId({ string: 1, fret: 0 }) === '1:0');

// ── 2: round-trip for every position on a generous neck ────────────────
{
  let stray = false;
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= 24; f++) {
      const item: NoteItem = { string: s, fret: f };
      const back = parseNoteItemId(noteItemId(item));
      if (!back || !noteItemsEqual(back, item)) stray = true;
    }
  }
  check('noteItemId <-> parseNoteItemId round-trips for every position', !stray);
}

// ── 3: parse rejects bad ids ──────────────────────────────────────────
for (const bad of ['', '6', '6:', ':3', '6:3:1', 'x:3', '6:-1', '6:3.5', ' 6:3', '6 : 3', '06:3']) {
  // '06:3' parses digits fine but is not a form noteItemId emits; \d+ still
  // accepts it, so this documents that leading zeros are tolerated on input.
  if (bad === '06:3') {
    check("parseNoteItemId tolerates '06:3' (leading zero)", parseNoteItemId(bad) !== null);
  } else {
    check(`parseNoteItemId rejects ${JSON.stringify(bad)}`, parseNoteItemId(bad) === null);
  }
}

// ── 4: isNoteItem ────────────────────────────────────────────────────
check('isNoteItem accepts a valid position', isNoteItem({ string: 3, fret: 5 }));
check('isNoteItem accepts an open string', isNoteItem({ string: 4, fret: 0 }));
for (const bad of [
  null, undefined, 42, 'x', {}, { string: 1 }, { fret: 0 },
  { string: 0, fret: 0 }, { string: -1, fret: 0 }, { string: 1, fret: -1 },
  { string: 1.5, fret: 0 }, { string: 1, fret: 2.5 },
  { string: '1', fret: '2' },
]) {
  check(`isNoteItem rejects ${JSON.stringify(bad) ?? String(bad)}`, !isNoteItem(bad));
}

// ── 5: equality ─────────────────────────────────────────────────────
check('noteItemsEqual: same position', noteItemsEqual({ string: 2, fret: 7 }, { string: 2, fret: 7 }));
check('noteItemsEqual: different fret', !noteItemsEqual({ string: 2, fret: 7 }, { string: 2, fret: 8 }));
check('noteItemsEqual: different string', !noteItemsEqual({ string: 2, fret: 7 }, { string: 3, fret: 7 }));

console.log(failures === 0
  ? '\nAll NoteItem checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
