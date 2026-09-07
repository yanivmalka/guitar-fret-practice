// ── intervalMastery.ts — each interval's status + the flat 11-row board ──
//
// Intervals Learning spec §11 / §12. Pure evaluation: given the interval SRS
// map and the capped interval answer history, decide for each of the 11
// drilled qualities whether it is `notStarted` / `learning` / `mastered`, and
// build the flat status board the interval Stats surface renders.
//
// There is NO interval learning ladder — no stages, no unlock progression, no
// per-stage bars, no stars, no stored progress record. Progress is exactly
// this flat board, mirroring how `src/utils/mastery.ts`'s
// `unplayed / needsWork / known` overlay presents the fretboard. The only
// persisted interval progress is `intervalSrs` (+ the capped `intervalHistory`);
// everything here is derived every render.
//
// The mastery constants are this domain's OWN values — deliberately NOT
// imported from the Notes side (`pathProgress.ts`) so tuning one domain never
// silently moves the other (spec §11.1, §19). They happen to start close to
// the Notes numbers.
//
// This module imports nothing from `src/game/**`.

import type { IntervalHistoryRow } from './learningState';
import type { SrsMap } from './srs';
import { intervalItemId } from './intervalItem';
import { INTERVALS, ALL_INTERVAL_SEMITONES } from '../utils/intervals';
import { INTERVAL_CURRICULUM, sizesThroughGroup } from './intervalCurriculum';

// ── Constants (own values — see the header note) ───────────────────────

/** SRS bucket at or above which a quality counts as mastered (same start
 *  point as notes, tuned independently). */
export const INTERVAL_MASTERED_BUCKET = 3;
/** Recent-window accuracy at or above which a quality counts as mastered. */
export const INTERVAL_MASTERED_ACCURACY = 0.85;
/** Minimum answers in the recent window before accuracy is trusted — one more
 *  than notes, because there are only 11 items and more chance to fluke a
 *  short streak (spec §11.1). */
export const INTERVAL_MASTERED_MIN_ATTEMPTS = 4;
/** Only the most recent this-many answers per quality decide "mastered now" /
 *  the board's accuracy bar. Larger than the notes window because there are
 *  only 11 items and sessions are short (spec §10.5). */
export const INTERVAL_MASTERY_WINDOW = 20;
/** History rows older than this are ignored, matching `weakness.ts`'s recency
 *  horizon so a long-ago hot streak can't keep a quality looking mastered. */
export const INTERVAL_MASTERY_MAX_AGE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

export type IntervalStatus = 'notStarted' | 'learning' | 'mastered';

// ── Recent-window stats for one quality ───────────────────────────────

interface WindowStats {
  /** Answers counted in the recent window (after the age filter). */
  attempts: number;
  /** Correct / attempts over the window, 0–1 (0 when attempts === 0). */
  accuracy: number;
}

// `IntervalHistoryRow.createdAt` is epoch ms; `normalizeIntervalHistory`
// already drops rows with a non-positive timestamp.
function windowStats(
  historyRows: readonly IntervalHistoryRow[],
  size: number,
  now: number,
): WindowStats {
  const cutoff = now - INTERVAL_MASTERY_MAX_AGE_DAYS * DAY_MS;
  const rows = historyRows
    .filter((r) => r.semitones === size && r.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-INTERVAL_MASTERY_WINDOW);
  if (rows.length === 0) return { attempts: 0, accuracy: 0 };
  const correct = rows.filter((r) => r.correct === true).length;
  return { attempts: rows.length, accuracy: correct / rows.length };
}

/** Recent-window accuracy for one quality, or `null` when there are too few
 *  recent answers to judge. */
function recentAccuracyOrNull(stats: WindowStats): number | null {
  return stats.attempts >= INTERVAL_MASTERED_MIN_ATTEMPTS ? stats.accuracy : null;
}

// ── Public predicates ────────────────────────────────────────────────

