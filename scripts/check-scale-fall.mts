// Focused checks for src/learning/scaleFall.ts — the pure falling-rows
// stream behind Scales Exercise A ("build the scale", Piano Tiles style).
//
//   node --experimental-strip-types scripts/check-scale-fall.mts
//
// Covers:
//   • scaleRun: strictly ascending by pitch (a run up the scale), every note
//     taken from the shape, every pitch class of the shape present, a doubled
//     pitch played once on the thicker string
//   • buildFallStream: one banner then the run per question, bottom to top;
//     each note row's target lane is a real shape position
//   • geometry + speed helpers: rowBottom / hasFallenOff / speedAt

import { register } from 'node:module';

register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
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

const { buildScalePool, pickScaleQuestion } = await import('../src/learning/scaleDrill.ts');
const { scaleRun, tonicRun, buildFallStream, midiAt, rowBottom, hasFallenOff, speedAt, START_OFFSET, scaleAccuracy, isScaleCorrect } =
  await import('../src/learning/scaleFall.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

console.log('scaleRun');
{
  // Two strings a major third apart (like G–B): string 2 fret 0 == string 3 fret 4.
  const openMidi = [59, 55];
  const run = scaleRun(
    [{ string: 1, fret: 0 }, { string: 2, fret: 4 }, { string: 2, fret: 2 }, { string: 1, fret: 3 }],
    openMidi,
  );
  check('doubled pitch played once, on the thicker string',
    run.length === 3 && run[1].string === 2 && run[1].fret === 4,
    JSON.stringify(run));
  check('ascending', run.every((p, i) => i === 0 || midiAt(p, openMidi) > midiAt(run[i - 1], openMidi)));
}

for (const id of ['guitar', 'bass'] as const) {
  const inst = INSTRUMENTS[id];
  const pool = buildScalePool(['minorPentatonic'], inst.stringCount);
  const rng = seeded(42);
  let bad = '';
  let doubled = 0;
  for (let n = 0; n < 400 && !bad; n++) {
    const q = pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret, rng, false);
    if (!q) { bad = 'no question'; break; }
    const run = scaleRun(q.shape, inst.openMidi);
    const midis = run.map((p) => midiAt(p, inst.openMidi));
    if (!midis.every((m, i) => i === 0 || m > midis[i - 1])) bad = `not strictly ascending ${midis}`;
    if (!run.every((p) => q.shape.some((s) => s.string === p.string && s.fret === p.fret))) bad = 'note outside shape';
    const shapePcs = new Set(q.shape.map((p) => midiAt(p, inst.openMidi) % 12));
    const runPcs = new Set(midis.map((m) => m % 12));
    if (shapePcs.size !== runPcs.size) bad = 'lost a pitch class';
    if (run.length < q.shape.length) doubled++;
  }
  check(`${id}: 400 random runs ascend within the shape`, bad === '', bad);
  console.log(`      (${doubled} of 400 shapes held a doubled pitch)`);
}

console.log('tonicRun');
for (const id of ['guitar', 'bass'] as const) {
  const inst = INSTRUMENTS[id];
  const pool = buildScalePool(['minorPentatonic', 'major'], inst.stringCount);
  for (const dir of ['up', 'down'] as const) {
    const rng = seeded(11);
    let bad = '';
    for (let n = 0; n < 400 && !bad; n++) {
      const q = pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret, rng, false, dir);
      if (!q) { bad = 'no question'; break; }
      const root = { string: q.rootString, fret: q.rootFret };
      const rootMidi = midiAt(root, inst.openMidi);
      const box = scaleRun(q.shape, inst.openMidi).map((p) => midiAt(p, inst.openMidi));
      const run = tonicRun(q.shape, inst.openMidi, dir, root).map((p) => midiAt(p, inst.openMidi));
      if (run[0] !== rootMidi || run[run.length - 1] !== rootMidi) { bad = `not tonic to tonic: ${run}`; break; }
      if (new Set(run).size !== box.length) { bad = 'does not cover the whole box'; break; }
      // Neighbouring steps are neighbouring notes of the box, and the run turns
      // exactly at the box's top and bottom.
      const idx = run.map((m) => box.indexOf(m));
      if (!idx.every((k, i) => i === 0 || Math.abs(k - idx[i - 1]) === 1)) { bad = `skips a note: ${idx}`; break; }
      const first = Math.sign(idx[1] - idx[0]);
      if (idx.length > 1 && first !== (dir === 'up' ? 1 : -1) && box.length > 1 && idx[0] !== (dir === 'up' ? box.length - 1 : 0)) { bad = `starts the wrong way: ${idx}`; break; }
      if (!idx.includes(0) || !idx.includes(box.length - 1)) { bad = 'misses an end of the box'; break; }
    }
    check(`${id} ${dir}: tonic → one end → the other end → tonic, no skipped note`, bad === '', bad);
  }
}

