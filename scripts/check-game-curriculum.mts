// Structural validation of the Game curriculum data (src/game/worlds.ts +
// src/game/stages.ts). No test runner in this repo — run by hand like the
// other scripts/check-*.mts:
//
//   node scripts/check-game-curriculum.mts
//
// It asserts the shape the Game layer relies on:
//   • exactly 15 worlds, exactly 139 stages, and the per-world stage counts
//     from the finalised curriculum,
//   • every stage points at a real world, `order` is 1..N unique/contiguous
//     within its world, and stage ids are globally unique and canonical,
//   • every `stage.drill` is a well-formed DrillConfig,
//   • every `candidates` set resolves to real positions, stays within the
//     drill's own strings, and yields a non-empty question pool,
//   • every `targets` triple is monotonic and scores the full 0–3 range,
//   • the unlock chain starts with exactly the first stage open.

import { register } from 'node:module';

// src/ modules import each other without a file extension (Vite resolves it);
// Node needs the `.ts`. Retry extensionless relative specifiers with it.
register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}",
  ),
  import.meta.url,
);

// gameProgress.ts touches localStorage lazily; give it a stand-in.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();

const { WORLDS } = await import('../src/game/worlds.ts');
const { STAGES } = await import('../src/game/stages.ts');
const { groupCandidateFrets, candidateStringPool } = await import('../src/drill/candidates.ts');
const { GUITAR_NOTES } = await import('../src/utils/music.ts');
const { evaluateStars } = await import('../src/game/stageResult.ts');
const { isStageUnlocked, loadGameProgress } = await import('../src/utils/gameProgress.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const EXPECTED_WORLDS = 15;
const EXPECTED_STAGES = 139;
// From the finalised curriculum, in world order 1..15.
const EXPECTED_PER_WORLD: Record<string, number> = {
  'open-strings': 5,
  'open-position-naturals': 11,
  'open-position-sharps': 12,
  'naturals-along-string': 11,
  'chromatic-along-string': 10,
  'dot-landmarks': 6,
  'octaves-unisons': 8,
  'position-boxes-lower': 11,
  'position-boxes-middle': 8,
  'one-note-everywhere': 14,
  'string-pairs': 9,
  'string-groups': 9,
  'upper-neck': 13,
  'whole-neck-integration': 6,
  'mastery-gauntlet': 6,
};

// ── Worlds ────────────────────────────────────────────────────────────
check(`exactly ${EXPECTED_WORLDS} worlds`, WORLDS.length === EXPECTED_WORLDS, `got ${WORLDS.length}`);

const worldIds = WORLDS.map((w) => w.id);
check('world ids are unique', new Set(worldIds).size === worldIds.length);
check('world ids match the expected curriculum set',
  worldIds.length === Object.keys(EXPECTED_PER_WORLD).length &&
  worldIds.every((id) => id in EXPECTED_PER_WORLD),
  worldIds.join(', '));

const worldOrders = WORLDS.map((w) => w.order).sort((a, b) => a - b);
check('world order is 1..15, unique and contiguous',
  worldOrders.length === EXPECTED_WORLDS &&
  worldOrders.every((o, i) => o === i + 1),
  worldOrders.join(','));

for (const w of WORLDS) {
  check(`world "${w.id}" has titleKey`, typeof w.titleKey === 'string' && w.titleKey.length > 0);
}

// ── Stage count, ids, world membership, ordering ──────────────────────
check(`exactly ${EXPECTED_STAGES} stages`, STAGES.length === EXPECTED_STAGES, `got ${STAGES.length}`);

const stageIds = STAGES.map((s) => s.id);
check('stage ids are globally unique', new Set(stageIds).size === stageIds.length);

const knownWorld = new Set(worldIds);
check('every stage.worldId is a real world',
  STAGES.every((s) => knownWorld.has(s.worldId)),
  STAGES.filter((s) => !knownWorld.has(s.worldId)).map((s) => s.id).join(', '));

check('every stage id is canonical (`${worldId}-${order}`)',
  STAGES.every((s) => s.id === `${s.worldId}-${s.order}`),
  STAGES.filter((s) => s.id !== `${s.worldId}-${s.order}`).map((s) => s.id).join(', '));

for (const w of WORLDS) {
  const inWorld = STAGES.filter((s) => s.worldId === w.id);
  const expected = EXPECTED_PER_WORLD[w.id];
  check(`world "${w.id}" has ${expected} stages`, inWorld.length === expected, `got ${inWorld.length}`);

  const orders = inWorld.map((s) => s.order).sort((a, b) => a - b);
  check(`world "${w.id}" order is 1..${expected}, unique and contiguous`,
    orders.length === expected && orders.every((o, i) => o === i + 1),
    orders.join(','));
}

for (const w of WORLDS) {
  check(`world "${w.id}" has titleKey/subtitleKey on every stage`,
    STAGES.filter((s) => s.worldId === w.id).every(
      (s) => typeof s.titleKey === 'string' && s.titleKey.length > 0 &&
        (s.subtitleKey === undefined || (typeof s.subtitleKey === 'string' && s.subtitleKey.length > 0)),
    ));
}

// ── DrillConfig well-formedness ──────────────────────────────────────
const MAX_FRET = GUITAR_NOTES[0].length - 1; // 21 for standard guitar
for (const s of STAGES) {
  const d = s.drill;
  const problems: string[] = [];

  if (!Array.isArray(d.strings) || d.strings.length === 0) problems.push('empty strings');
  if (!d.strings.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)) problems.push('string out of 1..6');
  if (new Set(d.strings).size !== d.strings.length) problems.push('duplicate string');
  if (d.primaryString !== d.strings[0]) problems.push('primaryString != strings[0]');
  if (!d.strings.includes(d.primaryString)) problems.push('primaryString not in strings');
  if (d.isMulti !== d.strings.length > 1) problems.push('isMulti mismatch');
  if (d.mode !== 'byFret' && d.mode !== 'byNote') problems.push(`bad mode ${d.mode}`);
  if (!Number.isInteger(d.fretFrom) || d.fretFrom < 0) problems.push('bad fretFrom');
  if (!Number.isInteger(d.fretTo) || d.fretTo > MAX_FRET) problems.push('bad fretTo');
  if (d.fretFrom > d.fretTo) problems.push('fretFrom > fretTo');
  if (typeof d.wholeToneOnly !== 'boolean') problems.push('wholeToneOnly not boolean');
  if (d.dotsOnly !== false) problems.push('dotsOnly must be false (curriculum uses candidates)');
  if (!Number.isInteger(d.questionCount) || d.questionCount <= 0 || d.questionCount > 40) problems.push('bad questionCount');
  if (typeof d.timeLimit !== 'number' || d.timeLimit <= 0 || d.timeLimit > 15) problems.push('bad timeLimit');
  if (d.accidental !== 'sharps' && d.accidental !== 'flats') problems.push('bad accidental');
  if (d.order !== 'fifths' && d.order !== 'alphabet') problems.push('bad order');
  if (d.interval !== undefined) problems.push('unexpected interval spec');

  check(`drill ok: ${s.id}`, problems.length === 0, problems.join('; '));
}

