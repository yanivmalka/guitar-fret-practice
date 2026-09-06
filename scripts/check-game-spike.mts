// F.1 spike — headless verification of the Game data seam and its isolation
// from Practice persistence. No test runner in this repo; run by hand like
// the other scripts/check-*.mts:
//
//   node scripts/check-game-spike.mts
//
// The interactive drill (start / answer on the wheel / see stars) still needs
// a human in `npm run dev`. What this script proves without a browser is the
// part that carries the risk:
//
//   fake finished run  →  computeSessionResult  →  buildStageResult(STAGES[0])
//                      →  StarRating  →  recordStageResult  →  localStorage
//
// and that running that flow changes ONLY localStorage['gameProgress'] —
// every pre-seeded Practice key (selectorHistory, best_*, badges, sync
// flags) is byte-identical before and after.

import { register } from 'node:module';

// ── in-memory localStorage, installed before the modules load ────────────
class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.map.entries());
  }
}
const storage = new MemoryStorage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

// The app's src/ modules import each other without a file extension (Vite
// resolves that); Node needs the `.ts`. Retry relative specifiers with it.
register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

const { computeSessionResult } = await import('../src/drill/DrillConfig.ts');
const { buildStageResult } = await import('../src/game/stageResult.ts');
const { loadGameProgress, recordStageResult } = await import('../src/utils/gameProgress.ts');
const { STAGES } = await import('../src/game/stages.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// A SessionScore as useScoring would report it (only score / longestStreak /
// questionsAnswered are read by computeSessionResult).
function session(score: number, longestStreak: number, answered: number) {
  return {
    score, streak: 0, longestStreak,
    lastPoints: 0, lastSpeedBonus: 0, multiplier: 1,
    questionsAnswered: answered,
  };
}
// A recorded-history array as the engine's addEntry would have built it.
function history(correct: number, wrong: number) {
  const rows = [];
  for (let i = 0; i < correct; i++) {
    rows.push({ note: 'C', fret: 3, string: 6, seconds: 1, skipped: false, correct: true });
  }
  for (let i = 0; i < wrong; i++) {
    rows.push({ note: 'C', fret: 3, string: 6, seconds: 1, skipped: false, correct: false });
  }
  return rows;
}

const stage = STAGES[0];

// ── Pre-seed Practice persistence, then snapshot every key ──────────────
storage.clear();
const practiceSeed: Record<string, string> = {
  selectorHistory: JSON.stringify({
    '6|0-12|byFret|dots': [{ note: 'A', fret: 5, string: 6, seconds: 2, skipped: false, correct: true }],
  }),
  'best_6|0-12|byFret|dots': JSON.stringify({ score: 900, streak: 7, accuracy: 88 }),
  badges: JSON.stringify({ 'century::bronze': { earnedAt: '2026-01-01T00:00:00.000Z' } }),
  cloudSyncedUser: 'user-123',
  cloudDeletedKeys: JSON.stringify({}),
  pref_theme: JSON.stringify('dark'),
};
for (const [k, v] of Object.entries(practiceSeed)) storage.setItem(k, v);
const before = storage.snapshot();

// ── Run the Game flow: two runs on STAGES[0] ───────────────────────────
// Run 1: 13/15 correct, streak 6 -> 87% -> meets twoStar (80), not threeStar.
const result1 = buildStageResult(stage, computeSessionResult(session(500, 6, 15), history(13, 2), stage.drill.questionCount));
const progress1 = recordStageResult(result1);

check('run 1: SessionResult accuracy computed', result1.sessionResult.accuracy === 87,
  `accuracy=${result1.sessionResult.accuracy}`);
check('run 1: StageResult built for the right stage', result1.stageId === stage.id);
check('run 1: 87% + streak 6 -> 2 stars', result1.stars === 2, `stars=${result1.stars}`);
check('run 1: metTiers = oneStar+twoStar only',
  result1.metTiers.oneStar && result1.metTiers.twoStar && !result1.metTiers.threeStar);
check('run 1: GameProgress bestStars updated to 2',
  progress1.bestStars[stage.id] === 2, JSON.stringify(progress1.bestStars));
check('run 1: GameProgress lastPlayed set',
  progress1.lastPlayed?.stageId === stage.id && !!progress1.lastPlayed?.worldId);
check('run 1: GameProgress updatedAt is an ISO timestamp',
  typeof progress1.updatedAt === 'string' && !Number.isNaN(Date.parse(progress1.updatedAt)));

// Run 2: 15/15 correct, streak 10 -> 100% + streak >= 8 -> threeStar -> 3 stars.
const result2 = buildStageResult(stage, computeSessionResult(session(1200, 10, 15), history(15, 0), stage.drill.questionCount));
const progress2 = recordStageResult(result2);
check('run 2: 100% + streak 10 -> 3 stars', result2.stars === 3, `stars=${result2.stars}`);
check('run 2: bestStars rises 2 -> 3 (monotonic)', progress2.bestStars[stage.id] === 3);

// A worse run must not lower the stored best.
const result3 = buildStageResult(stage, computeSessionResult(session(100, 1, 15), history(5, 10), stage.drill.questionCount));
const progress3 = recordStageResult(result3);
check('run 3: 33% run leaves best at 3 (no downgrade)', progress3.bestStars[stage.id] === 3);

// ── Isolation: only localStorage['gameProgress'] may have changed ───────
const after = storage.snapshot();

const leaked: string[] = [];
for (const k of Object.keys(before)) {
  if (after[k] !== before[k]) leaked.push(k);
}
check('no Practice key was modified', leaked.length === 0, `changed: ${leaked.join(', ')}`);

const newKeys = Object.keys(after).filter(k => !(k in before));
check('the only new localStorage key is "gameProgress"',
  newKeys.length === 1 && newKeys[0] === 'gameProgress', `new keys: ${newKeys.join(', ')}`);

check('selectorHistory untouched', after.selectorHistory === before.selectorHistory);
check('best_* untouched', after['best_6|0-12|byFret|dots'] === before['best_6|0-12|byFret|dots']);
check('badges untouched', after.badges === before.badges);

// loadGameProgress round-trips what recordStageResult persisted.
const reloaded = loadGameProgress();
check('loadGameProgress reflects the persisted best', reloaded.bestStars[stage.id] === 3);

console.log('\n--- localStorage diff (before -> after) ---');
console.log('unchanged Practice keys:', Object.keys(before).length - leaked.length, 'of', Object.keys(before).length);
console.log('gameProgress after run :', after.gameProgress);

console.log(failures === 0
  ? '\nAll game-spike checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
