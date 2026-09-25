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
//   • Slice 2 — chords: the familiar open shapes are found (guitar, ukulele,
//     bass power chords), every chord sounds exactly its notes with the root
//     where it should be, movable shapes hold the root at the lowest fret,
//     ids round-trip; techniques: how each symbol is written, its frets stay
//     in range, the note it ends on, and the new forms survive normalisation

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
  tabItemId, parseTabItemId, parseTabChordItemId, parseTabTechniqueItemId, isValidTabItemId, TAB_TECHNIQUES,
} = await import('../src/learning/tabItem.ts');
const {
  buildTabChordPool, chordName, chordShapeLabel, chordQualitiesFor, chordsRootInBass,
} = await import('../src/learning/tabChords.ts');
const { buildTechniqueQuestion, tabTechniquePool } = await import('../src/learning/tabTechniques.ts');
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

// ── Slice 2: chords ────────────────────────────────────────────────────
const QUALITY_PCS: Record<string, number[]> = { major: [0, 4, 7], minor: [0, 3, 7], dom7: [0, 4, 7, 10], power: [0, 7] };
const shapesOf = (id: string, range: 'open' | 'low' | 'twelve' | 'high', naturals = true) => {
  const inst = (INSTRUMENTS as Record<string, Inst>)[id];
  return new Map(buildTabChordPool(inst, id as never, range, naturals).map((c) => [chordShapeLabel(c), chordName(c)]));
};
{
  const g = shapesOf('guitar', 'open');
  for (const [shape, name] of [
    ['x32010', 'C'], ['320003', 'G'], ['xx0232', 'D'], ['x02220', 'A'], ['022100', 'E'],
    ['x02210', 'Am'], ['022000', 'Em'], ['xx0231', 'Dm'], ['x32310', 'C7'], ['320001', 'G7'],
    ['x02020', 'A7'], ['020100', 'E7'], ['xx0212', 'D7'], ['x21202', 'B7'], ['022xxx', 'E5'], ['x022xx', 'A5'],
  ]) eq(g.get(shape), name, `guitar open shape ${shape}`);
  const hi = shapesOf('guitar', 'twelve');
  for (const [shape, name] of [['799877', 'B'], ['x24442', 'B'], ['577655', 'A'], ['x24432', 'Bm'], ['577555', 'Am']]) {
    eq(hi.get(shape), name, `guitar barre shape ${shape}`);
  }
  check(!hi.has('764447') && !hi.has('x21402'), 'no odd mixed voicings');
  const uke = shapesOf('ukulele', 'open');
  for (const [shape, name] of [['0003', 'C'], ['2010', 'F'], ['0232', 'G'], ['2000', 'Am'], ['0212', 'G7'], ['0100', 'A7']]) {
    eq(uke.get(shape), name, `ukulele shape ${shape}`);
  }
  const bass = shapesOf('bass', 'low');
  check([...bass.values()].every((n) => n.endsWith('5')), 'bass tab offers power chords only');
  eq(bass.get('022x'), 'E5', 'bass E5');
  eq(chordQualitiesFor('mandolin'), [], 'no chords on the eight-string mandolin model');
}
for (const inst of Object.values(INSTRUMENTS) as Inst[]) {
  for (const range of ['open', 'low', 'twelve', 'high'] as const) {
    const top = range === 'open' ? 3 : range === 'low' ? 5 : range === 'twelve' ? 12 : inst.maxFret;
    for (const c of buildTabChordPool(inst, inst.id as never, range, false)) {
      const want = new Set(QUALITY_PCS[c.quality].map((i) => (c.rootPc + i) % 12));
      const heard = c.positions.map((p) => inst.openMidi[p.string - 1] + p.fret);
      const got = new Set(heard.map((m) => m % 12));
      check([...got].every((pc) => want.has(pc)), `${inst.id} ${range} ${chordName(c)} sounds only its notes`);
      // Every note is there — a seventh chord may leave out its fifth.
      check([...want].every((pc) => got.has(pc) || (c.quality === 'dom7' && pc === (c.rootPc + 7) % 12)), `${inst.id} ${range} ${chordName(c)} sounds all its notes`);
      check(Math.min(...heard) === c.midi, `${inst.id} chord midi is its lowest note`);
      if (chordsRootInBass(inst.id as never)) check(c.midi % 12 === c.rootPc, `${inst.id} ${chordName(c)} root in the bass`);
      const fretted = c.positions.map((p) => p.fret).filter((f) => f > 0);
      if (fretted.length) check(Math.max(...fretted) - Math.min(...fretted) <= 3, `${inst.id} chord spans at most four frets`);
      for (const p of c.positions) {
        check(p.fret <= Math.min(inst.maxFret, top), 'chord inside the range');
        check(range !== 'high' || p.fret >= 12, 'high-range chord from fret 12');
        check((inst.minFrets?.[p.string - 1] ?? 0) === 0, 'no chord on a drone string');
      }
      eq(parseTabChordItemId(c.itemId), [...c.frets].reverse(), `${inst.id} chord id round-trips`);
      check(isValidTabItemId(c.itemId), 'chord id is a valid tab id');
    }
  }
}
eq(parseTabChordItemId('tab:chord:x.3.2.0.1.0'), [null, 3, 2, 0, 1, 0], 'parse a chord id');
eq(parseTabChordItemId('tab:chord:x.x'), null, 'a chord with nothing played is rejected');
eq(parseTabChordItemId('tab:chord:3.y'), null, 'a bad fret is rejected');

