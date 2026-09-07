// ── intervalWeakness.ts — which interval qualities need work ─────────────
//
// Intervals Learning spec §10.5 / T4. The interval-domain sibling of
// `weakness.ts`: given the capped, synced interval answer history
// (`InstrumentLearningState.intervalHistory`) and the interval SRS map
// (`intervalSrs`), rank the 11 drilled qualities by how much they need work.
//
// It answers the same question `weakness.ts` answers for note positions —
// "given recent play and the SRS schedule, what should the interval Teacher
// pull into the next session, and why?" — over interval *qualities*
// (`interval:<n>`) instead of `(string, fret)` positions. It never reads the
// note history and never touches `srs` / `weakness.ts` (spec §17.2).
//
// Signals (any one is enough to make a quality a candidate), the same four as
// `weakness.ts`:
//   • low recent accuracy   — over a recent window, not lifetime
//   • slow correct answers   — mean time of recent correct answers is high
//   • repeated recent misses — several wrong/timeouts in the last few tries
//   • overdue SRS review     — its `dueAt` has passed
//
// Because there are only 11 items and interval sessions are short, the recent
// window is larger than the notes one (20 vs 12); the recency horizon stays
// 45 days (spec §10.5). Deterministic: same inputs → same ranked list, ties
// broken by semitone size.

import type { IntervalHistoryRow } from './learningState';
import { intervalItemId, parseIntervalItemId } from './intervalItem';
import { overdueByMs, type SrsItem, type SrsMap } from './srs';

export interface IntervalWeaknessConfig {
  /** Only the most recent this-many answers per quality are considered — a
   *  recent window, never the whole lifetime history. Larger than the notes
   *  window (there are only 11 items and sessions are short — spec §10.5). */
  windowSize: number;
  /** Need at least this many answers in the window before accuracy / speed
   *  are trusted, so a couple of unlucky answers can't brand a quality weak. */
  minAttempts: number;
  /** Recent accuracy at or below this (with enough attempts) ⇒ weak. 0–1. */
  lowAccuracy: number;
  /** Mean time (seconds) of recent CORRECT answers at or above this ⇒ weak. */
  slowSeconds: number;
  /** How many of the most recent answers the "repeated misses" check looks at. */
  mistakeLookback: number;
  /** That many wrong/timeout answers within the lookback ⇒ weak. */
  mistakeThreshold: number;
  /** History rows older than this many days are ignored entirely, so a rough
   *  patch from months ago cannot stay a "current" weakness for ever. A
   *  quality with only stale history (and no live SRS row) drops off the
   *  list; a genuinely due SRS item still surfaces via its schedule. */
  maxAgeDays: number;
}

export const DEFAULT_INTERVAL_WEAKNESS_CONFIG: IntervalWeaknessConfig = {
  windowSize: 20,
  minAttempts: 3,
  lowAccuracy: 0.7,
  slowSeconds: 5,
  mistakeLookback: 4,
  mistakeThreshold: 2,
  maxAgeDays: 45,
};

export type IntervalWeaknessReason =
  | 'lowAccuracy'
  | 'slow'
  | 'recentMistakes'
  | 'overdue';

