// Focused checks for src/learning/tabItem.ts, tabDrill.ts and tabMastery.ts —
// the Tab reading domain (tab-reading-spec.md).
//
//   node --experimental-strip-types scripts/check-tabs.mts
//
// Covers:
//   • tab item ids round-trip, and bad ids are rejected
//   • the question pool: one item per (string, fret), each plays its pitch,
//     the naturals filter, banjo's short fifth string, the fret ranges
//   • the picker never repeats the previous position and favours due items
//   • riffs: length, neighbouring strings / nearby frets, no repeats in a row
//   • the progress board's statuses, the separate tabDaily goal, the merge
//     and normalisation of the new fields (and that they never touch the
//     staff or note lanes)

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

const { tabItemId, parseTabItemId } = await import('../src/learning/tabItem.ts');
const {
  buildTabPool, pickTabQuestion, buildTabRiff, tabNameOptions, RIFF_MAX_STRING_STEP, RIFF_MAX_FRET_STEP,
} = await import('../src/learning/tabDrill.ts');
const { buildTabBoard } = await import('../src/learning/tabMastery.ts');
const {
  emptyInstrumentState, recordTabAnswer, mergeInstrumentState, normalizeLearningState,
} = await import('../src/learning/learningState.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error('FAIL:', msg); }
}
const eq = (a: unknown, b: unknown, msg: string) =>
  check(JSON.stringify(a) === JSON.stringify(b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// Item ids.
eq(tabItemId(2, 3), 'tab:2:3', 'tab item id');
eq(parseTabItemId('tab:6:12'), { string: 6, fret: 12 }, 'parse a tab id');
eq(parseTabItemId('staff:40'), null, 'a staff id is not a tab id');
eq(parseTabItemId('tab:0:3'), null, 'string 0 rejected');
eq(parseTabItemId('tab:2:x'), null, 'non-numeric fret rejected');
eq(parseTabItemId('tab:2'), null, 'missing fret rejected');

eq(tabNameOptions(true), ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'natural options');
eq(tabNameOptions(false).length, 12, 'all twelve options');

// Pools.
type Inst = { id: string; openMidi: number[]; maxFret: number; minFrets?: number[] };
const NATURALS = new Set([0, 2, 4, 5, 7, 9, 11]);
for (const inst of Object.values(INSTRUMENTS) as Inst[]) {
  for (const range of ['open', 'low', 'twelve', 'high'] as const) {
    for (const naturalsOnly of [true, false]) {
      const pool = buildTabPool(inst, range, naturalsOnly);
      check(pool.length > 0, `${inst.id} ${range} pool not empty`);
      const ids = new Set(pool.map((p) => p.itemId));
      check(ids.size === pool.length, `${inst.id} ${range} one item per position`);
      for (const item of pool) {
        check(item.itemId === `tab:${item.string}:${item.fret}`, `${inst.id} item id matches its place`);
        eq(item.positions, [{ string: item.string, fret: item.fret }], `${inst.id} a tab item is its one place`);
        check(inst.openMidi[item.string - 1] + item.fret === item.midi, `${inst.id} position plays its pitch`);
        check(item.fret >= (inst.minFrets?.[item.string - 1] ?? 0), `${inst.id} respects minFrets`);
        if (naturalsOnly) check(NATURALS.has(item.midi % 12), `${inst.id} naturals only`);
        if (range === 'high') check(item.fret >= 12, `${inst.id} high range starts at fret 12`);
        if (range === 'open') check(item.fret <= 3, `${inst.id} open range stops at fret 3`);
      }
      if (!naturalsOnly && range === 'open') {
        const strings = inst.openMidi.length;
        const short = (inst.minFrets ?? []).reduce((a, m) => a + Math.min(m, 4), 0);
        eq(pool.length, strings * 4 - short, `${inst.id} open range has every place`);
      }
    }
  }
}

const guitar = (INSTRUMENTS as Record<string, Inst>).guitar;
const guitarInst = { openMidi: guitar.openMidi, maxFret: guitar.maxFret };
const openPool = buildTabPool(guitarInst, 'open', false);

// Riffs.
for (let i = 0; i < 300; i++) {
  const riff = buildTabRiff(openPool, {}, 5, null, 1_000_000);
  eq(riff.length, 5, 'riff length');
  for (let j = 1; j < riff.length; j++) {
    const a = riff[j - 1];
    const b = riff[j];
    check(a.itemId !== b.itemId, 'riff never repeats a place in a row');
    check(Math.abs(a.string - b.string) <= RIFF_MAX_STRING_STEP, 'riff moves at most one string');
    check(Math.abs(a.fret - b.fret) <= RIFF_MAX_FRET_STEP, 'riff stays under the hand');
  }
}

// Picker.
const now = 1_000_000;
for (let i = 0; i < 200; i++) {
  const q = pickTabQuestion(openPool, {}, 'tab:6:0', now);
  check(q != null && q.itemId !== 'tab:6:0', 'picker never repeats the previous place');
}
const srs: Record<string, { itemId: string; bucket: number; dueAt: number; lastReviewedAt: number; reps: number; lapses: number }> = {};
for (const p of openPool) srs[p.itemId] = { itemId: p.itemId, bucket: 3, dueAt: now + 1e9, lastReviewedAt: 1, reps: 1, lapses: 0 };
srs['tab:3:2'].dueAt = now - 1;
let dueHits = 0;
for (let i = 0; i < 2000; i++) if (pickTabQuestion(openPool, srs, null, now)?.itemId === 'tab:3:2') dueHits++;
check(dueHits > 2000 * 2 / openPool.length, `due place favoured (${dueHits}/2000)`);

// Progress board + the separate tab daily goal.
{
  const t0 = Date.UTC(2026, 8, 25, 10);
  let st = emptyInstrumentState(t0);
  const pool = buildTabPool(guitarInst, 'open', true);
  for (let i = 0; i < 8; i++) st = recordTabAnswer(st, pool[0].itemId, 'readRiff', true, 1, t0 + i * 60_000);
  st = recordTabAnswer(st, pool[1].itemId, 'writeTab', false, 3, t0 + 10 * 60_000);
  const board = buildTabBoard(pool, st.tabSrs, st.tabHistory, t0 + 11 * 60_000);
  eq(board[0].status, 'mastered', 'eight right answers -> mastered');
  eq(board[1].status, 'learning', 'one miss -> learning');
  eq(board[2].status, 'notStarted', 'untouched -> not started');
  eq(st.tabDaily.completed, 9, 'tab answers tick tabDaily');
  eq(st.daily.completed, 0, 'tab answers never tick the note daily goal');
  eq(st.staffDaily.completed, 0, 'tab answers never tick the staff daily goal');
  eq(Object.keys(st.staffSrs).length + Object.keys(st.srs).length, 0, 'tab answers stay out of the staff and note schedules');
  const other = recordTabAnswer(emptyInstrumentState(t0), pool[2].itemId, 'nameNote', true, 1, t0 + 5_000);
  const merged = mergeInstrumentState(st, other);
  eq(merged.tabDaily.completed, 9, 'same-day tabDaily merge keeps the higher count');
  check(merged.tabSrs[pool[2].itemId] != null && merged.tabSrs[pool[0].itemId] != null, 'tabSrs merges per item');
  eq(merged.tabHistory.length, 10, 'tab histories are a union');
  const round = normalizeLearningState(JSON.parse(JSON.stringify({ version: 1, instruments: { guitar: merged } })), t0 + 20 * 60_000);
  eq(round.instruments.guitar.tabHistory.length, merged.tabHistory.length, 'every form survives normalisation');
  eq(round.instruments.guitar.tabDaily.completed, 9, 'tabDaily survives normalisation');
  const junk = normalizeLearningState({
    version: 1,
    instruments: { guitar: { tabHistory: [
      { itemId: 'staff:40', form: 'nameNote', correct: true, seconds: 1, createdAt: t0 },
      { itemId: 'tab:1:0', form: 'findOnStaff', correct: true, seconds: 1, createdAt: t0 },
      { itemId: 'tab:1:0', form: 'writeTab', correct: true, seconds: 1, createdAt: t0 },
    ] } },
  }, t0);
  eq(junk.instruments.guitar.tabHistory.length, 1, 'rows with a foreign id or form are dropped');
  const old = normalizeLearningState({ version: 1, instruments: { guitar: { srs: {} } } }, t0);
  eq([Object.keys(old.instruments.guitar.tabSrs).length, old.instruments.guitar.tabHistory.length, old.instruments.guitar.tabDaily.target], [0, 0, 12], 'an older blob gets empty tab fields');
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('check-tabs: all checks passed');
