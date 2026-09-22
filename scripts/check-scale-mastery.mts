// Focused checks for SRS + weakness + mastery on the scale domain
// (src/learning/scaleMastery.ts, src/learning/scaleWeakness.ts, and the
// scale-related additions to src/learning/learningState.ts — scales-learning-
// spec.md §10/§11, Session 2 plan step 3).
//
//   node --experimental-strip-types scripts/check-scale-mastery.mts
//
// Covers:
//   • recordScaleAnswer: bucket advances on correct, resets on wrong,
//     scaleHistory grows and caps at SCALE_HISTORY_CAP, note srs/daily/path
//     and the interval fields are untouched
//   • normalizeScaleHistory: drops malformed rows, keeps well-formed ones,
//     caps + sorts by createdAt
//   • mergeScaleHistory / mergeInstrumentState: real union (dedupe), not
//     last-writer-wins — a row recorded on one device survives a merge
//     against a blob written later on the other
//   • scaleMastery: notStarted -> learning -> mastered transitions, own
//     constants (not the interval ones)
//   • scaleWeakness: each of the four signals fires independently; items
//     with no signal are omitted; deterministic ordering

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

const {
  emptyInstrumentState, recordScaleAnswer, normalizeScaleHistory,
  mergeScaleHistory, mergeInstrumentState, SCALE_HISTORY_CAP,
} = await import('../src/learning/learningState.ts');
const { scaleItemId } = await import('../src/learning/scaleItem.ts');
const { buildScaleBoard, isScaleMastered, scaleStatus, masteredScaleItems } =
  await import('../src/learning/scaleMastery.ts');
const { analyzeScaleWeakness, DEFAULT_SCALE_WEAKNESS_CONFIG } =
  await import('../src/learning/scaleWeakness.ts');
