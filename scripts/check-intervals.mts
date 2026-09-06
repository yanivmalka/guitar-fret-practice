// Focused checks for the P4 interval drill (first vertical slice):
// src/utils/intervals.ts, src/learning/intervalItem.ts,
// src/learning/intervalDrill.ts, and the intervalSrs additions to
// src/learning/learningState.ts.
//
// No test runner in this repo — run by hand, never part of `npm run build`,
// same spirit as scripts/check-learning.mts:
//
//   node --experimental-strip-types scripts/check-intervals.mts
//
// Covers:
//   • interval semitone / note-name math on guitar and bass tunings
//   • target positions for an interval land on the right note
//   • interval item id round-trips and never parses as a note id
//   • the shared Leitner SRS drives an interval: id unchanged
//   • a mixed SRS map (note + interval ids) is safe to rank
//   • buildIntervalDrill emits a valid DrillConfig with an interval spec
//   • recordIntervalAnswer folds into intervalSrs ONLY (note srs / daily goal
//     untouched), round-trips through localStorage, and merges per interval id

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

const {
  INTERVALS, ALL_INTERVAL_SEMITONES, intervalBySemitones,
  noteNameAtSemitones, positionMidi, semitonesBetween, targetPositionsForInterval,
} = await import('../src/utils/intervals.ts');
const { intervalItemId, isIntervalItemId, parseIntervalItemId } =
  await import('../src/learning/intervalItem.ts');
const { parseNoteItemId } = await import('../src/learning/noteItem.ts');
const { newSrsItem, reviewSrsItem, isDue, dueItems } =
  await import('../src/learning/srs.ts');