// ── candidates: resolvable, in-scope, non-empty pool ─────────────────
let candidateStages = 0;
for (const s of STAGES) {
  const d = s.drill;
  if (d.candidates === undefined) continue;
  candidateStages++;
  const problems: string[] = [];

  if (!Array.isArray(d.candidates) || d.candidates.length === 0) problems.push('empty candidates');
  for (const p of d.candidates ?? []) {
    if (!Number.isInteger(p.string) || p.string < 1 || p.string > 6) problems.push(`bad string ${p.string}`);
    if (!Number.isInteger(p.fret) || p.fret < 0 || p.fret > MAX_FRET) problems.push(`bad fret ${p.fret}`);
    if (!d.strings.includes(p.string)) problems.push(`candidate string ${p.string} not in drill.strings`);
  }
  if (d.wholeToneOnly) problems.push('wholeToneOnly set alongside candidates (ignored — should be false)');

  const grouped = groupCandidateFrets(d.candidates ?? [], GUITAR_NOTES);
  if (grouped.size === 0) problems.push('candidates resolve to nothing on the guitar table');
  const pool = candidateStringPool(grouped, d.isMulti, d.primaryString);
  if (pool.length === 0) problems.push('empty candidate string pool');

  check(`candidates ok: ${s.id}`, problems.length === 0, [...new Set(problems)].join('; '));
}
check('the curriculum actually exercises candidate sets', candidateStages > 0, `count=${candidateStages}`);

// ── targets: monotonic and full 0–3 range ───────────────────────────
for (const s of STAGES) {
  const { oneStar, twoStar, threeStar } = s.targets;
  const acc = [oneStar.minAccuracy, twoStar.minAccuracy, threeStar.minAccuracy];
  const problems: string[] = [];

  if (!acc.every((a) => Number.isFinite(a) && a >= 0 && a <= 100)) problems.push('accuracy out of 0..100');
  if (!(acc[0] <= acc[1] && acc[1] <= acc[2])) problems.push(`accuracy not monotonic: ${acc.join(' <= ')}`);

  const streaks = [oneStar.minLongestStreak, twoStar.minLongestStreak, threeStar.minLongestStreak];
  for (const st of streaks) {
    if (st !== undefined && (!Number.isInteger(st) || st < 0)) problems.push(`bad streak ${st}`);
  }
  const defined = [twoStar.minLongestStreak, threeStar.minLongestStreak];
  if (defined[0] !== undefined && defined[1] !== undefined && defined[0] > defined[1]) {
    problems.push(`streak not monotonic: ${defined[0]} > ${defined[1]}`);
  }

  // A flawless run must reach 3★; a failing run must land on 0★.
  const perfect = { score: 0, accuracy: 100, longestStreak: 99, questionsAnswered: s.drill.questionCount, questionsCorrect: s.drill.questionCount, questionCount: s.drill.questionCount };
  const awful = { score: 0, accuracy: 0, longestStreak: 0, questionsAnswered: s.drill.questionCount, questionsCorrect: 0, questionCount: s.drill.questionCount };
  if (evaluateStars(perfect, s.targets) !== 3) problems.push('a 100% run does not score 3★');
  if (evaluateStars(awful, s.targets) !== 0) problems.push('a 0% run does not score 0★');

  check(`targets ok: ${s.id}`, problems.length === 0, problems.join('; '));
}

// ── unlock chain ────────────────────────────────────────────────────
const empty = loadGameProgress();
const ordered = [...STAGES].sort((a, b) => {
  const wa = WORLDS.find((w) => w.id === a.worldId)!.order;
  const wb = WORLDS.find((w) => w.id === b.worldId)!.order;
  return wa - wb || a.order - b.order;
});
check('exactly the first stage in game order is unlocked at zero progress',
  isStageUnlocked(ordered[0].id, empty) === true &&
  isStageUnlocked(ordered[1].id, empty) === false,
  `${ordered[0].id} / ${ordered[1].id}`);

console.log(failures === 0
  ? `\nAll curriculum checks passed — ${WORLDS.length} worlds, ${STAGES.length} stages.`
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
