// Focused checks for the P2 "Premium Teacher for Notes" learning layer
// (src/learning/*). No test runner in this repo — run by hand, never part of
// `npm run build`, same spirit as scripts/check-candidates.mts /
// check-game-spike.mts:
//
//   node --experimental-strip-types scripts/check-learning.mts
//
// Covers the task's validation list that can be checked headlessly:
//   • NoteItem identity is used consistently
//   • weakness ranking is deterministic
//   • slow / incorrect positions become weak candidates
//   • SRS correct / incorrect transitions behave as intended
//   • overdue items are prioritised
//   • the planner produces a valid DrillConfig with in-range candidates
//   • Teacher answers update SRS + the daily goal
//   • offline learning state round-trips through localStorage
//   • sync merges per NoteItem (a review on device B is not discarded)
//   • the daily goal rolls over at the day boundary
//
// The integration points ("Teacher sessions don't bypass the engine", "history
// still recorded", "Premium-only gating", "Free/Pro unchanged") are covered by
// `npm run build` + scripts/check-candidates.mts + the entitlement layer, and
// by manual play in `npm run dev`.

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

const { noteItemId, parseNoteItemId, compareNoteItemId } =
  await import('../src/learning/noteItem.ts');
const {
  newSrsItem, reviewSrsItem, isDue, overdueByMs, dueItems, mergeSrsItem, mergeSrsMaps,
  BUCKET_INTERVALS_MS, LAPSE_DELAY_MS,
} = await import('../src/learning/srs.ts');
const { analyzeWeakness, leastPractisedPositions } =
  await import('../src/learning/weakness.ts');
