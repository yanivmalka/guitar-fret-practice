// Logic checks for Game progression cloud sync (src/utils/gameSync.ts +
// the pure merge/normalize helpers it leans on in src/utils/gameProgress.ts).
// No test runner in this repo — run by hand:
//
//   node scripts/check-game-sync.mts
//
// gameSync.ts itself pulls in supabase.ts (which reads `import.meta.env`, a
// Vite-only global), so it is covered by tsc / lint / build + manual QA, not
// here. What this proves headlessly is the pure reconcile core it leans on —
// the part that carries the divergence risk:
//
//   • `mergeGameProgress` is a per-stage MAX on bestStars — never a
//     downgrade, order-independent, and idempotent (so re-running a
//     reconcile can't drift),
//   • `last_played` / `updatedAt` follow the newer `updatedAt`,
//   • merging never mutates its inputs,
//   • `normalizeGameProgress` coerces a cloud-shaped row and drops junk stars,
//   • `clearLocalGameProgress` removes exactly the `gameProgress` key.

import { register } from 'node:module';

register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  snapshot(): Record<string, string> { return Object.fromEntries(this.map.entries()); }
}
const storage = new MemoryStorage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

const {
  GAME_STORAGE_KEY, mergeGameProgress, normalizeGameProgress, clearLocalGameProgress,
} = await import('../src/utils/gameProgress.ts');

type GP = ReturnType<typeof normalizeGameProgress>;

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Key order in a plain object is not semantically meaningful — compare as
// sorted entry lists.
const sameMap = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const norm = (o: Record<string, unknown>) =>
    JSON.stringify(Object.entries(o).sort(([x], [y]) => (x < y ? -1 : 1)));
  return norm(a) === norm(b);
};

function gp(bestStars: Record<string, 1 | 2 | 3>, updatedAt = '', lastPlayed?: { worldId: string; stageId: string }): GP {
  const out = { version: 1 as const, bestStars, updatedAt } as GP;
  if (lastPlayed) out.lastPlayed = lastPlayed;
  return out;
}

// ── 1: bestStars merges as a per-stage max ─────────────────────────────
{
  const local = gp({ 'open-strings-1': 3, 'open-strings-2': 1, 'dot-landmarks-1': 2 }, '2026-09-06T10:00:00.000Z');
  const cloud = gp({ 'open-strings-1': 1, 'open-strings-2': 2, 'octaves-unisons-1': 3 }, '2026-09-06T09:00:00.000Z');
  const merged = mergeGameProgress(local, cloud);

  check('kept the higher local rating (3 vs 1)', merged.bestStars['open-strings-1'] === 3);
  check('took the higher cloud rating (1 vs 2)', merged.bestStars['open-strings-2'] === 2);
  check('kept a local-only stage', merged.bestStars['dot-landmarks-1'] === 2);
  check('kept a cloud-only stage', merged.bestStars['octaves-unisons-1'] === 3);
  check('no extra stages appeared', Object.keys(merged.bestStars).length === 4);
}

// ── 2: order-independent and idempotent on bestStars ──────────────────
{
  const a = gp({ s1: 2, s2: 3, s3: 1 }, '2026-01-02T00:00:00.000Z', { worldId: 'w', stageId: 's2' });
  const b = gp({ s1: 3, s2: 1, s4: 2 }, '2026-01-01T00:00:00.000Z', { worldId: 'w', stageId: 's1' });

  const ab = mergeGameProgress(a, b);
  const ba = mergeGameProgress(b, a);
  check('merge(a,b).bestStars === merge(b,a).bestStars', sameMap(ab.bestStars, ba.bestStars), JSON.stringify(ab.bestStars));

  const again = mergeGameProgress(a, ab);
  check('merge(a, merge(a,b)) is stable (idempotent)', sameMap(again.bestStars, ab.bestStars));

  const noDowngrade = mergeGameProgress(gp({ s1: 3 }), gp({ s1: 1 }));
  check('a lower rating never lowers a stored best', noDowngrade.bestStars.s1 === 3);
}

// ── 3: lastPlayed / updatedAt follow the newer updatedAt ──────────────
{
  const older = gp({ s1: 1 }, '2026-03-01T00:00:00.000Z', { worldId: 'w', stageId: 'old' });
  const newer = gp({ s1: 1 }, '2026-03-09T00:00:00.000Z', { worldId: 'w', stageId: 'new' });

  const m1 = mergeGameProgress(older, newer);
  check('newer updatedAt wins', m1.updatedAt === newer.updatedAt);
  check('lastPlayed comes from the newer side', m1.lastPlayed?.stageId === 'new');

  const m2 = mergeGameProgress(newer, older);
  check('newer wins regardless of argument order', m2.updatedAt === newer.updatedAt && m2.lastPlayed?.stageId === 'new');

  const m3 = mergeGameProgress(gp({ s1: 1 }, '2026-03-01T00:00:00.000Z'), gp({ s1: 1 }, '', { worldId: 'w', stageId: 'fallback' }));
  check('lastPlayed falls back when the newer side lacks one', m3.lastPlayed?.stageId === 'fallback');
}

// ── 4: merge does not mutate its inputs ──────────────────────────────
{
  const a = gp({ s1: 1 }, '2026-04-01T00:00:00.000Z');
  const b = gp({ s1: 3, s2: 2 }, '2026-04-02T00:00:00.000Z');
  const aBefore = JSON.stringify(a);
  const bBefore = JSON.stringify(b);
  mergeGameProgress(a, b);
  check('input a untouched', JSON.stringify(a) === aBefore);
  check('input b untouched', JSON.stringify(b) === bBefore);
}

// ── 5: normalizeGameProgress on a cloud-shaped row ──────────────────
{
  const coerced = normalizeGameProgress({
    version: 1,
    bestStars: { good: 3, zero: 0, four: 4, str: '2', neg: -1 },
    lastPlayed: { worldId: 'w', stageId: 's' },
    updatedAt: '2026-05-01T00:00:00.000Z',
  });
  check('valid 1–3 stars survive', coerced.bestStars.good === 3);
  check('a 0 / 4 / string / negative star is dropped',
    !('zero' in coerced.bestStars) && !('four' in coerced.bestStars) &&
    !('str' in coerced.bestStars) && !('neg' in coerced.bestStars),
    JSON.stringify(coerced.bestStars));
  check('lastPlayed / updatedAt carried through',
    coerced.lastPlayed?.stageId === 's' && coerced.updatedAt === '2026-05-01T00:00:00.000Z');
  check('garbage normalizes to an empty record',
    eq(normalizeGameProgress('nonsense'), { version: 1, bestStars: {}, updatedAt: '' }));
}

// ── 6: clearLocalGameProgress removes only the gameProgress key ─────
{
  storage.clear();
  storage.setItem(GAME_STORAGE_KEY, JSON.stringify(gp({ s1: 2 })));
  storage.setItem('selectorHistory', '["keep me"]');
  storage.setItem('cloudSyncedGameProgressUser', 'user-1');
  clearLocalGameProgress();
  check('gameProgress key gone', storage.getItem(GAME_STORAGE_KEY) === null);
  check('an unrelated key is left alone', storage.getItem('selectorHistory') === '["keep me"]');
  // The synced flag is cleared separately (App calls clearSyncedGameProgressUser).
  check('clearLocalGameProgress does not touch the synced flag',
    storage.getItem('cloudSyncedGameProgressUser') === 'user-1');
}

console.log(failures === 0
  ? '\nAll game-sync checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
