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
//   • key signatures: sign positions, spelling, which notes need a sign in a
//     passage, and writtenMidiAt as the exact inverse of staffPosition
//   • the high range (fret 12 up) and key-filtered pools
//   • phrases: length, leap limit, no repeated pitch in a row
//   • the progress board's statuses and the separate staffDaily goal

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

const {
  staffPosition, ledgerLines, staffSpecFor, spellPitch, keySignaturePositions, keySpelling,
  keyPitchClasses, passageSigns, writtenMidiAt, KEY_IDS,
} = await import('../src/utils/staff.ts');
const {
  buildStaffPool, pickStaffQuestion, staffNameOptions, buildStaffPhrase, PHRASE_MAX_LEAP,
} = await import('../src/learning/staffDrill.ts');
const { buildStaffBoard } = await import('../src/learning/staffMastery.ts');
const {
  emptyInstrumentState, recordStaffAnswer, mergeInstrumentState, normalizeLearningState,
} = await import('../src/learning/learningState.ts');
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
  for (const range of ['open', 'low', 'twelve', 'high'] as const) {
    for (const naturalsOnly of [true, false]) {
      const pool = buildStaffPool(inst, range, naturalsOnly);
      check(pool.length > 0, `${inst.id} ${range} pool not empty`);
      for (const item of pool) {
        check(item.itemId === `staff:${item.midi}`, `${inst.id} item id`);
        if (naturalsOnly) check(spellPitch(item.midi, 'sharps').accidental === '', `${inst.id} naturals only`);
        for (const p of item.positions) {
          check(inst.openMidi[p.string - 1] + p.fret === item.midi, `${inst.id} position plays its pitch`);
          check(p.fret >= (inst.minFrets?.[p.string - 1] ?? 0), `${inst.id} respects minFrets`);
          if (range === 'high') check(p.fret >= 12, `${inst.id} high range starts at fret 12`);
        }
        // Up to fret 12 the notes stay within 4 ledger lines each way; the
        // high range may go further (the staff grows to fit the pool).
        const spec = staffSpecFor(inst.id as never);
        const pos = staffPosition(item.midi + spec.writtenShift, spec.clef, 'flats');
        if (range !== 'high') check(pos >= -8 && pos <= 16, `${inst.id} ${range} midi ${item.midi} fits the staff (pos ${pos})`);
        check(pos >= -10 && pos <= 22, `${inst.id} ${range} midi ${item.midi} within 7 ledger lines (pos ${pos})`);
      }
    }
  }
}
const guitar = (INSTRUMENTS as Record<string, { openMidi: number[]; maxFret: number }>).guitar;
const openPool = buildStaffPool(guitar, 'open', true);
eq(openPool[0].midi, 40, 'guitar open pool starts on low E');
eq(openPool.at(-1)!.midi, 67, 'guitar open pool ends on G4 (high E, fret 3)');