// ── Slice 2: techniques ────────────────────────────────────────────────
const TECH_TEXT: Record<string, RegExp> = {
  hammerOn: /^\d+h\d+$/, pullOff: /^\d+p\d+$/, slideUp: /^\d+\/\d+$/, slideDown: /^\d+\\\d+$/,
  bend: /^\d+b\d+$/, vibrato: /^\d+~$/, mutedNote: /^x$/, palmMute: /^\d+$/,
};
for (const inst of Object.values(INSTRUMENTS) as Inst[]) {
  for (const range of ['open', 'low', 'twelve', 'high'] as const) {
    const pool = tabTechniquePool(inst, range, false);
    check(pool.length >= 6, `${inst.id} ${range} has room for most symbols (${pool.length})`);
    check(!tabTechniquePool(inst, range, true).includes('mutedNote'), 'the muted note has no pitch to name');
    for (const tech of pool) {
      for (let i = 0; i < 20; i++) {
        const q = buildTechniqueQuestion(inst, range, tech, false);
        if (!q) { check(false, `${inst.id} ${range} ${tech} question`); continue; }
        eq(parseTabTechniqueItemId(q.itemId), tech, 'technique id');
        const end = q.to ?? q.from;
        if (tech !== 'mutedNote') check(q.midi === inst.openMidi[q.string - 1] + end, `${tech} ends on its second note`);
        const lo = range === 'high' ? 12 : 0;
        if (tech !== 'mutedNote') check(q.from >= lo && q.from >= (inst.minFrets?.[q.string - 1] ?? 0), `${tech} starts inside the range`);
        check(TECH_TEXT[tech].test(q.text), `${tech} written as ${q.text}`);
        if (tech === 'hammerOn' || tech === 'slideUp') check((q.to ?? 0) > q.from, `${tech} goes up`);
        if (tech === 'pullOff' || tech === 'slideDown') check((q.to ?? 99) < q.from, `${tech} goes down`);
        if (tech === 'bend') eq(q.to, q.from + 2, 'a bend reaches a whole step up');
        if (tech === 'palmMute') eq(q.above, 'PM', 'palm mute is written above');
      }
    }
  }
}
{
  const g = (INSTRUMENTS as Record<string, Inst>).guitar;
  for (let i = 0; i < 50; i++) {
    const q = buildTechniqueQuestion(g, 'open', 'hammerOn', true);
    check(q != null && NATURALS.has(q.midi % 12), 'naturals only: the note at the end is natural');
  }
  eq(TAB_TECHNIQUES.length, 8, 'eight symbols');
  const t0 = Date.UTC(2026, 8, 25, 10);
  let st = emptyInstrumentState(t0);
  st = recordTabAnswer(st, 'tab:chord:x.3.2.0.1.0', 'nameChord', true, 2, t0);
  st = recordTabAnswer(st, 'tab:chord:x.3.2.0.1.0', 'playChord', false, 9, t0 + 1);
  st = recordTabAnswer(st, 'tab:tech:bend', 'nameTechnique', true, 1, t0 + 2);
  st = recordTabAnswer(st, 'tab:tech:slideUp', 'techniqueNote', true, 1, t0 + 3);
  const round = normalizeLearningState(JSON.parse(JSON.stringify({ version: 1, instruments: { guitar: st } })), t0 + 10);
  eq(round.instruments.guitar.tabHistory.map((r: { form: string }) => r.form), ['nameChord', 'playChord', 'nameTechnique', 'techniqueNote'], 'Slice 2 forms survive normalisation');
  eq(Object.keys(round.instruments.guitar.tabSrs).sort(), ['tab:chord:x.3.2.0.1.0', 'tab:tech:bend', 'tab:tech:slideUp'], 'chord and technique items in the tab schedule');
  eq(round.instruments.guitar.tabDaily.completed, 4, 'chords and techniques tick the tab goal');
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('check-tabs: all checks passed');
