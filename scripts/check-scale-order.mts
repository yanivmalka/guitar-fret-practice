// Focused checks for src/learning/scaleOrder.ts — the still neck section
// behind the Scales exercise "Tap the scale in order".
//
//   node --experimental-strip-types scripts/check-scale-order.mts
//
// Covers, on guitar and bass, both scale types, both directions:
//   • every shape tile maps to a step of the run, and every step has a tile
//   • the steps follow the run's pitch order (ascending up, descending down)
//   • a pitch held on two strings maps both tiles to the same step
//   • the section's fret range covers every shape tile

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
const { midiAt } = await import('../src/learning/scaleFall.ts');
const { buildOrderBoard, tileKey } = await import('../src/learning/scaleOrder.ts');
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

for (const id of ['guitar', 'bass'] as const) {
  const inst = INSTRUMENTS[id];
  for (const dir of ['up', 'down'] as const) {
    const pool = buildScalePool(['minorPentatonic', 'major'], inst.stringCount);
    const rng = seeded(7);
    let bad = '';
    let shared = 0;
    for (let n = 0; n < 400 && !bad; n++) {
      const q = pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret, rng, false, dir);
      if (!q) { bad = 'no question'; break; }
      const b = buildOrderBoard(q, inst.openMidi);
      const m = b.runMidi;
      const ordered = m.every((x, i) => i === 0 || (dir === 'up' ? x > m[i - 1] : x < m[i - 1]));
      if (!ordered) bad = `run not ${dir}: ${m}`;
      if (b.stepAt.size !== q.shape.length) bad = 'a shape tile has no step';
      for (const p of q.shape) {
        const step = b.stepAt.get(tileKey(p));
        if (step == null || m[step] !== midiAt(p, inst.openMidi)) bad = `tile ${tileKey(p)} on the wrong step`;
        if (p.fret < b.fromFret || p.fret > b.toFret) bad = `tile ${tileKey(p)} outside the section`;
      }
      const steps = new Set(b.stepAt.values());
      if (steps.size !== m.length) bad = 'a step has no tile';
      if (b.stepAt.size > m.length) shared++;
    }
    check(`${id} ${dir}: 400 random boards map every tile to its run step`, bad === '', bad);
    console.log(`      (${shared} boards had a pitch on two strings)`);
  }
}

if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
