// ── staffMastery.ts — each written pitch's status + the progress board ─────
//
// staff-reading-spec.md §12. Mirrors `scaleMastery.ts` one domain over: given
// the staff SRS map and the capped staff answer history, decide for each
// pitch in the pool whether it is `notStarted` / `learning` / `mastered`.
// Nothing is stored — the board is derived every render.
//
// Own constants, deliberately NOT imported from `scaleMastery.ts` or
// `intervalMastery.ts`, so tuning one domain never silently moves another.
// Same recency-decay engine (`./recency`).

import type { StaffHistoryRow } from './learningState';
import type { SrsMap } from './srs';
import type { StaffPoolItem } from './staffDrill';
import {
  DAY_MS,
  DEFAULT_HALF_LIFE_DAYS,
  HARD_CAP_DAYS,
  weightedAccuracy,
  positionScore,
} from './recency';

/** Weighted recent accuracy at or above which a pitch counts as mastered. */
export const STAFF_MASTERED_ACCURACY = 0.8;
/** Minimum weighted answer count before the accuracy is trusted on its own
 *  (below it `positionScore` falls back to the SRS bucket). */
export const STAFF_MIN_EFFECTIVE_N = 4;
/** The plain display window behind the board's accuracy figure. */
export const STAFF_STATS_WINDOW_DAYS = 45;

const HALF_LIFE_MS = DEFAULT_HALF_LIFE_DAYS * DAY_MS;

export type StaffStatus = 'notStarted' | 'learning' | 'mastered';

export interface StaffBoardItem {
  itemId: string;
  midi: number;
  status: StaffStatus;
  /** Plain accuracy over the display window, 0–1. */
  recentAccuracy: number;
  attempts: number;
}

/** One status per pool pitch, in the pool's (ascending) order. Pure. */
export function buildStaffBoard(
  pool: readonly StaffPoolItem[],
  staffSrs: SrsMap,
  historyRows: readonly StaffHistoryRow[],
  now: number,
): StaffBoardItem[] {
  const decayCutoff = now - HARD_CAP_DAYS * DAY_MS;
  const displayCutoff = now - STAFF_STATS_WINDOW_DAYS * DAY_MS;
  const byItem = new Map<string, StaffHistoryRow[]>();
  for (const r of historyRows) {
    if (r.createdAt < decayCutoff) continue;
    const list = byItem.get(r.itemId) ?? [];
    list.push(r);
    byItem.set(r.itemId, list);
  }
  return pool.map((p) => {
    const rows = byItem.get(p.itemId) ?? [];
    const { accuracy, effectiveN } = weightedAccuracy(
      rows.map((r) => ({ correct: r.correct === true, atMs: r.createdAt })),
      now,
      HALF_LIFE_MS,
    );
    const srsItem = staffSrs[p.itemId];
    const strength = positionScore(accuracy, effectiveN, srsItem ? srsItem.bucket : null, STAFF_MIN_EFFECTIVE_N);
    const status: StaffStatus = strength >= STAFF_MASTERED_ACCURACY
      ? 'mastered'
      : srsItem != null || rows.length > 0 ? 'learning' : 'notStarted';
    const recent = rows.filter((r) => r.createdAt >= displayCutoff);
    return {
      itemId: p.itemId,
      midi: p.midi,
      status,
      recentAccuracy: recent.length ? recent.filter((r) => r.correct).length / recent.length : 0,
      attempts: recent.length,
    };
  });
}
