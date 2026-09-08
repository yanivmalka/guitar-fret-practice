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
//   • (T12) spec §22.1.5 — the Notes Learning Path is untouched by the
//     Intervals work: path.ts / pathProgress.ts / LearningPathScreen.tsx name
//     no interval concept, and recordCheckpointStars folds only `path`

import { register } from 'node:module';
import { readFileSync } from 'node:fs';

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

  // SRS bucket >= 3 with no recent history: below the `effectiveN` gate the
  // score is the bucket floor `BUCKET_SCORE[3]` = 0.85 — enough for the on/off
  // `mastered` flag, but the checkpoint's mean % then reads 85, not 100.
  const srs = Object.fromEntries(
    openItems.map((it) => [`${it.string}:${it.fret}`, { ...newSrsItem(`${it.string}:${it.fret}`, T0), bucket: 3 }]),
  );
  const viaSrs = evaluatePath({
    entries: [], srs, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
  });
  check('a well-scheduled position (SRS bucket >= 3) reads mastered via the bucket floor',
    viaSrs.checkpoints[0].items.every((it) => it.mastered) &&
    viaSrs.checkpoints[0].masteredCount === viaSrs.checkpoints[0].totalCount);
  check('the bucket floor feeds the mean: a bucket-3-only checkpoint reads 85%',
    viaSrs.checkpoints[0].pctMastered === 85);

  // Unlock gating: checkpoint 2 is locked until checkpoint 1 is reached.
  const cold = evaluatePath({
    entries: [], srs: {}, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0,
  });
  check('the first checkpoint is always unlocked', cold.checkpoints[0].unlocked);
  check('a later checkpoint is locked before its predecessor is reached',
    !cold.checkpoints[1].unlocked);
  check('cold start makes checkpoint 1 the current one', cold.currentIndex === 0);
}