console.log('buildFallStream');
{
  const inst = INSTRUMENTS.guitar;
  const pool = buildScalePool(['minorPentatonic'], inst.stringCount);
  const rng = seeded(7);
  const qs = [0, 1, 2].map(() => pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret, rng, false)!);
  const s = buildFallStream(qs, inst.openMidi);
  const expected = qs.reduce((n, q) => {
    const run = tonicRun(q.shape, inst.openMidi, q.direction, { string: q.rootString, fret: q.rootFret });
    const gaps = run.reduce((g, p, i) => (i === 0 ? g : g + Math.max(0, Math.abs(p.fret - run[i - 1].fret) - 1)), 0);
    return n + 1 + run.length + gaps;
  }, 0);
  check('row count = banner + run + skipped-fret gaps per question', s.rows.length === expected, `${s.rows.length} vs ${expected}`);
  check('first row is the first banner', s.rows[0].kind === 'banner' && s.rows[0].q === 0);
  const banners = s.rows.filter((r) => r.kind === 'banner').map((r) => r.q);
  check('one banner per question, in order', JSON.stringify(banners) === '[0,1,2]');
  check('every note row targets a shape position of its question', s.rows.every((r) =>
    r.kind !== 'note' || qs[r.q].shape.some((p) => p.string === r.string && p.fret === r.fret)));
  const notesOnly = s.rows.filter((r) => r.kind === 'note') as { q: number; step: number }[];
  check('steps count up from 0 within each run', notesOnly.every((r, i) =>
    r.step === 0 ? (i === 0 || notesOnly[i - 1].q !== r.q) : notesOnly[i - 1].step === r.step - 1 && notesOnly[i - 1].q === r.q));
  // Every fret between two consecutive notes shows up as an empty row, in order.
  let gapsOk = true;
  let gapCount = 0;
  s.rows.forEach((r, i) => {
    if (r.kind !== 'note' || r.step === 0) return;
    let j = i - 1;
    const between: number[] = [];
    while (s.rows[j].kind === 'gap') { between.unshift((s.rows[j] as { fret: number }).fret); j--; }
    const prev = s.rows[j] as { kind: string; fret: number };
    const dir = Math.sign(r.fret - prev.fret);
    const want: number[] = [];
    for (let f = prev.fret + dir; dir !== 0 && f !== r.fret; f += dir) want.push(f);
    gapCount += between.length;
    if (JSON.stringify(between) !== JSON.stringify(want)) gapsOk = false;
  });
  check('skipped frets between consecutive notes are all shown, in the direction of travel', gapsOk);
  check('the sampled stream actually contains gap rows', gapCount > 0, `${gapCount}`);
  check('no gap row sits next to a banner', s.rows.every((r, i) =>
    r.kind !== 'gap' || (s.rows[i - 1].kind !== 'banner' && s.rows[i + 1]?.kind !== 'banner')));
  check('empty question list gives an empty stream', buildFallStream([], inst.openMidi).rows.length === 0);
}

console.log('slips + accuracy');
{
  const rows = [
    { kind: 'banner', q: 0 },
    { kind: 'note', q: 0, string: 1, fret: 1, step: 0 },
    { kind: 'gap', q: 0, fret: 2 },
    { kind: 'note', q: 0, string: 1, fret: 3, step: 1 },
    { kind: 'banner', q: 1 },
    { kind: 'note', q: 1, string: 1, fret: 1, step: 0 },
  ] as const;
  const acc = scaleAccuracy(rows, [false, false, true, true, false, false], 0);
  check('counts the notes of one scale and its slipped notes, ignoring banners, gaps and other scales',
    acc.notes === 2 && acc.slips === 1, JSON.stringify(acc));
  check('a clean scale is correct', isScaleCorrect(10, 0));
  check('two slips in ten notes is still correct', isScaleCorrect(10, 2));
  check('three slips in ten notes is not', !isScaleCorrect(10, 3));
  check('a short five-note scale tolerates one slip', isScaleCorrect(5, 1) && !isScaleCorrect(5, 2));
  check('a very short run tolerates none', !isScaleCorrect(4, 1));
}

console.log('geometry + speed');
check('row 0 starts START_OFFSET above the bottom', rowBottom(0, 0) === START_OFFSET);
check('a row is not off while its top is still on screen', !hasFallenOff(2, 2 + START_OFFSET + 0.99));
check('a row is off once its top passes the bottom', hasFallenOff(2, 2 + START_OFFSET + 1));
const sp = { start: 1, max: 2, accel: 0.1 };
check('speed starts at start', speedAt(sp, 0) === 1);
check('speed ramps', Math.abs(speedAt(sp, 5) - 1.5) < 1e-9);
check('speed is capped', speedAt(sp, 1000) === 2);

if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall scale-fall checks passed');
