// Focused checks for src/utils/staff.ts and src/learning/staffDrill.ts — the
// Staff reading domain (staff-reading-spec.md).
//
//   node --experimental-strip-types scripts/check-staff.mts
//
// Covers:
//   • staff positions of known notes in both clefs, sharps and flats
//   • ledger lines above and below the staff
//   • guitar / bass written an octave above the sound, ukulele at pitch
//   • the question pool: every position plays its pitch, naturals filter,
//     banjo's short fifth string, fret ranges
//   • the picker never repeats the previous pitch and favours due items

import { register } from 'node:module';

register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}" +
    "export async function load(u,c,n){" +
    "const r=await n(u,c);" +
    "const s=r.source==null?null:r.source.toString();" +
    "if(s!==null&&s.includes('import.meta.env')){" +
    "return {...r, source: s.split('import.meta.env').join('({BASE_URL:\"/\"})')};" +
    "}return r;}",
  ),
  import.meta.url,
);

const { staffPosition, ledgerLines, staffSpecFor, spellPitch } = await import('../src/utils/staff.ts');
const { buildStaffPool, pickStaffQuestion, staffNameOptions } = await import('../src/learning/staffDrill.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error('FAIL:', msg); }
}
const eq = (a: unknown, b: unknown, msg: string) =>
  check(JSON.stringify(a) === JSON.stringify(b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// Treble clef: E4 bottom line, F5 top line, middle C one ledger below.
eq(staffPosition(64, 'treble', 'sharps'), 0, 'E4 on treble bottom line');
eq(staffPosition(77, 'treble', 'sharps'), 8, 'F5 on treble top line');
eq(staffPosition(71, 'treble', 'sharps'), 4, 'B4 on treble middle line');
eq(staffPosition(60, 'treble', 'sharps'), -2, 'C4 one ledger below treble');
eq(staffPosition(81, 'treble', 'sharps'), 10, 'A5 one ledger above treble');
// Bass clef: G2 bottom line, A3 top line, middle C one ledger above.
eq(staffPosition(43, 'bass', 'sharps'), 0, 'G2 on bass bottom line');
eq(staffPosition(57, 'bass', 'sharps'), 8, 'A3 on bass top line');
eq(staffPosition(53, 'bass', 'sharps'), 6, 'F3 on the bass F line');
eq(staffPosition(60, 'bass', 'sharps'), 10, 'C4 one ledger above bass');
// Accidental spelling moves the head: F#4 sits on F's space, Gb4 on G's line.
eq(staffPosition(66, 'treble', 'sharps'), 1, 'F#4 on the F space');
eq(staffPosition(66, 'treble', 'flats'), 2, 'Gb4 on the G line');
eq(spellPitch(66, 'flats'), { letter: 'G', accidental: 'b', octave: 4 }, 'Gb4 spelling');
eq(spellPitch(61, 'sharps'), { letter: 'C', accidental: '#', octave: 4 }, 'C#4 spelling');

eq(ledgerLines(4), [], 'no ledger inside the staff');
eq(ledgerLines(-1), [], 'no ledger just below the staff');
eq(ledgerLines(-2), [-2], 'one ledger for middle C');
eq(ledgerLines(-7), [-2, -4, -6], 'three ledgers under E3 written');
eq(ledgerLines(9), [], 'no ledger just above the staff');
eq(ledgerLines(12), [10, 12], 'two ledgers above');

// Guitar low E (E2, MIDI 40) is written E3: three ledger lines below treble.
const guitarSpec = staffSpecFor('guitar');
eq(guitarSpec, { clef: 'treble', writtenShift: 12, octaveMark: true }, 'guitar staff spec');
eq(staffPosition(40 + guitarSpec.writtenShift, 'treble', 'sharps'), -7, 'guitar low E written below 3 ledgers');
// Open high E string (E4, 64) is written E5, the top space.
eq(staffPosition(64 + guitarSpec.writtenShift, 'treble', 'sharps'), 7, 'guitar high E written in the top space');
const bassSpec = staffSpecFor('bass');
eq(bassSpec.clef, 'bass', 'bass uses the bass clef');
// Bass low E (E1, 28) is written E2: one ledger below the bass staff.
eq(staffPosition(28 + bassSpec.writtenShift, 'bass', 'sharps'), -2, 'bass low E written one ledger below');
eq(staffSpecFor('ukulele').writtenShift, 0, 'ukulele written at pitch');

eq(staffNameOptions(true), ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'natural options');
eq(staffNameOptions(false).length, 12, 'all twelve options');

// Pools.
for (const inst of Object.values(INSTRUMENTS) as Array<{ id: string; openMidi: number[]; maxFret: number; minFrets?: number[] }>) {
  for (const range of ['open', 'low', 'twelve'] as const) {
    for (const naturalsOnly of [true, false]) {
      const pool = buildStaffPool(inst, range, naturalsOnly);
      check(pool.length > 0, `${inst.id} ${range} pool not empty`);
      for (const item of pool) {
        check(item.itemId === `staff:${item.midi}`, `${inst.id} item id`);
        if (naturalsOnly) check(spellPitch(item.midi, 'sharps').accidental === '', `${inst.id} naturals only`);
        for (const p of item.positions) {
          check(inst.openMidi[p.string - 1] + p.fret === item.midi, `${inst.id} position plays its pitch`);
          check(p.fret >= (inst.minFrets?.[p.string - 1] ?? 0), `${inst.id} respects minFrets`);
        }
        // Must fit the renderer: at most 4 ledger lines each way.
        const spec = staffSpecFor(inst.id as never);
        const pos = staffPosition(item.midi + spec.writtenShift, spec.clef, 'flats');
        check(pos >= -8 && pos <= 16, `${inst.id} ${range} midi ${item.midi} fits the staff (pos ${pos})`);
      }
    }
  }
}
const guitar = (INSTRUMENTS as Record<string, { openMidi: number[]; maxFret: number }>).guitar;
const openPool = buildStaffPool(guitar, 'open', true);
eq(openPool[0].midi, 40, 'guitar open pool starts on low E');
eq(openPool.at(-1)!.midi, 67, 'guitar open pool ends on G4 (high E, fret 3)');

// Picker.
const now = 1_000_000;
for (let i = 0; i < 200; i++) {
  const q = pickStaffQuestion(openPool, {}, 40, now);
  check(q != null && q.midi !== 40, 'picker never repeats the previous pitch');
}
// With every item known and not due except one, the due one wins far more often.
const srs: Record<string, { itemId: string; bucket: number; dueAt: number; lastReviewedAt: number; reps: number; lapses: number }> = {};
for (const p of openPool) srs[p.itemId] = { itemId: p.itemId, bucket: 3, dueAt: now + 1e9, lastReviewedAt: 1, reps: 1, lapses: 0 };
srs['staff:45'].dueAt = now - 1;
let dueHits = 0;
for (let i = 0; i < 2000; i++) if (pickStaffQuestion(openPool, srs, null, now)?.midi === 45) dueHits++;
check(dueHits > 2000 * 2 / openPool.length, `due pitch favoured (${dueHits}/2000)`);

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('check-staff: all checks passed');