// Keys.
eq(keySignaturePositions('D', 'treble'), [{ position: 8, sign: '#' }, { position: 5, sign: '#' }], 'D major: F# on the top line, C# in the third space');
eq(keySignaturePositions('Bb', 'treble'), [{ position: 4, sign: 'b' }, { position: 7, sign: 'b' }], 'Bb major: Bb middle line, Eb fourth space');
eq(keySignaturePositions('G', 'bass'), [{ position: 6, sign: '#' }], 'G major bass clef: F# on the fourth line');
eq(keySignaturePositions('F', 'bass'), [{ position: 2, sign: 'b' }], 'F major bass clef: Bb on the second line');
eq(keySignaturePositions('C', 'treble'), [], 'C major: no signature');
eq(keySpelling('C', 'flats'), 'flats', 'C follows the app setting');
eq(keySpelling('E', 'flats'), 'sharps', 'sharp key spells with sharps');
eq(keySpelling('Eb', 'sharps'), 'flats', 'flat key spells with flats');
eq([...keyPitchClasses('A')].sort((a, b) => a - b), [1, 2, 4, 6, 8, 9, 11], 'A major pitch classes');
eq(staffNameOptions(true, 'D'), ['C#', 'D', 'E', 'F#', 'G', 'A', 'B'], 'D major chips');
// In every key, a key note spelled the key's way never needs its own sign.
for (const k of KEY_IDS) {
  for (const pc of keyPitchClasses(k)) {
    const midi = 60 + pc;
    const p = spellPitch(midi, keySpelling(k, 'sharps'));
    const pos = staffPosition(midi, 'treble', keySpelling(k, 'sharps'));
    eq(passageSigns([{ position: pos, accidental: p.accidental, letter: p.letter }], k), [''], k + ": key note " + midi + " needs no sign");
  }
}
// D major: F natural needs a natural sign; C#, then C natural on the same
// line; a sign repeated on the same line is not written twice.
eq(passageSigns([{ position: 1, accidental: '', letter: 'F' }], 'D'), ['n'], 'F natural in D major');
eq(passageSigns([
  { position: 5, accidental: '#', letter: 'C' },
  { position: 5, accidental: '', letter: 'C' },
  { position: 5, accidental: '', letter: 'C' },
], 'D'), ['', 'n', ''], 'natural holds for the rest of the bar');
eq(passageSigns([
  { position: 1, accidental: '#', letter: 'F' },
  { position: 1, accidental: '#', letter: 'F' },
  { position: 8, accidental: '', letter: 'F' },
], 'C'), ['#', '', ''], 'a sharp holds on its own line only');
// writtenMidiAt inverts staffPosition for every pitch, in every key and clef.
for (const k of KEY_IDS) {
  for (const clef of ['treble', 'bass'] as const) {
    const spell = keySpelling(k, 'flats');
    for (let midi = 30; midi <= 100; midi++) {
      const p = spellPitch(midi, spell);
      const pos = staffPosition(midi, clef, spell);
      const sign = passageSigns([{ position: pos, accidental: p.accidental, letter: p.letter }], k)[0];
      eq(writtenMidiAt(pos, clef, sign, k), midi, k + " " + clef + " midi " + midi + " round-trips");
    }
  }
}
// Explicit signs override the key.
eq(writtenMidiAt(1, 'treble', 'n', 'D'), 65, 'F natural in D major');
eq(writtenMidiAt(1, 'treble', '', 'D'), 66, 'plain F in D major is F#');
eq(writtenMidiAt(4, 'treble', 'b', 'C'), 70, 'Bb written with a flat');
const guitarInst = (INSTRUMENTS as Record<string, { openMidi: number[]; maxFret: number }>).guitar;
for (const item of buildStaffPool(guitarInst, 'twelve', true, 'Eb')) {
  check(keyPitchClasses('Eb').has(item.midi % 12), "Eb pool note " + item.midi + " in the key");
}
const highPool = buildStaffPool(guitarInst, 'high', true);
eq(highPool[0].midi, 52, 'guitar high range starts on E3 (low E, fret 12)');

// Phrases.
const twelvePool = buildStaffPool(guitarInst, 'twelve', true);
for (let i = 0; i < 300; i++) {
  const ph = buildStaffPhrase(twelvePool, {}, 4, null, 1_000_000);
  check(ph.length === 4, 'phrase has four notes');
  for (let j = 1; j < ph.length; j++) {
    const a = twelvePool.indexOf(ph[j - 1]);
    const b = twelvePool.indexOf(ph[j]);
    check(a !== b, 'phrase never repeats a pitch in a row');
    check(Math.abs(a - b) <= PHRASE_MAX_LEAP, "phrase leap " + Math.abs(a - b) + " within limit");
  }
}

// Progress board + the separate staff daily goal.
{
  const t0 = Date.UTC(2026, 8, 25, 10);
  let st = emptyInstrumentState(t0);
  const pool = buildStaffPool(guitarInst, 'open', true);
  for (let i = 0; i < 8; i++) st = recordStaffAnswer(st, pool[0].itemId, 'readPhrase', true, 1, t0 + i * 60_000);
  st = recordStaffAnswer(st, pool[1].itemId, 'findOnStaff', false, 3, t0 + 10 * 60_000);
  const board = buildStaffBoard(pool, st.staffSrs, st.staffHistory, t0 + 11 * 60_000);
  eq(board[0].status, 'mastered', 'eight right answers -> mastered');
  eq(board[1].status, 'learning', 'one miss -> learning');
  eq(board[2].status, 'notStarted', 'untouched -> not started');
  eq(st.staffDaily.completed, 9, 'staff answers tick staffDaily');
  eq(st.daily.completed, 0, 'staff answers never tick the note daily goal');
  const other = recordStaffAnswer(emptyInstrumentState(t0), pool[2].itemId, 'nameNote', true, 1, t0 + 5_000);
  const merged = mergeInstrumentState(st, other);
  eq(merged.staffDaily.completed, 9, 'same-day staffDaily merge keeps the higher count');
  check(merged.staffSrs[pool[2].itemId] != null && merged.staffSrs[pool[0].itemId] != null, 'staffSrs merges per item');
  const round = normalizeLearningState(JSON.parse(JSON.stringify({ version: 1, instruments: { guitar: merged } })), t0 + 20 * 60_000);
  eq(round.instruments.guitar.staffHistory.length, merged.staffHistory.length, 'new forms survive normalisation');
  eq(round.instruments.guitar.staffDaily.completed, 9, 'staffDaily survives normalisation');
}

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
