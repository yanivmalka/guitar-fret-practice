// Focused logic checks for Game Progress persistence (Task 5). There is no
// test runner in this repo, so this is a standalone script in the same
// spirit as the other scripts/*.mts — run by hand, never part of
// `npm run build`:
//
//   node scripts/check-game-progress.mts
//
// It exercises the pure pieces of `src/utils/gameProgress.ts` against an
// in-memory `localStorage` stand-in and the real `STAGES` / `WORLDS` seed
// data, confirming:
//   1. empty progress when nothing is stored,
//   2. a valid record round-trips through load,
//   3. unparseable JSON and wrong-shape data both fall back to empty,
//   4. the first stage in game order is unlocked; the next is locked
//      until the first earns 1★, then unlocks,
//   5. recordStageResult is monotonic — 2★ replaces 1★, 1★ never lowers 2★,
//   6. 3★ persists, lastPlayed / updatedAt update on every play,
//   7. a 0★ run stores no stars, and a stage absent from bestStars is 0★.

import { register } from 'node:module';

// ── An in-memory Storage stand-in, installed before the module loads ─────
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}
const storage = new MemoryStorage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

// `gameProgress.ts` imports `../game/stages` / `../game/worlds` without a
// file extension (the app's Vite-resolved convention). Node needs the
// `.ts`, so register a tiny resolve hook that retries relative specifiers
// with a `.ts` suffix before giving up.
register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

const { loadGameProgress, saveGameProgress, recordStageResult, isStageUnlocked } =
  await import('../src/utils/gameProgress.ts');
const { STAGES } = await import('../src/game/stages.ts');

// Minimal StageResult factory — only stageId + stars drive gameProgress;
// the rest is filled with inert values.
type StarRating = 0 | 1 | 2 | 3;
function stageResult(stageId: string, stars: StarRating) {
  return {
    stageId,
    stars,
    sessionResult: {
      score: 0,
      accuracy: 0,
      longestStreak: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      questionCount: 0,
    },
    targets: {
      oneStar: { minAccuracy: 0 },
      twoStar: { minAccuracy: 0 },
      threeStar: { minAccuracy: 0 },
    },
    metTiers: {
      oneStar: stars >= 1,
      twoStar: stars >= 2,
      threeStar: stars >= 3,
    },
  };
}

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function reset(): void {
  storage.clear();
}
function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The two seed stages, in game order.
const [first, second] = STAGES.map(s => s.id);
const firstWorld = STAGES[0].worldId;

// ── 1: empty progress ──────────────────────────────────────────────────
{
  reset();
  const p = loadGameProgress();
  check('nothing stored -> empty progress',
    p.version === 1 &&
    eq(p.bestStars, {}) &&
    p.lastPlayed === undefined &&
    p.updatedAt === '',
    JSON.stringify(p));
}

// ── 2: valid record round-trips ────────────────────────────────────────
{
  reset();
  const saved = {
    version: 1 as const,
    bestStars: { [first]: 2 as const },
    lastPlayed: { worldId: firstWorld, stageId: first },
    updatedAt: '2026-01-02T03:04:05.000Z',
  };
  saveGameProgress(saved);
  const p = loadGameProgress();
  check('valid record round-trips through load',
    p.version === saved.version &&
    eq(p.bestStars, saved.bestStars) &&
    eq(p.lastPlayed, saved.lastPlayed) &&
    p.updatedAt === saved.updatedAt,
    JSON.stringify(p));
}

// ── 3a: unparseable JSON -> empty ──────────────────────────────────────
{
  reset();
  storage.setItem('gameProgress', '{ not valid json');
  check('unparseable JSON -> empty progress', eq(loadGameProgress(), {
    version: 1, bestStars: {}, updatedAt: '',
  }));
}

// ── 3b: wrong-shape data is sanitised ──────────────────────────────────
{
  reset();
  storage.setItem('gameProgress', JSON.stringify({
    version: 99,
    bestStars: { [first]: 7, [second]: 2, junk: 'x' },
    lastPlayed: 'nope',
    updatedAt: 123,
  }));
  const p = loadGameProgress();
  check('wrong-shape data sanitised on load',
    p.version === 1 &&
    eq(p.bestStars, { [second]: 2 }) &&
    p.lastPlayed === undefined &&
    p.updatedAt === '',
    JSON.stringify(p));
}

// ── 4a: first stage always unlocked ───────────────────────────────────
{
  reset();
  check('first stage in game order is unlocked',
    isStageUnlocked(first, loadGameProgress()) === true);
}

// ── 4b: next stage locked until the previous earns 1 star ─────────────
{
  reset();
  check('second stage locked before the first earns 1 star',
    isStageUnlocked(second, loadGameProgress()) === false);
}

// ── 4c: next stage unlocks once the previous earns 1 star ─────────────
{
  reset();
  recordStageResult(stageResult(first, 1));
  check('second stage unlocks after the first earns 1 star',
    isStageUnlocked(second, loadGameProgress()) === true);
}

// ── 5a: a better run replaces the stored best ─────────────────────────
{
  reset();
  recordStageResult(stageResult(first, 1));
  recordStageResult(stageResult(first, 2));
  check('2 stars replaces a stored 1 star',
    loadGameProgress().bestStars[first] === 2);
}

// ── 5b: a worse run never lowers the stored best ──────────────────────
{
  // continues from 5a's state
  recordStageResult(stageResult(first, 1));
  check('1 star does not lower a stored 2 stars',
    loadGameProgress().bestStars[first] === 2);
}

// ── 6a: 3 stars persist ──────────────────────────────────────────────
{
  reset();
  recordStageResult(stageResult(first, 3));
  check('3 stars persist', loadGameProgress().bestStars[first] === 3);
}

// ── 6b: lastPlayed + updatedAt refresh on every play ─────────────────
{
  reset();
  const returned = recordStageResult(stageResult(second, 1));
  const stored = loadGameProgress();
  check('lastPlayed updates to the stage just played',
    eq(stored.lastPlayed, { worldId: firstWorld, stageId: second }) &&
    eq(returned.lastPlayed, { worldId: firstWorld, stageId: second }));
  check('updatedAt is set to a non-empty ISO timestamp',
    typeof stored.updatedAt === 'string' &&
    stored.updatedAt !== '' &&
    !Number.isNaN(Date.parse(stored.updatedAt)));
}

// ── 7a: a 0 star run stores no stars but still records the play ──────
{
  reset();
  const p = recordStageResult(stageResult(first, 0));
  check('0 star run stores no bestStars entry',
    !(first in p.bestStars) && eq(p.bestStars, {}));
  check('0 star run still records lastPlayed',
    eq(p.lastPlayed, { worldId: firstWorld, stageId: first }));
  check('0 star on the previous stage leaves the next locked',
    isStageUnlocked(second, p) === false);
}

// ── 7b: a stage absent from bestStars behaves as 0 stars ────────────
{
  reset();
  const p = loadGameProgress();
  check('stage missing from bestStars reads as 0 stars for unlock',
    isStageUnlocked(second, p) === false);
  check('unknown stage id is locked',
    isStageUnlocked('no-such-stage', p) === false);
}

console.log(failures === 0
  ? '\nAll game-progress checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
