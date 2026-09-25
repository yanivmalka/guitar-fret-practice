// Focused checks for src/learning/scaleOrder.ts — the still neck section
// behind the Scales exercise "Tap the scale in order".
//
//   node --experimental-strip-types scripts/check-scale-order.mts
//
// Covers, on guitar and bass, both scale types, both directions:
//   • the run starts and ends on the tonic
//   • every shape tile is lit with its own pitch and is played at some step
//   • the section's fret range covers every shape tile
//   • lastStepOf: which number a note played twice shows

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
const { buildOrderBoard, tileKey, lastStepOf } = await import('../src/learning/scaleOrder.ts');
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
    for (let n = 0; n < 400 && !bad; n++) {
      const q = pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret, rng, false, dir);
      if (!q) { bad = 'no question'; break; }
      const b = buildOrderBoard(q, inst.openMidi);
      const rootMidi = midiAt({ string: q.rootString, fret: q.rootFret }, inst.openMidi);
      if (b.runMidi[0] !== rootMidi || b.runMidi[b.runMidi.length - 1] !== rootMidi) bad = 'run is not tonic to tonic';
      if (b.tileMidi.size !== q.shape.length) bad = 'a shape tile is not lit';
      for (const p of q.shape) {
        const m = b.tileMidi.get(tileKey(p));
        if (m !== midiAt(p, inst.openMidi)) bad = `tile ${tileKey(p)} has the wrong pitch`;
        if (!b.runMidi.includes(m!)) bad = `tile ${tileKey(p)} is never played`;
        if (p.fret < b.fromFret || p.fret > b.toFret) bad = `tile ${tileKey(p)} outside the section`;
      }
      if (!b.runMidi.every((m) => [...b.tileMidi.values()].includes(m))) bad = 'a step has no tile';
      if (!b.run.every((p, i) => midiAt(p, inst.openMidi) === b.runMidi[i])) bad = 'run and runMidi disagree';
    }
    check(`${id} ${dir}: 400 random boards light every tile and play every step`, bad === '', bad);
  }
}

console.log('lastStepOf');
check('the latest earlier step with that pitch', lastStepOf([60, 62, 64, 62, 60], 62, 4) === 3);
check('only steps before the current one count', lastStepOf([60, 62, 64, 62, 60], 62, 3) === 1);
check('-1 when not played yet', lastStepOf([60, 62, 64], 64, 2) === -1);

if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