/**
 * Is this interval quality mastered? True when EITHER its `intervalSrs` bucket
 * is at or above {@link INTERVAL_MASTERED_BUCKET}, OR its recent-window
 * accuracy is at or above {@link INTERVAL_MASTERED_ACCURACY} over at least
 * {@link INTERVAL_MASTERED_MIN_ATTEMPTS} answers. Pure; deterministic.
 */
export function isIntervalMastered(
  size: number,
  intervalSrs: SrsMap,
  historyRows: readonly IntervalHistoryRow[],
  now: number,
): boolean {
  const srsItem = intervalSrs[intervalItemId(size)];
  if (srsItem && srsItem.bucket >= INTERVAL_MASTERED_BUCKET) return true;
  const acc = recentAccuracyOrNull(windowStats(historyRows, size, now));
  return acc != null && acc >= INTERVAL_MASTERED_ACCURACY;
}

/**
 * The three-state status for one interval quality:
 *   • `mastered`   — {@link isIntervalMastered} holds;
 *   • `notStarted` — no schedule row AND no recent history at all;
 *   • `learning`   — anything in between.
 * Same three-level idea as `utils/mastery.ts`'s `unplayed / needsWork / known`.
 */
export function intervalStatus(
  size: number,
  intervalSrs: SrsMap,
  historyRows: readonly IntervalHistoryRow[],
  now: number,
): IntervalStatus {
  if (isIntervalMastered(size, intervalSrs, historyRows, now)) return 'mastered';
  const hasSchedule = intervalSrs[intervalItemId(size)] != null;
  const { attempts } = windowStats(historyRows, size, now);
  return hasSchedule || attempts > 0 ? 'learning' : 'notStarted';
}

/**
 * The set of semitone sizes that are currently mastered. This is the input the
 * curriculum's `currentGroupIndex` consumes to decide the Teacher's current
 * group (spec §6.3, §11.1) — nothing is stored.
 */
export function masteredSizes(
  intervalSrs: SrsMap,
  historyRows: readonly IntervalHistoryRow[],
  now: number,
): Set<number> {
  const out = new Set<number>();
  for (const size of ALL_INTERVAL_SEMITONES) {
    if (isIntervalMastered(size, intervalSrs, historyRows, now)) out.add(size);
  }
  return out;
}

// ── The flat 11-interval board ───────────────────────────────────────

export interface IntervalBoardRow {
  /** Interval size in semitones, 1..11. */
  semitones: number;
  /** Short label, e.g. `M3` (from `INTERVALS`). */
  short: string;
  /** Full-name i18n key, e.g. `Major 3rd` (from `INTERVALS`). */
  nameKey: string;
  /** `notStarted` / `learning` / `mastered`. */
  status: IntervalStatus;
  /** Recent-window accuracy, 0–1 (0 when no recent answers) — the thin bar. */
  recentAccuracy: number;
  /** Answers counted in the recent window. */
  attempts: number;
}

export interface IntervalBoardOptions {
  intervalSrs: SrsMap;
  historyRows: readonly IntervalHistoryRow[];
  now: number;
}

// The 11 sizes in curriculum introduction order (spec §12.1), not semitone
// order — `sizesThroughGroup` past the last group yields every introduced size
// in that order.
const CURRICULUM_ORDER: readonly number[] = sizesThroughGroup(
  INTERVAL_CURRICULUM.length - 1,
);

/**
 * Build the flat 11-interval status board: one row per quality, in curriculum
 * order, each with its status and recent accuracy. Pure — derived entirely
 * from `intervalSrs` + `intervalHistory`; no storage of its own.
 */
export function buildIntervalBoard(opts: IntervalBoardOptions): IntervalBoardRow[] {
  const { intervalSrs, historyRows, now } = opts;
  return CURRICULUM_ORDER.map((size) => {
    const def = INTERVALS.find((d) => d.semitones === size)!;
    const stats = windowStats(historyRows, size, now);
    return {
      semitones: size,
      short: def.short,
      nameKey: def.nameKey,
      status: intervalStatus(size, intervalSrs, historyRows, now),
      recentAccuracy: stats.accuracy,
      attempts: stats.attempts,
    };
  });
}