// ── Decay-curve scoring (recency-decay plan §1 fold-in) ──────────────
// pathProgress.ts now scores each position on the shared exponential
// time-decay engine (src/learning/recency.ts): every answer inside the
// 180-day hard cap gets weight `w = 0.5 ** (ageMs / 14d)`, the position's
// score is the weighted accuracy once `effectiveN = Σw >= MIN_EFFECTIVE_N`
// (3) and the SRS bucket floor below that gate, and a checkpoint's % is the
// MEAN of those continuous scores — no fixed window, no "take the last N in
// order". Same spirit as the decay blocks in check-intervals.mts.
{
  const progress = emptyPathProgress();
  const open = checkpointItemIds(PATH_CHECKPOINTS[0], GUITAR, GUITAR_NOTES);
  const p = open[0]; // the one position we vary
  // `n` answers for `it`, each `ageDays` old (spaced 1s): with `row`'s
  // `createdAt = T0 - DAY + tOffsetMs`, an offset of `DAY - ageDays*DAY` puts
  // the row exactly `ageDays` in the past.
  const hist = (it: { string: number; fret: number }, n: number, correct: boolean, ageDays: number) =>
    Array.from({ length: n }, (_, i) =>
      row(it.string, it.fret, correct, DAY - ageDays * DAY - i * 1000));
  const evalOne = (entries: ReturnType<typeof row>[], srs: Record<string, unknown> = {}) =>
    evaluatePath({ entries, srs, instrument: GUITAR, noteTable: GUITAR_NOTES, progress, now: T0 });
  const scoreOf = (view: ReturnType<typeof evalOne>, it: { string: number; fret: number }) =>
    view.checkpoints[0].items.find((x) => x.itemId === `${it.string}:${it.fret}`)!.score;

  // Fresh vs half-life-aged: the decay weight halves at 14 days, so it takes
  // ~2x as many aged answers to clear the same `effectiveN` gate.
  check('6 fresh correct answers → score 1',
    Math.abs(scoreOf(evalOne(hist(p, 6, true, 0)), p) - 1) < 1e-9);
  check('3 answers 14 days old miss the effectiveN gate (no SRS row → score 0)',
    scoreOf(evalOne(hist(p, 3, true, 14)), p) === 0);
  check('8 answers 14 days old clear the gate (effectiveN ≈ 4) → score 1',
    Math.abs(scoreOf(evalOne(hist(p, 8, true, 14)), p) - 1) < 1e-9);

  // Below the gate an SRS row lifts the score to its bucket floor.
  check('below the gate, SRS bucket 3 lifts the score to the 0.85 floor',
    Math.abs(scoreOf(
      evalOne(hist(p, 2, true, 0),
        { [`${p.string}:${p.fret}`]: { ...newSrsItem(`${p.string}:${p.fret}`, T0), bucket: 3 } }),
      p,
    ) - 0.85) < 1e-9);

  // Above the gate the weighted accuracy stands alone: recent misses sink a
  // position that had a long-ago hot streak. This is the old array-order
  // scenario, now expressed as decay — no chronological sort is needed.
  const recentBad = [...hist(p, 12, false, 1), ...hist(p, 12, true, 30)];
  const sank = scoreOf(evalOne(recentBad), p);
  check('recent misses outweigh an older streak (score well below the 0.85 line)',
    sank < 0.4, `score=${sank}`);
  check('a position sunk by recent misses is not counted mastered',
    !evalOne(recentBad).checkpoints[0].items.find((x) => x.itemId === `${p.string}:${p.fret}`)!.mastered);

  // Rows past the 180-day hard cap are dropped entirely.
  check('history past the 180-day hard cap is ignored (no SRS row → score 0)',
    scoreOf(evalOne(hist(p, 20, true, 200)), p) === 0);

  // A checkpoint's % is the MEAN of the continuous scores, not mastered/total.
  const solid = open.slice(1).flatMap((it) => hist(it, 6, true, 0));
  const halfish = [...hist(p, 3, true, 0), ...hist(p, 3, false, 0)]; // effectiveN ≈ 6, acc 0.5
  const mixed = evalOne([...solid, ...halfish]).checkpoints[0];
  check('checkpoint % is the mean of continuous scores (5 solid + 1 at ~0.5 → ~92%)',
    mixed.pctMastered === 92, `pct=${mixed.pctMastered}`);
  check('masteredCount still counts only positions at or above the 0.85 line',
    mixed.masteredCount === 5, `masteredCount=${mixed.masteredCount}`);
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

// ── §22 separation invariant — the Notes Learning Path is untouched ──────
// Spec §22.1.5: `LearningPathScreen.tsx`, `path.ts`, `pathProgress.ts` and
// `recordCheckpointStars` are completely untouched by the Intervals work —
// the Notes Path and its stars stay byte-identical. Headless proxy: none of
// the Path source files so much as mentions the interval domain, and
// `recordCheckpointStars` still folds ONLY `path`, leaving every interval
// field on the instrument state reference-identical.
{
  const pathFiles = [
    '../src/learning/path.ts',
    '../src/learning/pathProgress.ts',
    '../src/components/LearningPathScreen.tsx',
  ];
  // Strip comments first: path.ts carries a "notes-only, no intervals" note
  // that declares the boundary rather than crossing it.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const touched = pathFiles.filter((rel) =>
    /interval/i.test(stripComments(readFileSync(new URL(rel, import.meta.url), 'utf8'))));
  check('path.ts / pathProgress.ts / LearningPathScreen.tsx never reference the interval domain',
    touched.length === 0, touched.join(', '));

  const st0 = emptyInstrumentState(T0);
  const withStars = recordCheckpointStars(st0, 'open-naturals', 2, T0 + 1000);
  check('recordCheckpointStars folds only `path` — interval srs / daily / history reference-identical',
    withStars.path !== st0.path &&
    withStars.intervalSrs === st0.intervalSrs &&
    withStars.intervalDaily === st0.intervalDaily &&
    withStars.intervalHistory === st0.intervalHistory &&
    withStars.srs === st0.srs && withStars.daily === st0.daily);
  check('recordCheckpointStars returns the same reference when no tier rose (no interval field rebuilt)',
    recordCheckpointStars(withStars, 'open-naturals', 1, T0 + 2000) === withStars);
}

console.log(failures === 0
  ? '\nAll learning-path checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