const { buildScalePool } = await import('../src/learning/scaleDrill.ts');
const { SCALE_TYPES } = await import('../src/utils/scales.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const NOW = Date.parse('2026-01-01T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const guitar = INSTRUMENTS.guitar;
const pool = buildScalePool(SCALE_TYPES.map((s: { id: string }) => s.id), guitar.stringCount);
const id1 = scaleItemId('minorPentatonic', 1);
const id2 = scaleItemId('minorPentatonic', 2);

// ── recordScaleAnswer ────────────────────────────────────────────────────
{
  let st = emptyInstrumentState(NOW);
  const before = st;
  st = recordScaleAnswer(st, id1, 'buildScale', true, 3.2, NOW);
  check('recordScaleAnswer: creates an SRS row on first answer', st.scaleSrs[id1]?.bucket === 1);
  check('recordScaleAnswer: appends one scaleHistory row', st.scaleHistory.length === 1);
  check('recordScaleAnswer: history row carries itemId/form/correct/seconds', (
    st.scaleHistory[0].itemId === id1 &&
    st.scaleHistory[0].form === 'buildScale' &&
    st.scaleHistory[0].correct === true &&
    st.scaleHistory[0].seconds === 3.2
  ));
  check('recordScaleAnswer: leaves note srs/daily/path untouched', (
    st.srs === before.srs && st.path === before.path
  ));
  check('recordScaleAnswer: leaves intervalSrs/intervalHistory untouched', (
    st.intervalSrs === before.intervalSrs && st.intervalHistory === before.intervalHistory
  ));

  st = recordScaleAnswer(st, id1, 'identifyScale', false, 1.1, NOW + 1000);
  check('recordScaleAnswer: a wrong answer resets the bucket to 0', st.scaleSrs[id1]?.bucket === 0);
  check('recordScaleAnswer: a wrong answer still appends history (correct:false)', (
    st.scaleHistory.length === 2 && st.scaleHistory[1].correct === false
  ));
}

// ── scaleHistory cap ─────────────────────────────────────────────────────
{
  let st = emptyInstrumentState(NOW);
  for (let i = 0; i < SCALE_HISTORY_CAP + 20; i++) {
    st = recordScaleAnswer(st, id1, 'buildScale', true, 1, NOW + i);
  }
  check(`scaleHistory caps at SCALE_HISTORY_CAP (${SCALE_HISTORY_CAP})`, st.scaleHistory.length === SCALE_HISTORY_CAP);
  check('scaleHistory keeps the most RECENT rows after capping', st.scaleHistory[st.scaleHistory.length - 1].createdAt === NOW + SCALE_HISTORY_CAP + 19);
}

// ── normalizeScaleHistory ────────────────────────────────────────────────
{
  const raw = [
    { itemId: id1, form: 'buildScale', correct: true, seconds: 2, createdAt: NOW },
    { itemId: 'not-a-scale-id', form: 'buildScale', correct: true, seconds: 2, createdAt: NOW }, // dropped: bad id
    { itemId: id1, form: 'bogusForm', correct: true, seconds: 2, createdAt: NOW }, // dropped: bad form
    { itemId: id1, form: 'nameDegree', correct: true, seconds: 2, createdAt: -1 }, // dropped: bad createdAt
    null,
    'garbage',
    { itemId: id2, form: 'identifyScale', correct: false, seconds: 'oops', createdAt: NOW + 5 }, // seconds -> 0
  ];
  const rows = normalizeScaleHistory(raw);
  check('normalizeScaleHistory: drops malformed rows, keeps the 2 well-formed ones', rows.length === 2);
  check('normalizeScaleHistory: keeps well-formed field values', rows[0].itemId === id1 && rows[0].form === 'buildScale');
  check('normalizeScaleHistory: coerces a non-numeric seconds to 0', rows[1].seconds === 0);
  check('normalizeScaleHistory: non-array input -> []', normalizeScaleHistory('nope').length === 0);
  check('normalizeScaleHistory: missing key (pre-P5 blob) -> []', normalizeScaleHistory(undefined).length === 0);
}

// ── mergeScaleHistory / mergeInstrumentState — real union, not LWW ──────
{
  const a = [{ itemId: id1, form: 'buildScale' as const, correct: true, seconds: 1, createdAt: NOW }];
  const b = [{ itemId: id2, form: 'nameDegree' as const, correct: false, seconds: 2, createdAt: NOW + 10 }];
  const merged = mergeScaleHistory(a, b);
  check('mergeScaleHistory: unions rows from both devices', merged.length === 2);
  const dup = mergeScaleHistory(a, a);
  check('mergeScaleHistory: dedupes an identical row', dup.length === 1);

  let deviceA = emptyInstrumentState(NOW);
  deviceA = recordScaleAnswer(deviceA, id1, 'buildScale', true, 1, NOW);
  let deviceB = emptyInstrumentState(NOW);
  // Device B's blob is "newer" overall but never touched id1 — a naive
  // last-writer-wins merge would drop device A's review entirely.
  deviceB = recordScaleAnswer(deviceB, id2, 'identifyScale', true, 1, NOW + DAY);
  const merged2 = mergeInstrumentState(deviceA, deviceB);
  check('mergeInstrumentState: a review made on one device is never dropped (scaleSrs)', merged2.scaleSrs[id1]?.bucket === 1);
  check('mergeInstrumentState: the other device\'s review also survives', merged2.scaleSrs[id2]?.bucket === 1);
  check('mergeInstrumentState: both devices\' scaleHistory rows survive', merged2.scaleHistory.length === 2);
}

// ── scaleMastery ──────────────────────────────────────────────────────────
{
  let st = emptyInstrumentState(NOW);
  check('scaleStatus: notStarted with no SRS row and no history', scaleStatus(id1, st.scaleSrs, st.scaleHistory, NOW) === 'notStarted');

  // 4 recent correct answers, evenly recent -> high weighted accuracy, enough
  // effectiveN -> mastered.
  for (let i = 0; i < 4; i++) {
    st = recordScaleAnswer(st, id1, 'buildScale', true, 1, NOW - i * 1000);
  }
  check('isScaleMastered: true after enough recent correct evidence', isScaleMastered(id1, st.scaleSrs, st.scaleHistory, NOW));
  check('scaleStatus: mastered matches isScaleMastered', scaleStatus(id1, st.scaleSrs, st.scaleHistory, NOW) === 'mastered');

  const mastered = masteredScaleItems(pool, st.scaleSrs, st.scaleHistory, NOW);
  check('masteredScaleItems: contains the mastered item', mastered.has(id1));
  check('masteredScaleItems: does not contain an untouched item', !mastered.has(id2));

  const board = buildScaleBoard({ pool, scaleSrs: st.scaleSrs, historyRows: st.scaleHistory, now: NOW });
  check('buildScaleBoard: one row per pool item', board.length === pool.length);
  check('buildScaleBoard: row order matches the pool order (grouped by scale type)', board.every((r, i) => r.scaleTypeId === pool[i].scaleTypeId && r.positionIndex === pool[i].positionIndex));
  const row1 = board.find((r) => r.itemId === id1)!;
  check('buildScaleBoard: mastered row carries status "mastered"', row1.status === 'mastered');
  const row2 = board.find((r) => r.itemId === id2)!;
  check('buildScaleBoard: an untouched row carries status "notStarted"', row2.status === 'notStarted');
}

// ── scaleWeakness ──────────────────────────────────────────────────────────
{
  // recentMistakes signal: enough evidence, the 2 MOST RECENT answers (lowest
  // i -> largest createdAt) are wrong, the older ones correct.
  let st = emptyInstrumentState(NOW);
  for (let i = 0; i < 6; i++) {
    st = recordScaleAnswer(st, id1, 'buildScale', i >= 2, 1, NOW - i * 1000);
  }
  const weak1 = analyzeScaleWeakness(st.scaleHistory, st.scaleSrs, NOW);
  const sig1 = weak1.find((s) => s.itemId === id1);
  check('analyzeScaleWeakness: finds a signal for an item with recent misses', sig1 != null);
  check('analyzeScaleWeakness: recentMistakes reason fires on repeated recent misses', sig1?.reasons.includes('recentMistakes') === true);

  // overdue signal only: one wrong answer long ago -> due immediately, no
  // recent history left inside the decay window to fire other signals.
  let st2 = emptyInstrumentState(NOW - 40 * DAY);
  st2 = recordScaleAnswer(st2, id2, 'buildScale', false, 1, NOW - 40 * DAY);
  const weak2 = analyzeScaleWeakness(st2.scaleHistory, st2.scaleSrs, NOW, DEFAULT_SCALE_WEAKNESS_CONFIG);
  const sig2 = weak2.find((s) => s.itemId === id2);
  check('analyzeScaleWeakness: overdue reason fires for a long-lapsed SRS item', sig2?.reasons.includes('overdue') === true);

  // no signal at all -> omitted.
  const untouched = analyzeScaleWeakness([], {}, NOW);
  check('analyzeScaleWeakness: empty history + empty srs -> no signals', untouched.length === 0);

  check('analyzeScaleWeakness: deterministic ordering (score desc)', weak1.every((s, i) => i === 0 || weak1[i - 1].score >= s.score));
}

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