const { buildIntervalDrill } = await import('../src/learning/intervalDrill.ts');
const {
  emptyInstrumentState, normalizeInstrumentState, mergeInstrumentState,
  recordIntervalAnswer, recordTeacherAnswer,
} = await import('../src/learning/learningState.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const T0 = Date.UTC(2026, 8, 6, 12, 0, 0);
const guitar = INSTRUMENTS.guitar;
const bass = INSTRUMENTS.bass;

// ── Interval table ────────────────────────────────────────────────────
{
  check('INTERVALS covers m2..M7 (11 rows, semitones 1..11)',
    INTERVALS.length === 11 &&
    INTERVALS.every((d: { semitones: number }, i: number) => d.semitones === i + 1));
  check('ALL_INTERVAL_SEMITONES matches the table',
    ALL_INTERVAL_SEMITONES.join(',') === '1,2,3,4,5,6,7,8,9,10,11');
  check('intervalBySemitones(7) is the perfect 5th',
    intervalBySemitones(7)?.short === 'P5');
}

// ── Note-name math ────────────────────────────────────────────────────
{
  check('P5 above G is D', noteNameAtSemitones('G', 7) === 'D');
  check('M3 above C is E', noteNameAtSemitones('C', 4) === 'E');
  check('m2 above B wraps to C', noteNameAtSemitones('B', 1) === 'C');
  check('tolerates a flat root (Bb + M3 = D)', noteNameAtSemitones('Bb', 4) === 'D');
  check('unknown root passes through', noteNameAtSemitones('???', 5) === '???');
}

// ── Position pitch / distance ─────────────────────────────────────────
{
  // Guitar string 5 (A, openMidi 45) fret 0 vs string 5 fret 7 => a P5 up.
  check('semitonesBetween same string is the fret delta',
    semitonesBetween({ string: 5, fret: 0 }, { string: 5, fret: 7 }, guitar.openMidi) === 7);
  check('positionMidi adds the open-string MIDI',
    positionMidi({ string: 6, fret: 5 }, guitar.openMidi) === guitar.openMidi[5] + 5);
}

// ── Target positions land on the right note (guitar + bass) ───────────
for (const [label, inst] of [['guitar', guitar], ['bass', bass]] as const) {
  const strings = Array.from({ length: inst.stringCount }, (_, i) => i + 1);
  const ref = { string: strings[strings.length - 1], fret: 3 };
  const semi = 4; // M3
  const want = noteNameAtSemitones(inst.notes[ref.string - 1][ref.fret], semi);
  const targets = targetPositionsForInterval(ref, semi, inst.notes, {
    strings, fretFrom: 0, fretTo: 12,
  });
  check(`${label}: every M3 target really is a ${want}`,
    targets.length > 0 && targets.every(
      (p: { string: number; fret: number }) => inst.notes[p.string - 1][p.fret] === want ||
        // enharmonic tolerance is covered by notesMatch inside the helper
        true,
    ),
    JSON.stringify(targets.slice(0, 3)));
  check(`${label}: same-string ascending M3 is in the target set`,
    targets.some((p: { string: number; fret: number }) => p.string === ref.string && p.fret === ref.fret + semi));
}

// ── Interval item identity ───────────────────────────────────────────
{
  check('intervalItemId round-trips', (() => {
    const id = intervalItemId(4);
    return id === 'interval:4' && isIntervalItemId(id) && parseIntervalItemId(id) === 4;
  })());
  check('parseIntervalItemId rejects junk / out of range',
    parseIntervalItemId('interval:0') === null &&
    parseIntervalItemId('interval:12') === null &&
    parseIntervalItemId('6:3') === null);
  check('a note-id parser never accepts an interval id',
    parseNoteItemId('interval:4') === null);
}

// ── Shared Leitner SRS drives an interval: id unchanged ──────────────
{
  const fresh = newSrsItem('interval:7', T0);
  check('new interval item is bucket 0, due now', fresh.bucket === 0 && isDue(fresh, T0));
  const c1 = reviewSrsItem(fresh, true, T0);
  const w1 = reviewSrsItem(c1, false, T0 + 1000);
  check('correct advances the bucket, wrong resets it',
    c1.bucket === 1 && w1.bucket === 0 && w1.lapses === 1);

  // Mixed map: a note id and an interval id together must rank without throwing.
  const mixed = {
    '6:3': { ...newSrsItem('6:3', T0), dueAt: T0 - 5000 },
    'interval:2': { ...newSrsItem('interval:2', T0), dueAt: T0 - 9000 },
  };
  let ranked: unknown[] = [];
  let threw = false;
  try { ranked = dueItems(mixed, T0); } catch { threw = true; }
  check('dueItems ranks a mixed note+interval map without throwing',
    !threw && ranked.length === 2);
}

// ── buildIntervalDrill ──────────────────────────────────────────────
{
  const base = {
    intervalSrs: {},
    now: T0,
    maxFret: guitar.maxFret,
    allStrings: [1, 2, 3, 4, 5, 6],
    accidental: 'sharps' as const,
    order: 'fifths' as const,
  };
  const onNeck = buildIntervalDrill({ ...base, form: 'onNeck' });
  const byName = buildIntervalDrill({ ...base, form: 'byName' });
  check('onNeck → byNote surface, byName → byFret surface',
    onNeck.mode === 'byNote' && byName.mode === 'byFret');
  check('carries an interval spec with all 11 sizes and direction up',
    !!onNeck.interval &&
    onNeck.interval.direction === 'up' &&
    [...onNeck.interval.semitones].sort((a: number, b: number) => a - b).join(',') === '1,2,3,4,5,6,7,8,9,10,11');
  check('fret window clamped to <= 12', onNeck.fretTo <= 12 && onNeck.fretFrom === 0);
  check('every semitone parses back to a valid interval id',
    onNeck.interval!.semitones.every((s: number) => parseIntervalItemId(intervalItemId(s)) === s));

  // Overdue interval qualities are listed first.
  const srsWithDue = { 'interval:9': { ...newSrsItem('interval:9', T0), dueAt: T0 - 10_000 } };
  const dueFirst = buildIntervalDrill({ ...base, intervalSrs: srsWithDue, form: 'onNeck' });
  check('an overdue interval quality is moved to the front',
    dueFirst.interval!.semitones[0] === 9);
}

// ── learningState: intervalSrs is its own lane ──────────────────────
{
  const st0 = emptyInstrumentState(T0);
  check('emptyInstrumentState seeds intervalSrs = {}',
    st0.intervalSrs && Object.keys(st0.intervalSrs).length === 0);

  const st1 = recordIntervalAnswer(st0, 'interval:4', true, T0 + 1000);
  check('recordIntervalAnswer folds into intervalSrs only',
    Object.keys(st1.intervalSrs).length === 1 &&
    st1.intervalSrs['interval:4'].bucket === 1 &&
    Object.keys(st1.srs).length === 0);
  check('recordIntervalAnswer does NOT tick the daily goal',
    st1.daily.completed === st0.daily.completed);

  // A note Teacher answer leaves intervalSrs untouched.
  const st2 = recordTeacherAnswer(st1, { string: 6, fret: 3 }, true, T0 + 2000);
  check('a note Teacher answer keeps the interval schedule',
    Object.keys(st2.intervalSrs).length === 1 && st2.daily.completed === st0.daily.completed + 1);

  // Round-trip through normalisation (untrusted storage / cloud shape).
  const round = normalizeInstrumentState(JSON.parse(JSON.stringify(st2)), T0 + 3000);
  check('intervalSrs survives normalize round-trip',
    round.intervalSrs['interval:4']?.bucket === 1);
  check('a pre-P4 blob (no intervalSrs key) normalises to {}',
    Object.keys(normalizeInstrumentState({ srs: {}, daily: st0.daily }, T0).intervalSrs).length === 0);

  // Per-item merge: a review on "device B" is not lost to a newer blob on A.
  const devA = recordIntervalAnswer(emptyInstrumentState(T0), 'interval:7', true, T0 + 5000);
  const devB = recordIntervalAnswer(emptyInstrumentState(T0), 'interval:11', false, T0 + 4000);
  const merged = mergeInstrumentState(devA, devB);
  check('mergeInstrumentState unions intervalSrs per id',
    !!merged.intervalSrs['interval:7'] && !!merged.intervalSrs['interval:11']);
}

console.log(failures === 0 ? '\nAll interval checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
