// Focused checks for the P3 "Learning Path" layer (src/learning/path.ts,
// src/learning/pathProgress.ts) and the planner's new Path weighting. No test
// runner in this repo — run by hand, never part of `npm run build`, same
// spirit as scripts/check-learning.mts:
//
//   node scripts/check-learning-path.mts
//
// Covers the task's new behaviour that can be checked headlessly:
//   • a checkpoint materialises only in-range, in-scope positions
//   • checkpoint mastered % is derived from history + SRS, deterministically
//   • star tiers come from the reused evaluateStars threshold math
//   • checkpoint stars are monotonic (foldCheckpointStars)
//   • path progress merges per checkpoint keeping the higher tier
//   • the current checkpoint is the first not yet 3-starred
//   • the planner folds Path items in after overdue + weak, and is
//     byte-identical to before when no Path items are supplied (Free/Pro path)
//   • the learning-state blob round-trips `path` and merges it per checkpoint

import { register } from 'node:module';

class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();

register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

const { GUITAR_NOTES } = await import('../src/utils/music.ts');
const {
  PATH_CHECKPOINTS, checkpointItemIds, isNaturalNoteName,
} = await import('../src/learning/path.ts');
const {
  evaluatePath, foldCheckpointStars, mergePathProgress, normalizePathProgress,
  currentCheckpointIndex, emptyPathProgress,
} = await import('../src/learning/pathProgress.ts');
const { buildDailyPlan, buildWeakSpotsPlan } = await import('../src/learning/planner.ts');
const { newSrsItem } = await import('../src/learning/srs.ts');
const {
  loadLearningState, saveLearningStateLocal, getInstrumentState, withInstrumentState,
  mergeLearningState, emptyInstrumentState, recordCheckpointStars,
} = await import('../src/learning/learningState.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const T0 = Date.UTC(2026, 8, 6, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const GUITAR = { stringCount: 6, maxFret: 21 };
const BASS4 = { stringCount: 4, maxFret: 24 };

function row(string: number, fret: number, correct: boolean | null, tOffsetMs = 0) {
  return {
    note: 'X', string, fret, seconds: 1.5,
    skipped: correct === null, correct,
    createdAt: new Date(T0 - DAY + tOffsetMs).toISOString(),
  };
}

// ── Checkpoint materialisation ───────────────────────────────────────
{
  const openNaturals = PATH_CHECKPOINTS[0];
  const items = checkpointItemIds(openNaturals, GUITAR, GUITAR_NOTES);
  check('open-naturals is the 6 open strings',
    items.length === 6 && items.every((i) => i.fret === 0));
  check('open-naturals positions are all natural note names',
    items.every((i) => isNaturalNoteName(GUITAR_NOTES[i.string - 1][i.fret])));

  const firstFiveNaturals = PATH_CHECKPOINTS.find((c) => c.id === 'first-five-naturals')!;
  const ffn = checkpointItemIds(firstFiveNaturals, GUITAR, GUITAR_NOTES);
  check('first-five-naturals stays inside fret 0..5',
    ffn.every((i) => i.fret >= 0 && i.fret <= 5));
  check('first-five-naturals excludes sharps/flats',
    ffn.every((i) => isNaturalNoteName(GUITAR_NOTES[i.string - 1][i.fret])));
  check('first-five-all (scope: all) has more positions than the naturals-only one',
    checkpointItemIds(
      PATH_CHECKPOINTS.find((c) => c.id === 'first-five-all')!, GUITAR, GUITAR_NOTES,
    ).length > ffn.length);

  // Bass: a 6-string checkpoint yields only strings 1..4, still in fret range.
  const bassItems = checkpointItemIds(
    PATH_CHECKPOINTS.find((c) => c.id === 'first-octave-all')!, BASS4, GUITAR_NOTES,
  );
  check('a 6-string checkpoint materialises only in-range strings on a 4-string bass',
    bassItems.length > 0 && bassItems.every((i) => i.string >= 1 && i.string <= 4));

  check('checkpointItemIds is deterministic',
    JSON.stringify(checkpointItemIds(openNaturals, GUITAR, GUITAR_NOTES)) ===
    JSON.stringify(items));
}

// ── Live evaluation: % mastered from history + SRS ───────────────────
{
  const progress = emptyPathProgress();
  // Nail every open-string natural: 5 correct recent answers each → mastered.
  const openItems = checkpointItemIds(PATH_CHECKPOINTS[0], GUITAR, GUITAR_NOTES);
  const entries = openItems.flatMap((it, k) =>
    Array.from({ length: 5 }, (_, i) => row(it.string, it.fret, true, k * 10_000 + i * 500)),
  );
  const view = evaluatePath({
    entries, srs: {}, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
  });
  const cp0 = view.checkpoints[0];
  check('a fully-correct checkpoint reads 100% mastered', cp0.pctMastered === 100);
  check('100% mastered clears the checkpoint (>= 1 star, mastered flag)',
    cp0.stars === 3 && cp0.mastered && cp0.reached);
  check('a later, broader checkpoint is only partly mastered (not cleared)',
    view.checkpoints[view.checkpoints.length - 1].pctMastered < 100 &&
    !view.checkpoints[view.checkpoints.length - 1].mastered);
  check('evaluatePath is deterministic',
    JSON.stringify(evaluatePath({
      entries, srs: {}, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
    })) === JSON.stringify(view));

  // SRS bucket >= 3 also counts as mastered, with no history at all.
  const srs = Object.fromEntries(
    openItems.map((it) => [`${it.string}:${it.fret}`, { ...newSrsItem(`${it.string}:${it.fret}`, T0), bucket: 3 }]),
  );
  const viaSrs = evaluatePath({
    entries: [], srs, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
  });
  check('a well-scheduled position (SRS bucket >= 3) counts as mastered',
    viaSrs.checkpoints[0].pctMastered === 100);

  // Unlock gating: checkpoint 2 is locked until checkpoint 1 is reached.
  const cold = evaluatePath({
    entries: [], srs: {}, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
  });
  check('the first checkpoint is always unlocked', cold.checkpoints[0].unlocked);
  check('a later checkpoint is locked before its predecessor is reached',
    !cold.checkpoints[1].unlocked);
  check('cold start makes checkpoint 1 the current one', cold.currentIndex === 0);
}

// ── Monotonic stars + merge ──────────────────────────────────────────
{
  let p = emptyPathProgress();
  p = foldCheckpointStars(p, 'open-naturals', 2, new Date(T0).toISOString());
  check('fold records a new tier', p.bestStars['open-naturals'] === 2);
  const same = foldCheckpointStars(p, 'open-naturals', 1, new Date(T0 + 1000).toISOString());
  check('fold never lowers a tier', same === p && same.bestStars['open-naturals'] === 2);
  p = foldCheckpointStars(p, 'open-naturals', 3, new Date(T0 + 2000).toISOString());
  check('fold raises a tier', p.bestStars['open-naturals'] === 3);
  check('a 0 rating never creates an entry',
    foldCheckpointStars(emptyPathProgress(), 'x', 0, '').bestStars['x'] === undefined);

  const a = { bestStars: { 'open-naturals': 3, 'first-five-naturals': 1 }, updatedAt: 'a' };
  const b = { bestStars: { 'first-five-naturals': 2, 'first-octave-all': 1 }, updatedAt: 'b' };
  const m = mergePathProgress(a, b);
  check('merge unions checkpoints keeping the higher tier',
    m.bestStars['open-naturals'] === 3 && m.bestStars['first-five-naturals'] === 2 &&
    m.bestStars['first-octave-all'] === 1);
  const sortedStars = (o: Record<string, number>) =>
    Object.entries(o).sort(([x], [y]) => x.localeCompare(y));
  check('merge is order-independent (same tiers regardless of arg order)',
    JSON.stringify(sortedStars(mergePathProgress(b, a).bestStars)) ===
    JSON.stringify(sortedStars(m.bestStars)));

  check('normalizePathProgress drops junk star values',
    Object.keys(normalizePathProgress({ bestStars: { x: 9, y: 2 } }).bestStars).join() === 'y');

  check('currentCheckpointIndex is the first not-yet-3-starred checkpoint',
    currentCheckpointIndex(PATH_CHECKPOINTS, { [PATH_CHECKPOINTS[0].id]: 3 }) === 1);
  check('currentCheckpointIndex clamps to the last when all are mastered',
    currentCheckpointIndex(
      PATH_CHECKPOINTS,
      Object.fromEntries(PATH_CHECKPOINTS.map((c) => [c.id, 3])),
    ) === PATH_CHECKPOINTS.length - 1);
}

// ── Planner: Path items are folded in, absence changes nothing ───────
{
  const allStrings = [1, 2, 3, 4, 5, 6];
  const base = {
    entries: [
      ...Array.from({ length: 6 }, (_, i) => row(6, 3, i % 2 === 0, i * 1000)), // weak
    ],
    srs: { '2:2': { ...newSrsItem('2:2', T0), dueAt: T0 - 3 * DAY } }, // overdue
    now: T0,
    maxFret: 21,
    allStrings,
    accidental: 'sharps' as const,
    order: 'fifths' as const,
  };

  const withoutPath = buildDailyPlan(base);
  const withPath = buildDailyPlan({
    ...base,
    pathItems: [{ string: 5, fret: 0 }, { string: 4, fret: 2 }],
  });

  check('no pathItems ⇒ the plan is byte-identical to before (Free/Pro path)',
    JSON.stringify(buildDailyPlan(base)) === JSON.stringify(withoutPath));
  check('pathItems are pulled into the daily plan as a "path" bucket',
    withPath.items.some((p) => p.bucket === 'path' && p.itemId === '5:0') &&
    withPath.items.some((p) => p.bucket === 'path' && p.itemId === '4:2'));
  check('overdue + weak still come before path items',
    withPath.items[0].bucket === 'overdue' &&
    withPath.items.findIndex((p) => p.bucket === 'weak') <
      withPath.items.findIndex((p) => p.bucket === 'path'));
  check('rationale.path counts the path picks',
    withPath.rationale.path === withPath.items.filter((p) => p.bucket === 'path').length);
  check('the "weak spots" plan ignores pathItems entirely',
    !buildWeakSpotsPlan({ ...base, pathItems: [{ string: 5, fret: 0 }] })!
      .items.some((p) => p.bucket === 'path'));
  check('every path candidate is still inside the drill fret window',
    withPath.drill.candidates!.every((c) => c.fret >= withPath.drill.fretFrom && c.fret <= withPath.drill.fretTo));
}

// ── Learning-state blob: path round-trips + merges per checkpoint ────
{
  localStorage.clear();
  let state = loadLearningState(T0);
  let g = getInstrumentState(state, 'guitar', T0);
  check('a fresh instrument state has an empty path record',
    g.path && Object.keys(g.path.bestStars).length === 0);

  g = recordCheckpointStars(g, 'open-naturals', 2, T0);
  g = recordCheckpointStars(g, 'open-naturals', 1, T0 + 1000); // must not lower
  state = withInstrumentState(state, 'guitar', g);
  saveLearningStateLocal(state);

  const reloaded = getInstrumentState(loadLearningState(T0 + 2000), 'guitar', T0 + 2000);
  check('checkpoint stars persist through localStorage',
    reloaded.path.bestStars['open-naturals'] === 2);

  const sA = withInstrumentState({ version: 1 as const, instruments: {} }, 'guitar', {
    ...emptyInstrumentState(T0),
    path: { bestStars: { 'open-naturals': 3 }, updatedAt: 'a' },
  });
  const sB = withInstrumentState({ version: 1 as const, instruments: {} }, 'guitar', {
    ...emptyInstrumentState(T0),
    path: { bestStars: { 'open-naturals': 1, 'first-five-naturals': 2 }, updatedAt: 'b' },
  });
  const merged = mergeLearningState(sA, sB);
  check('learning-state merge keeps the higher checkpoint tier per key',
    merged.instruments.guitar.path.bestStars['open-naturals'] === 3 &&
    merged.instruments.guitar.path.bestStars['first-five-naturals'] === 2);
}

console.log(failures === 0
  ? '\nAll learning-path checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