export interface IntervalWeaknessSignal {
  /** `interval:<n>` — the SRS / mastery id for this quality. */
  itemId: string;
  /** Interval size in semitones, 1..11. */
  semitones: number;
  /** Answers counted in the recent window. */
  attempts: number;
  /** Correct / attempts over the window, 0–1 (0 when attempts === 0). */
  recentAccuracy: number;
  /** Mean seconds of the correct answers in the window (0 if none). */
  avgCorrectSeconds: number;
  /** Wrong + timeout answers within `mistakeLookback`. */
  recentMistakes: number;
  /** SRS `dueAt` has passed. */
  overdue: boolean;
  /** ms overdue (0 when not overdue / no SRS row). */
  overdueByMs: number;
  /** Every signal that fired, in a fixed order. */
  reasons: IntervalWeaknessReason[];
  /** Deterministic priority; higher = more urgent. */
  score: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// A timeout is folded into `intervalHistory` as `correct: false` (spec §10.2),
// so a miss is simply a non-correct row — no `null` case as in `HistoryEntry`.
function isMiss(r: IntervalHistoryRow): boolean {
  return r.correct !== true;
}

/**
 * Rank every interval quality that has recent history OR an SRS row by how
 * much it needs work. Qualities with no signal at all are omitted.
 * Deterministic.
 *
 * @param rows  the instrument's `intervalHistory` (already capped / synced).
 * @param intervalSrs  the interval SRS map for the same instrument.
 * @param now   epoch ms — injected so the function stays pure / testable.
 */
export function analyzeIntervalWeakness(
  rows: readonly IntervalHistoryRow[],
  intervalSrs: SrsMap,
  now: number,
  cfg: IntervalWeaknessConfig = DEFAULT_INTERVAL_WEAKNESS_CONFIG,
): IntervalWeaknessSignal[] {
  // Group rows by quality, ignoring anything older than the recency horizon.
  const cutoff = now - cfg.maxAgeDays * DAY_MS;
  const byItem = new Map<string, IntervalHistoryRow[]>();
  for (const r of rows) {
    if (!(r.semitones >= 1 && r.semitones <= 11)) continue;
    if (!Number.isFinite(r.createdAt) || r.createdAt < cutoff) continue;
    const id = intervalItemId(r.semitones);
    const list = byItem.get(id);
    if (list) list.push(r);
    else byItem.set(id, [r]);
  }

  // Every id we might report on: seen in history, or tracked by SRS.
  const ids = new Set<string>([...byItem.keys(), ...Object.keys(intervalSrs)]);

  const signals: IntervalWeaknessSignal[] = [];
  for (const id of ids) {
    const semitones = parseIntervalItemId(id);
    if (semitones == null) continue;

    const sorted = (byItem.get(id) ?? []).slice().sort((a, b) => a.createdAt - b.createdAt);
    const window = sorted.slice(-cfg.windowSize);
    const attempts = window.length;
    const correct = window.filter((r) => r.correct === true);
    const recentAccuracy = attempts > 0 ? correct.length / attempts : 0;
    const avgCorrectSeconds =
      correct.length > 0
        ? correct.reduce((s, r) => s + (Number.isFinite(r.seconds) ? r.seconds : 0), 0) /
          correct.length
        : 0;
    const recentMistakes = window.slice(-cfg.mistakeLookback).filter(isMiss).length;

    const srsItem: SrsItem | undefined = intervalSrs[id];
    const odMs = srsItem ? overdueByMs(srsItem, now) : 0;
    const overdue = odMs > 0;

    const reasons: IntervalWeaknessReason[] = [];
    if (attempts >= cfg.minAttempts && recentAccuracy <= cfg.lowAccuracy) {
      reasons.push('lowAccuracy');
    }
    if (correct.length >= cfg.minAttempts && avgCorrectSeconds >= cfg.slowSeconds) {
      reasons.push('slow');
    }
    if (recentMistakes >= cfg.mistakeThreshold) {
      reasons.push('recentMistakes');
    }
    if (overdue) {
      reasons.push('overdue');
    }
    if (reasons.length === 0) continue;

    // Deterministic priority, matching `weakness.ts`: overdue dominates (SRS
    // is the standing plan), then the accuracy gap, then repeated misses,
    // then slowness.
    let score = 0;
    if (overdue) score += 100 + Math.min(odMs / DAY_MS, 30);
    if (reasons.includes('lowAccuracy')) {
      score += (cfg.lowAccuracy - recentAccuracy) * 120 + 20;
    }
    if (reasons.includes('recentMistakes')) score += recentMistakes * 15;
    if (reasons.includes('slow')) score += (avgCorrectSeconds - cfg.slowSeconds) * 8 + 8;

    signals.push({
      itemId: id,
      semitones,
      attempts,
      recentAccuracy,
      avgCorrectSeconds,
      recentMistakes,
      overdue,
      overdueByMs: odMs,
      reasons,
      score,
    });
  }

  return signals.sort((a, b) => b.score - a.score || a.semitones - b.semitones);
}
