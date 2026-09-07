// ── intervalCurriculum.ts — the Teacher's internal interval ordering ─────
//
// Intervals Learning spec §6. The 11 drilled interval qualities (m2…M7)
// grouped into an *introduction order* plus the confuser pairs the guided
// planner must always drill together. This module is DATA ONLY:
//
//   • no checkpoints, no unlock thresholds, no per-stage progress, no stars;
//   • the learner never "walks" it — every interval is drillable from the
//     Interval Selector at any time (§5.2);
//   • the planner (§13/§14) consults it to decide what to introduce next and
//     which pairs to drill together. `currentGroupIndex` is derived on the
//     fly from the mastered-size set and is never stored (§6.4).
//
// Contrast `src/learning/path.ts` (Notes), which encodes a rendered ladder
// and persists per-checkpoint stars. Intervals has no path screen and this
// file imports nothing from `src/game/**`.
//
// Semitone sizes (see `src/utils/intervals.ts` INTERVALS):
//   m2=1  M2=2  m3=3  M3=4  P4=5  TT=6  P5=7  m6=8  M6=9  m7=10  M7=11

export interface IntervalGroup {
  /** Stable slug, unique across the curriculum ('perfect', 'thirds', …). */
  id: string;
  /** 1-based introduction order. */
  order: number;
  /** Short group name — a plain English string that doubles as its i18n key
   *  (app convention; see `src/i18n/translations.ts`). Rendered only as
   *  "currently learning: <name>" (§12.1), never as a path step. */
  name: string;
  /** Semitone sizes this group introduces. */
  introduces: number[];
  /** Earlier sizes this group keeps in the guided pool for review
   *  (~20–30% of a guided pool — §6.2). */
  review: number[];
  /** Pairs the guided pool must always drill together so the learner
   *  practises telling them apart (§9.2). Each pair lies within this group's
   *  `introduces ∪ review ∪ earlier introduces`. */
  confusers: [number, number][];
}

// §6.2. Seven groups, in introduction order. Ordered by ease of hearing,
// conceptual simplicity, discriminability between qualities and musical
// importance — deliberately NOT by semitone size (§6.1).
export const INTERVAL_CURRICULUM: readonly IntervalGroup[] = [
  {
    id: 'perfect',
    order: 1,
    name: 'Perfect 4th & 5th',
    introduces: [5, 7],
    review: [],
    confusers: [[5, 7]],
  },
  {
    id: 'thirds',
    order: 2,
    name: 'Major & minor 3rds',
    introduces: [3, 4],
    review: [5, 7],
    confusers: [[4, 3], [4, 5]],
  },
  {
    id: 'steps',
    order: 3,
    name: 'Whole & half steps',
    introduces: [1, 2],
    review: [3, 4],
    confusers: [[1, 2], [2, 3]],
  },
  {
    id: 'sixths',
    order: 4,
    name: 'Major & minor 6ths',
    introduces: [8, 9],
    review: [3, 4],
    confusers: [[9, 8], [8, 7]],
  },
  {
    id: 'sevenths',
    order: 5,
    name: 'Major & minor 7ths',
    introduces: [10, 11],
    review: [1, 2, 9],
    confusers: [[10, 11], [10, 9]],
  },
  {
    id: 'tritone',
    order: 6,
    name: 'The tritone',
    introduces: [6],
    review: [5, 7],
    confusers: [[6, 5], [6, 7]],
  },
  {
    id: 'all',
    order: 7,
    name: 'All intervals',
    introduces: [],
    review: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    // Every nearest-neighbour pair (§6.2, group 7).
    confusers: [
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
      [6, 7], [7, 8], [8, 9], [9, 10], [10, 11],
    ],
  },
];

/** Default "mostly mastered" ratio for advancing the Teacher's current group
 *  (§6.3 — "≥ 70% of the earlier intervals"). A first draft to tune in
 *  playtest. */
export const DEFAULT_READY_RATIO = 0.7;

/**
 * Semitone sizes introduced through group index `idx` inclusive — the
 * "learned so far" set (§5.2 "All learned", §6.4).
 *
 * `idx < 0` ⇒ empty; `idx` past the last group ⇒ every introduced size.
 * Order follows the curriculum; deduped.
 */
export function sizesThroughGroup(idx: number): number[] {
  const out: number[] = [];
  const last = Math.min(idx, INTERVAL_CURRICULUM.length - 1);
  for (let i = 0; i <= last; i++) {
    for (const s of INTERVAL_CURRICULUM[i].introduces) {
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}

/**
 * The Teacher's current curriculum group index (0-based). Advance past a
 * group once the sizes introduced through it are at least `readyRatio`
 * mastered; stop at the first group that is not yet ready, clamped to the
 * last group.
 *
 * Pure — takes the mastered-size set, returns an index. No storage, no
 * checkpoint record (§6.4). `currentGroupIndex(∅) === 0`;
 * `currentGroupIndex({1..11}) === 6`.
 */
export function currentGroupIndex(
  masteredSizes: Set<number>,
  readyRatio: number = DEFAULT_READY_RATIO,
): number {
  let idx = 0;
  while (idx < INTERVAL_CURRICULUM.length - 1) {
    const through = sizesThroughGroup(idx);
    const mastered = through.filter((s) => masteredSizes.has(s)).length;
    if (through.length > 0 && mastered / through.length >= readyRatio) idx++;
    else break;
  }
  return idx;
}
