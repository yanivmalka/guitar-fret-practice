// ── srs.ts — a small, transparent Leitner scheduler for NoteItems ─────────
//
// P2 SRS. Deliberately simple (premium-product-plan.md §9 P2 / §13: "Pick a
// simple one at P2; low stakes to change later because the schedule state is
// per-item"). Leitner buckets, fixed intervals, no ease factors, no FSRS.
//
// Per NoteItem we keep:
//   • bucket        — Leitner level 0…MAX_BUCKET. Higher = better known =
//                     longer until the next review.
//   • dueAt         — epoch ms the item next wants to be reviewed.
//   • lastReviewedAt / reps / lapses — enough to update the item and to merge
//     two devices' copies without discarding a review (see `mergeSrsItem`).
//
// Behaviour the rest of P2 relies on:
//   • a brand-new item is due immediately (bucket 0, dueAt = now),
//   • a correct answer moves it one bucket forward and pushes `dueAt` out,
//   • an incorrect answer drops it straight back to bucket 0 and makes it due
//     again almost immediately, so it returns in the next planned session,
//   • `overdueByMs` lets the planner rank the most-overdue items first.
//
// Every function here is pure: `(item, …inputs, now) -> newItem`. Nothing
// reads the clock or storage itself.

import { compareNoteItemId } from './noteItem';

export interface SrsItem {
  itemId: string;
  /** Leitner bucket, 0…MAX_BUCKET. */
  bucket: number;
  /** Epoch ms this item next wants a review. `<= now` means due. */
  dueAt: number;
  /** Epoch ms of the last real review (0 = never). Drives merge tie-breaks. */
  lastReviewedAt: number;
  /** Total times this item has been answered under the Teacher. */
  reps: number;
  /** Times a review was wrong (bucket reset). */
  lapses: number;
}

export type SrsMap = Record<string, SrsItem>;

// Interval per bucket, in ms. Bucket 0 is "due now"; each step roughly
// triples. Tuned for a drill app: a freshly-learned position comes back the
// same day, a well-known one only after a couple of weeks.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
export const BUCKET_INTERVALS_MS: readonly number[] = [
  0, // 0 — new / just lapsed: due immediately
  20 * MIN, // 1
  2 * HOUR, // 2
  1 * DAY, // 3
  3 * DAY, // 4
  7 * DAY, // 5
  14 * DAY, // 6
];
export const MAX_BUCKET = BUCKET_INTERVALS_MS.length - 1;

// After a wrong answer the item is due again this soon — long enough not to be
// the very next question, short enough to be back in the next planned session.
export const LAPSE_DELAY_MS = 3 * MIN;

/** A fresh SRS item: bucket 0, due right now. */
export function newSrsItem(itemId: string, now: number): SrsItem {
  return { itemId, bucket: 0, dueAt: now, lastReviewedAt: 0, reps: 0, lapses: 0 };
}

/** `item` if present in `map`, otherwise a fresh one. Never mutates `map`. */
export function getOrCreate(map: SrsMap, itemId: string, now: number): SrsItem {
  return map[itemId] ?? newSrsItem(itemId, now);
}

/**
 * Apply one review outcome. Pure — returns a new item.
 *   correct  → bucket + 1 (capped), dueAt pushed out by that bucket's interval.
 *   wrong    → bucket 0, dueAt = now + LAPSE_DELAY_MS, lapses + 1.
 * `reps` and `lastReviewedAt` always advance.
 */
export function reviewSrsItem(item: SrsItem, correct: boolean, now: number): SrsItem {
  if (correct) {
    const bucket = Math.min(item.bucket + 1, MAX_BUCKET);
    return {
      ...item,
      bucket,
      dueAt: now + BUCKET_INTERVALS_MS[bucket],
      lastReviewedAt: now,
      reps: item.reps + 1,
    };
  }
  return {
    ...item,
    bucket: 0,
    dueAt: now + LAPSE_DELAY_MS,
    lastReviewedAt: now,
    reps: item.reps + 1,
    lapses: item.lapses + 1,
  };
}

/** True when the item is at or past its due time. */
export function isDue(item: SrsItem, now: number): boolean {
  return item.dueAt <= now;
}

/** How long the item has been overdue, in ms (0 if not due yet). */
export function overdueByMs(item: SrsItem, now: number): number {
  return Math.max(0, now - item.dueAt);
}

/** Due items, most-overdue first; deterministic on ties (by position id). */
export function dueItems(map: SrsMap, now: number): SrsItem[] {
  return Object.values(map)
    .filter((it) => isDue(it, now))
    .sort(
      (a, b) =>
        overdueByMs(b, now) - overdueByMs(a, now) ||
        compareNoteItemId(a.itemId, b.itemId),
    );
}

// ── Per-item merge for two-device sync ──────────────────────────────────
//
// The learning-state sync must NOT be last-writer-wins per item (task §3): a
// review done on phone B must not be thrown away because phone A wrote the
// blob last. So we merge each item on its own. The device whose copy has the
// newer `lastReviewedAt` reflects the more recent real review, so its
// scheduling (bucket / dueAt) wins; `reps` and `lapses` take the max so
// neither device's history is lost. Two never-reviewed copies keep the
// earlier `dueAt` (whichever wants attention sooner).
export function mergeSrsItem(a: SrsItem, b: SrsItem): SrsItem {
  if (a.lastReviewedAt === 0 && b.lastReviewedAt === 0) {
    return {
      ...a,
      dueAt: Math.min(a.dueAt, b.dueAt),
      bucket: Math.min(a.bucket, b.bucket),
      reps: Math.max(a.reps, b.reps),
      lapses: Math.max(a.lapses, b.lapses),
    };
  }
  const primary = a.lastReviewedAt >= b.lastReviewedAt ? a : b;
  return {
    itemId: primary.itemId,
    bucket: primary.bucket,
    dueAt: primary.dueAt,
    lastReviewedAt: primary.lastReviewedAt,
    reps: Math.max(a.reps, b.reps),
    lapses: Math.max(a.lapses, b.lapses),
  };
}

/** Union-merge two SRS maps item-by-item via {@link mergeSrsItem}. */
export function mergeSrsMaps(a: SrsMap, b: SrsMap): SrsMap {
  const out: SrsMap = {};
  for (const [id, item] of Object.entries(a)) out[id] = item;
  for (const [id, item] of Object.entries(b)) {
    const cur = out[id];
    out[id] = cur ? mergeSrsItem(cur, item) : item;
  }
  return out;
}
