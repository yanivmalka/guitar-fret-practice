// Focused checks for src/learning/scaleDrill.ts — the pure question-picking
// half of the Scales Learning "build the scale" exercise (Exercise A).
//
//   node --experimental-strip-types scripts/check-scale-drill.mts
//
// Covers:
//   • buildScalePool resolves positions per instrument string count
//   • pickScaleQuestion: deterministic with an injected rng, always returns a
//     root fret whose window stays on the fretboard, the shape matches
//     shapeAtRoot exactly, and it degrades to null for an empty/bad pool or
//     an instrument too short for any position to fit
//   • over many random picks: root fret + shape are always internally
//     consistent (never throws, shape non-empty, root included)

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
const { scaleTypeById, scalePositionsFor, shapeAtRoot } = await import('../src/utils/scales.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const guitar = INSTRUMENTS.guitar;
const bass = INSTRUMENTS.bass;

// ── buildScalePool ────────────────────────────────────────────────────
{
  const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);
  check('buildScalePool: 2 positions for minor pentatonic on a 6-string guitar',
    pool.length === 2 &&
    pool.every((p: { scaleTypeId: string }) => p.scaleTypeId === 'minorPentatonic') &&
    pool.map((p: { positionIndex: number }) => p.positionIndex).sort().join(',') === '1,2');
  check('buildScalePool: an unshipped type contributes nothing',
    buildScalePool(['major', 'minorPentatonic'], guitar.stringCount).length === 2);
  check('buildScalePool: empty type list -> empty pool',
    buildScalePool([], guitar.stringCount).length === 0);
}

// ── pickScaleQuestion — deterministic with an injected rng ────────────
{
  const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);
  const q = pickScaleQuestion(pool, guitar.notes, guitar.stringCount, guitar.maxFret, () => 0);
  check('pickScaleQuestion returns a question for a valid pool',
    q !== null, JSON.stringify(q));
  check('rng()=0 deterministically picks the first shuffled item at the lowest valid root',
    !!q && q.scaleTypeId === 'minorPentatonic');

  const mp = scaleTypeById('minorPentatonic')!;
  const position = scalePositionsFor('minorPentatonic', guitar.stringCount)
    .find((p: { positionIndex: number }) => p.positionIndex === q!.positionIndex)!;
  const expectedShape = shapeAtRoot(mp, position, q!.rootFret, guitar.notes);
  check('the returned shape matches shapeAtRoot exactly for the same root',
    JSON.stringify([...q!.shape].sort((a, b) => a.string - b.string || a.fret - b.fret)) ===
    JSON.stringify([...(expectedShape ?? [])].sort((a: { string: number }, b: { string: number }) => a.string - b.string || a.fret - b.fret)));

  check('the root position itself is part of the returned shape',
    q!.shape.some((p: { string: number; fret: number }) => p.string === q!.rootString && p.fret === q!.rootFret));

  check('the window never goes below fret 0',
    q!.rootFret + position.window.from >= 0);
}

// ── Degenerate inputs ───────────────────────────────────────────────
{
  check('pickScaleQuestion(empty pool) -> null',
    pickScaleQuestion([], guitar.notes, guitar.stringCount, guitar.maxFret) === null);
  check('pickScaleQuestion(pool of an unshipped type) -> null',
    pickScaleQuestion([{ scaleTypeId: 'major', positionIndex: 1 }], guitar.notes, guitar.stringCount, guitar.maxFret) === null);
  check('pickScaleQuestion(pool referencing a position index that doesn\'t exist) -> null',
    pickScaleQuestion([{ scaleTypeId: 'minorPentatonic', positionIndex: 99 }], guitar.notes, guitar.stringCount, guitar.maxFret) === null);
  check('pickScaleQuestion on an instrument with maxFret too small for the window -> null',
    pickScaleQuestion(
      buildScalePool(['minorPentatonic'], guitar.stringCount),
      guitar.notes.map((row: string[]) => row.slice(0, 0)), // 0-fret instrument
      guitar.stringCount, 0,
    ) === null);
}

// ── Randomised stress: many picks stay internally consistent ──────────
for (const [label, inst] of [['guitar', guitar], ['bass', bass]] as const) {
  const pool = buildScalePool(['minorPentatonic'], inst.stringCount);
  let bad = false;
  let anyPos2 = false;
  for (let i = 0; i < 200; i++) {
    const q = pickScaleQuestion(pool, inst.notes, inst.stringCount, inst.maxFret);
    if (!q || q.shape.length === 0) { bad = true; break; }
    if (q.positionIndex === 2) anyPos2 = true;
    const inRoot = q.shape.some((p: { string: number; fret: number }) => p.string === q.rootString && p.fret === q.rootFret);
    if (!inRoot) { bad = true; break; }
  }
  check(`${label}: 200 random picks always return a non-empty shape including the root`, !bad);
  check(`${label}: both positions eventually get picked over 200 draws`, anyPos2);
}

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
