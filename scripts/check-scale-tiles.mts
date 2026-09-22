// Focused checks for src/learning/scaleTiles.ts — Exercise A's tile
// scheduling (the corrected, real-Piano-Tiles-mechanic design).
//
//   node --experimental-strip-types scripts/check-scale-tiles.mts

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

const { scheduleTiles, pickScaleTilesRun, TRAVEL_MS, HIT_WINDOW_MS } = await import('../src/learning/scaleTiles.ts');
const { buildScalePool } = await import('../src/learning/scaleDrill.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const guitar = INSTRUMENTS.guitar;
const bass = INSTRUMENTS.bass;

// ── scheduleTiles ────────────────────────────────────────────────────
{
  const shape = [
    { string: 3, fret: 5 }, { string: 1, fret: 3 }, { string: 2, fret: 3 }, { string: 1, fret: 5 },
  ];
  const tiles = scheduleTiles(shape, 500);
  check('orders ascending by fret, ties broken by string',
    JSON.stringify(tiles.map((t: { string: number; fret: number }) => [t.fret, t.string])) ===
    JSON.stringify([[3, 1], [3, 2], [5, 1], [5, 3]]));
  check('first tile arrives at exactly TRAVEL_MS (zero spawn delay)',
    tiles[0].atMs === TRAVEL_MS);
  check('tiles are beatMs apart', tiles[1].atMs - tiles[0].atMs === 500);
  check('same length as input shape', tiles.length === shape.length);

  check('empty shape -> empty tiles', scheduleTiles([], 500).length === 0);
}

// ── pickScaleTilesRun ───────────────────────────────────────────────────
{
  const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);
  const run = pickScaleTilesRun(pool, guitar.notes, guitar.stringCount, guitar.maxFret, 500, () => 0);
  check('returns a run for a valid pool', run !== null, JSON.stringify(run));
  check('tiles cover every position in the shape (same count)',
    !!run && run.tiles.length === run.shape.length);
  check('every tile position is a real shape member',
    !!run && run.tiles.every((t: { string: number; fret: number }) =>
      run.shape.some((p: { string: number; fret: number }) => p.string === t.string && p.fret === t.fret)));
  check('endMs is the last tile\'s arrival plus the hit window',
    !!run && run.endMs === run.tiles[run.tiles.length - 1].atMs + HIT_WINDOW_MS);

  check('empty pool -> null',
    pickScaleTilesRun([], guitar.notes, guitar.stringCount, guitar.maxFret, 500) === null);
}

// ── Randomised stress ───────────────────────────────────────────────────
for (const [label, inst] of [['guitar', guitar], ['bass', bass]] as const) {
  const pool = buildScalePool(['minorPentatonic'], inst.stringCount);
  let bad = false;
  for (let i = 0; i < 200; i++) {
    const run = pickScaleTilesRun(pool, inst.notes, inst.stringCount, inst.maxFret, 500);
    if (!run || run.tiles.length === 0) { bad = true; break; }
    // Arrival times strictly increasing (schedule never collides/reorders).
    for (let i2 = 1; i2 < run.tiles.length; i2++) {
      if (run.tiles[i2].atMs <= run.tiles[i2 - 1].atMs) { bad = true; break; }
    }
  }
  check(`${label}: 200 random runs always schedule a non-empty, strictly-increasing tile sequence`, !bad);
}

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