const { buildDailyPlan, buildWeakSpotsPlan } = await import('../src/learning/planner.ts');
const {
  loadLearningState, saveLearningStateLocal, getInstrumentState, withInstrumentState,
  recordTeacherAnswer, rollDailyGoal, mergeLearningState, emptyInstrumentState,
} = await import('../src/learning/learningState.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const T0 = Date.UTC(2026, 8, 6, 12, 0, 0); // fixed "now" for determinism
const DAY = 24 * 60 * 60 * 1000;

// A history row as useHistory.addEntry would have built it.
function row(
  string: number, fret: number, correct: boolean | null, seconds: number, tOffsetMs: number,
) {
  return {
    note: 'X', string, fret, seconds,
    skipped: correct === null,
    correct,
    createdAt: new Date(T0 - DAY + tOffsetMs).toISOString(),
  };
}

// ── NoteItem identity ──────────────────────────────────────────────────
{
  check('noteItemId round-trips', (() => {
    const id = noteItemId(6, 3);
    const p = parseNoteItemId(id);
    return id === '6:3' && p?.string === 6 && p?.fret === 3;
  })());
  check('parseNoteItemId rejects junk',
    parseNoteItemId('nope') === null && parseNoteItemId('6:') === null);
  check('compareNoteItemId orders by string then fret',
    compareNoteItemId('5:9', '6:0') < 0 && compareNoteItemId('6:3', '6:10') < 0);
}

// ── SRS transitions ───────────────────────────────────────────────────
{
  const fresh = newSrsItem('6:3', T0);
  check('new item is bucket 0 and due now', fresh.bucket === 0 && isDue(fresh, T0));

  const c1 = reviewSrsItem(fresh, true, T0);
  check('correct → bucket 1, pushed out',
    c1.bucket === 1 && c1.dueAt === T0 + BUCKET_INTERVALS_MS[1] && !isDue(c1, T0));
  check('correct advances reps, no lapse', c1.reps === 1 && c1.lapses === 0);

  const c2 = reviewSrsItem(c1, true, T0 + 1000);
  const c3 = reviewSrsItem(c2, true, T0 + 2000);
  check('successive correct answers keep climbing buckets',
    c2.bucket === 2 && c3.bucket === 3);

  const w = reviewSrsItem(c3, false, T0 + 3000);
  check('incorrect → back to bucket 0', w.bucket === 0);
  check('incorrect → due again very soon (LAPSE_DELAY)',
    w.dueAt === T0 + 3000 + LAPSE_DELAY_MS && w.dueAt < c3.dueAt);
  check('incorrect increments lapses', w.lapses === 1 && w.reps === 4);

  // Bucket cap.
  let it = newSrsItem('1:0', T0);
  for (let i = 0; i < 20; i++) it = reviewSrsItem(it, true, T0 + i * DAY * 40);
  check('bucket never exceeds the interval table',
    it.bucket === BUCKET_INTERVALS_MS.length - 1);
}

// ── Overdue prioritisation ────────────────────────────────────────────
{
  const map: Record<string, ReturnType<typeof newSrsItem>> = {
    '6:1': { ...newSrsItem('6:1', T0), dueAt: T0 - 5 * DAY }, // most overdue
    '6:2': { ...newSrsItem('6:2', T0), dueAt: T0 - 1 * DAY },
    '6:3': { ...newSrsItem('6:3', T0), dueAt: T0 + 5 * DAY }, // not due
  };
  const due = dueItems(map, T0);
  check('dueItems returns only due items', due.length === 2);
  check('dueItems is most-overdue first',
    due[0].itemId === '6:1' && due[1].itemId === '6:2');
  check('overdueByMs is 0 for a not-yet-due item', overdueByMs(map['6:3'], T0) === 0);
}

// ── Weakness detection: slow + inaccurate become candidates ────────────
{
  const entries = [
    // 5:5 — accurate and fast → NOT weak
    ...Array.from({ length: 6 }, (_, i) => row(5, 5, true, 1.2, i * 1000)),
    // 6:3 — half wrong → weak (lowAccuracy)
    ...Array.from({ length: 6 }, (_, i) => row(6, 3, i % 2 === 0, 2, 10_000 + i * 1000)),
    // 4:7 — all correct but slow → weak (slow)
    ...Array.from({ length: 6 }, (_, i) => row(4, 7, true, 6.5, 20_000 + i * 1000)),
    // 3:2 — last few all missed → weak (recentMistakes)
    row(3, 2, true, 2, 30_000), row(3, 2, false, 2, 31_000),
    row(3, 2, null, 2, 32_000), row(3, 2, false, 2, 33_000),
  ];
  const signals = analyzeWeakness(entries, {}, T0);
  const ids = signals.map((s) => s.itemId);
  check('inaccurate position flagged weak', ids.includes('6:3'));
  check('slow position flagged weak', ids.includes('4:7'));
  check('repeated recent misses flagged weak', ids.includes('3:2'));
  check('accurate + fast position NOT flagged', !ids.includes('5:5'));
  check('slow reason recorded for 4:7',
    signals.find((s) => s.itemId === '4:7')!.reasons.includes('slow'));

  // Determinism: identical inputs → identical order.
  const again = analyzeWeakness(entries, {}, T0);
  check('weakness ranking is deterministic',
    JSON.stringify(signals) === JSON.stringify(again));

  // Overdue SRS alone is enough to surface a position with no recent history.
  const withSrs = analyzeWeakness([], { '2:9': { ...newSrsItem('2:9', T0), dueAt: T0 - 2 * DAY } }, T0);
  check('overdue-only position surfaces as weak',
    withSrs.length === 1 && withSrs[0].itemId === '2:9' && withSrs[0].overdue);
}

// ── leastPractisedPositions ──────────────────────────────────────────
{
  const entries = [row(6, 0, true, 1, 0), row(6, 0, true, 1, 1), row(6, 1, true, 1, 2)];
  const ranked = leastPractisedPositions(entries, { strings: [6], fretFrom: 0, fretTo: 2 });
  check('least-practised: unplayed fret ranks before played ones',
    ranked[0].itemId === '6:2' && ranked[ranked.length - 1].itemId === '6:0');
}

// ── Planner: valid DrillConfig, in-range candidates, priority order ────
{
  const allStrings = [1, 2, 3, 4, 5, 6];
  const base = {
    entries: [
      ...Array.from({ length: 6 }, (_, i) => row(6, 3, i % 2 === 0, 2, i * 1000)), // weak
      ...Array.from({ length: 6 }, (_, i) => row(5, 8, true, 6.4, 10_000 + i * 1000)), // slow
    ],
    srs: { '2:2': { ...newSrsItem('2:2', T0), dueAt: T0 - 3 * DAY } }, // overdue
    now: T0,
    maxFret: 21,
    allStrings,
    accidental: 'sharps' as const,
    order: 'fifths' as const,
  };
  const plan = buildDailyPlan(base);
  check('daily plan is non-empty', plan.items.length > 0);
  check('overdue item comes first', plan.items[0].bucket === 'overdue' && plan.items[0].itemId === '2:2');
  check('weak positions are included',
    plan.items.some((p) => p.itemId === '6:3') && plan.items.some((p) => p.itemId === '5:8'));

  const d = plan.drill;
  check('drill.candidates mirrors the planned items',
    d.candidates!.length === plan.items.length);
  check('every candidate is in the drill fret window',
    d.candidates!.every((c) => c.fret >= d.fretFrom && c.fret <= d.fretTo));
  check('every candidate string is drillable',
    d.candidates!.every((c) => allStrings.includes(c.string)));
  check('drill config shape is valid',
    d.mode === 'byFret' && d.questionCount >= plan.items.length &&
    d.timeLimit >= 4 && d.timeLimit <= 9 &&
    (d.isMulti ? d.strings.length > 1 : d.strings.length === 1) &&
    d.strings.includes(d.primaryString) && !d.wholeToneOnly && !d.dotsOnly);
  check('planner is deterministic',
    JSON.stringify(buildDailyPlan(base)) === JSON.stringify(plan));

  // Brand-new user: no history, no SRS → still a usable coverage plan.
  const cold = buildDailyPlan({ ...base, entries: [], srs: {} });
  check('cold-start plan falls back to coverage',
    cold.items.length > 0 && cold.items.every((p) => p.bucket === 'coverage'));
  check('cold-start weak-spots plan is null (nothing weak yet)',
    buildWeakSpotsPlan({ ...base, entries: [], srs: {} }) === null);

  // Weak-spots plan: overdue + weak only, no coverage/consolidation padding.
  const weak = buildWeakSpotsPlan(base)!;
  check('weak-spots plan excludes coverage/consolidation',
    weak.items.every((p) => p.bucket === 'overdue' || p.bucket === 'weak'));
}

// ── Learning state: offline round-trip + Teacher answer updates ───────
{
  localStorage.clear();
  let state = loadLearningState(T0);
  check('empty load is a valid empty state',
    state.version === 1 && Object.keys(state.instruments).length === 0);

  let g = getInstrumentState(state, 'guitar', T0);
  g = recordTeacherAnswer(g, { string: 6, fret: 3 }, false, T0);
  g = recordTeacherAnswer(g, { string: 6, fret: 3 }, true, T0 + 1000);
  g = recordTeacherAnswer(g, { string: 5, fret: 8 }, true, T0 + 2000);
  state = withInstrumentState(state, 'guitar', g);
  saveLearningStateLocal(state);

  const reloaded = loadLearningState(T0 + 3000);
  const rg = getInstrumentState(reloaded, 'guitar', T0 + 3000);
  check('Teacher answers persisted to localStorage', Object.keys(rg.srs).length === 2);
  check('SRS state reflects the answers (6:3 was wrong then right → bucket 1)',
    rg.srs['6:3'].bucket === 1 && rg.srs['6:3'].reps === 2 && rg.srs['6:3'].lapses === 1);
  check('daily goal counted every Teacher answer', rg.daily.completed === 3);
  check('daily goal has today\'s date', rg.daily.dateISO === '2026-09-06');
}

// ── Daily goal roll-over ─────────────────────────────────────────────
{
  const yesterday = { dateISO: '2026-09-05', target: 12, completed: 9 };
  const rolled = rollDailyGoal(yesterday, T0, 12);
  check('goal rolls to today and resets completed',
    rolled.dateISO === '2026-09-06' && rolled.completed === 0 && rolled.target === 12);
  const sameDay = { dateISO: '2026-09-06', target: 12, completed: 4 };
  check('same-day goal is left untouched', rollDailyGoal(sameDay, T0, 12) === sameDay);
}

// ── Sync merge: per-NoteItem, a review on device B is NOT discarded ──
{
  // Device A reviewed 6:3 (older) and 6:5.
  const a = {
    '6:3': { itemId: '6:3', bucket: 2, dueAt: T0 + DAY, lastReviewedAt: T0 - 2 * DAY, reps: 2, lapses: 0 },
    '6:5': { itemId: '6:5', bucket: 1, dueAt: T0, lastReviewedAt: T0 - DAY, reps: 1, lapses: 0 },
  };
  // Device B reviewed 6:3 more recently (bucket 3) and a new item 6:7.
  const b = {
    '6:3': { itemId: '6:3', bucket: 3, dueAt: T0 + 3 * DAY, lastReviewedAt: T0 - 1 * DAY, reps: 3, lapses: 0 },
    '6:7': { itemId: '6:7', bucket: 1, dueAt: T0, lastReviewedAt: T0 - 1000, reps: 1, lapses: 0 },
  };
  const merged = mergeSrsMaps(a, b);
  check('merge keeps every item from both devices',
    Object.keys(merged).sort().join(',') === '6:3,6:5,6:7');
  check('merge takes the more recent review for a shared item',
    merged['6:3'].bucket === 3 && merged['6:3'].reps === 3);
  check('merge keeps device A\'s exclusive item', merged['6:5'].bucket === 1);
  check('merge keeps device B\'s exclusive item', merged['6:7'].bucket === 1);
  check('merge is order-independent',
    JSON.stringify(mergeSrsMaps(b, a)['6:3']) === JSON.stringify(merged['6:3']));

  // Two never-reviewed copies keep the sooner dueAt (whichever wants attention first).
  const n1 = newSrsItem('1:1', T0);
  const n2 = { ...newSrsItem('1:1', T0), dueAt: T0 - DAY };
  check('two fresh copies keep the earlier dueAt', mergeSrsItem(n1, n2).dueAt === T0 - DAY);

  // Whole-state merge, per instrument.
  const sA = withInstrumentState({ version: 1 as const, instruments: {} }, 'guitar', {
    ...emptyInstrumentState(T0), srs: a, daily: { dateISO: '2026-09-06', target: 12, completed: 5 },
  });
  const sB = withInstrumentState({ version: 1 as const, instruments: {} }, 'guitar', {
    ...emptyInstrumentState(T0), srs: b, daily: { dateISO: '2026-09-06', target: 12, completed: 3 },
  });
  const sM = mergeLearningState(sA, sB);
  check('learning-state merge unions SRS per item',
    Object.keys(sM.instruments.guitar.srs).sort().join(',') === '6:3,6:5,6:7');
  check('learning-state merge keeps the higher same-day goal progress',
    sM.instruments.guitar.daily.completed === 5);
}

console.log(failures === 0
  ? '\nAll learning-layer checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
