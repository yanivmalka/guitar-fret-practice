// ── tabMastery.ts — each tab position's status + the progress board ──────
//
// tab-reading-spec.md §9. Mirrors `staffMastery.ts` one domain over: given
// the tab SRS map and the capped tab answer history, decide for each
// position in the pool whether it is `notStarted` / `learning` / `mastered`.
// Nothing is stored — the board is derived every render.
//
// Own constants, deliberately NOT imported from `staffMastery.ts`, so tuning
// one domain never silently moves another. Same recency-decay engine
// (`./recency`).

import type { TabHistoryRow } from './learningState';
import type { SrsMap } from './srs';
import type { TabPoolItem } from './tabDrill';
import {
  DAY_MS,
  DEFAULT_HALF_LIFE_DAYS,
  HARD_CAP_DAYS,
  weightedAccuracy,
  positionScore,
} from './recency';

/** Weighted recent accuracy at or above which a position counts as mastered. */
export const TAB_MASTERED_ACCURACY = 0.8;
/** Minimum weighted answer count before the accuracy is trusted on its own. */
export const TAB_MIN_EFFECTIVE_N = 4;
/** The plain display window behind the board's accuracy figure. */
export const TAB_STATS_WINDOW_DAYS = 45;

const HALF_LIFE_MS = DEFAULT_HALF_LIFE_DAYS * DAY_MS;

export type TabStatus = 'notStarted' | 'learning' | 'mastered';

export interface TabBoardItem {
  itemId: string;
  string: number;
  fret: number;
  status: TabStatus;
  /** Plain accuracy over the display window, 0–1. */
  recentAccuracy: number;
  attempts: number;
}

/** One status per pool position, in the pool's order. Pure. */
export function buildTabBoard(
  pool: readonly TabPoolItem[],
  tabSrs: SrsMap,
  historyRows: readonly TabHistoryRow[],
  now: number,
): TabBoardItem[] {
  const decayCutoff = now - HARD_CAP_DAYS * DAY_MS;
  const displayCutoff = now - TAB_STATS_WINDOW_DAYS * DAY_MS;
  const byItem = new Map<string, TabHistoryRow[]>();
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
    const srsItem = tabSrs[p.itemId];
    const strength = positionScore(accuracy, effectiveN, srsItem ? srsItem.bucket : null, TAB_MIN_EFFECTIVE_N);
    const status: TabStatus = strength >= TAB_MASTERED_ACCURACY
      ? 'mastered'
      : srsItem != null || rows.length > 0 ? 'learning' : 'notStarted';
    const recent = rows.filter((r) => r.createdAt >= displayCutoff);
    return {
      itemId: p.itemId,
      string: p.string,
      fret: p.fret,
      status,
      recentAccuracy: recent.length ? recent.filter((r) => r.correct).length / recent.length : 0,
      attempts: recent.length,
    };
  });
}
