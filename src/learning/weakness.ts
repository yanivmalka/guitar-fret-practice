// ── weakness.ts — which fretboard positions need work ────────────────────
//
// P2 weakness detection, notes-only, at the NoteItem (string + fret) level.
// It reads the SAME `HistoryEntry` rows the rest of the app records — it does
// not introduce a second history, and it does not touch or replace the
// existing mastery system (`utils/mastery.ts`), which stays the owner of the
// glanceable fretboard overlay. This module answers a different question:
// "given recent play and the SRS schedule, what should the Teacher pull into
// the next session, and why?"
//
// Signals (any one is enough to make a position a candidate):
//   • low recent accuracy   — a recency-weighted mean, not lifetime
//   • slow correct answers   — recency-weighted mean time of correct answers is high
//   • repeated recent misses — several wrong/timeouts in the last few tries
//   • overdue SRS review     — its `dueAt` has passed
//
// "Recent" is an exponential time-decay, not a fixed-size window: every answer
// gets a weight `w = 0.5 ** (ageMs / halfLifeMs)` (14-day half-life), a
// position's accuracy is the weighted mean and its evidence weight is the
// effective sample size `effectiveN = Σ w`. A 180-day hard cap still drops
// older rows, but purely as a performance / storage bound. See `recency.ts`.
//
// The result is deterministic: same inputs → same ranked list, ties broken by
// position id. Each row carries the numbers behind the decision so the
// planner and the Today card can explain the pick in plain language.

import type { HistoryEntry } from '../utils/music';
import { noteItemId, compareNoteItemId, parseNoteItemId, type NotePos } from './noteItem';
import { overdueByMs, type SrsItem, type SrsMap } from './srs';
import {
  weightedAccuracy as computeWeightedAccuracy,
  weightedMeanSeconds,
  HARD_CAP_DAYS,
  DAY_MS,
} from './recency';

export interface WeaknessConfig {
  /** Minimum effective sample size (`effectiveN = Σ` of the recency decay
   *  weights) before recency-weighted accuracy / speed are trusted, so a
   *  couple of unlucky answers — or a handful of stale ones — can't brand a
   *  position weak. Replaces the old raw `minAttempts` gate. */
  minEffectiveN: number;
  /** Recency-weighted accuracy at or below this (with enough evidence) ⇒ weak. 0–1. */
  lowAccuracy: number;
  /** Recency-weighted mean time (seconds) of CORRECT answers at or above this ⇒ weak. */
  slowSeconds: number;
  /** How many of the most recent answers the "repeated misses" check looks at. */
  mistakeLookback: number;
  /** That many wrong/timeout answers within the lookback ⇒ weak. */
  mistakeThreshold: number;
  /** Half-life (days) of the exponential recency weight
   *  `w = 0.5 ** (ageMs / halfLifeMs)`. An answer one half-life old counts
   *  half as much as a brand-new one. */
  halfLifeDays: number;
}

// The 180-day `HARD_CAP_DAYS` bound (rows older than that, and rows with no
// `createdAt`, are dropped before the decay math sees them — the same way
// `progress.ts` already skips undated rows) is a fixed performance / storage
// guard, not a tuning knob, so it is not part of this config.
export const DEFAULT_WEAKNESS_CONFIG: WeaknessConfig = {
  minEffectiveN: 3,
  lowAccuracy: 0.7,
  slowSeconds: 4,
  mistakeLookback: 4,
  mistakeThreshold: 2,
  halfLifeDays: 14,
};

export type WeaknessReason =
  | 'lowAccuracy'
  | 'slow'
  | 'recentMistakes'
  | 'overdue';

export interface WeaknessSignal {
  itemId: string;
  string: number;
  fret: number;
  /** Raw count of history rows inside the 180-day hard cap (display only). */
  attempts: number;
  /** Recency-weighted correct ratio, 0–1 (0 when there is no usable history). */
  weightedAccuracy: number;
  /** Σ of the recency decay weights — the effective sample size behind
   *  `weightedAccuracy`. The accuracy / speed signals are trusted only once
   *  this reaches `minEffectiveN`. */
  effectiveN: number;
  /** Recency-weighted mean seconds of the correct answers (0 if none). */
  avgCorrectSeconds: number;
  /** Wrong + timeout answers within `mistakeLookback` — a raw, unweighted count. */
  recentMistakes: number;
  /** SRS `dueAt` has passed. */
  overdue: boolean;
  /** ms overdue (0 when not overdue / no SRS row). */
  overdueByMs: number;
  /** Every signal that fired, in a fixed order. */
  reasons: WeaknessReason[];
  /** Deterministic priority; higher = more urgent. */
  score: number;
}

// Chronological order for a position's rows, used only for the "repeated recent
// misses" lookback tail (the decay weight, not a slice, does the "recent counts
// more" job for accuracy / speed). `createdAt` may be missing on old
// localStorage rows — those sort oldest (same rule as utils/mastery.ts).
function byCreatedAtAsc(a: HistoryEntry, b: HistoryEntry): number {
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
}

function isCorrect(e: HistoryEntry): boolean {
  return e.correct === true;
}
// A miss is an explicit wrong answer or a timeout (`correct === null`), exactly
// how mastery.ts / progress.ts treat the "I don't know" signal.
function isMiss(e: HistoryEntry): boolean {
  return e.correct === false || e.correct === null;
}

/**
 * Rank every position that has recent history OR an SRS row by how much it
 * needs work. Positions with no signal at all are omitted. Deterministic.
 *
 * @param entries  history rows for ONE instrument (the caller passes
 *                 `historyForInstrument(allHistory, instrument.id)`).
 * @param srs      the SRS map for the same instrument.
 * @param now      epoch ms — injected so the function stays pure/testable.
 */
export function analyzeWeakness(
  entries: HistoryEntry[],
  srs: SrsMap,
  now: number,
  cfg: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG,
): WeaknessSignal[] {
  // Group rows by position, dropping anything past the 180-day hard cap (a
  // performance / storage bound only) and anything with no usable timestamp
  // (treated as too old). The recency weight — not this filter — is what makes
  // months-old rows stop counting as a current weakness.
  const cutoff = now - HARD_CAP_DAYS * DAY_MS;
  const halfLifeMs = cfg.halfLifeDays * DAY_MS;
  const byItem = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    if (!Number.isInteger(e.string) || !Number.isInteger(e.fret)) continue;
    const ts = e.createdAt ? Date.parse(e.createdAt) : NaN;
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const id = noteItemId(e.string, e.fret);
    const list = byItem.get(id);
    if (list) list.push(e);
    else byItem.set(id, [e]);
  }

  // Every id we might report on: seen in history, or tracked by SRS.
  const ids = new Set<string>([...byItem.keys(), ...Object.keys(srs)]);

  const signals: WeaknessSignal[] = [];
  for (const id of ids) {
    const pos = parseNoteItemId(id);
    if (!pos) continue;

    // Every surviving row for this position (no fixed-size window any more —
    // the decay weight does that job), sorted only for the mistake tail below.
    const rows = (byItem.get(id) ?? []).slice().sort(byCreatedAtAsc);
    const attempts = rows.length;
    const correct = rows.filter(isCorrect);

    const { accuracy: weightedAcc, effectiveN } = computeWeightedAccuracy(
      rows.map((e) => ({ correct: isCorrect(e), atMs: Date.parse(e.createdAt!) })),
      now,
      halfLifeMs,
    );
    const avgCorrectSeconds = weightedMeanSeconds(
      correct.map((e) => ({
        seconds: Number.isFinite(e.seconds) ? e.seconds : 0,
        atMs: Date.parse(e.createdAt!),
      })),
      now,
      halfLifeMs,
    );
    const recentMistakes = rows.slice(-cfg.mistakeLookback).filter(isMiss).length;

    const srsItem: SrsItem | undefined = srs[id];
    const odMs = srsItem ? overdueByMs(srsItem, now) : 0;
    const overdue = odMs > 0;

    const reasons: WeaknessReason[] = [];
    if (effectiveN >= cfg.minEffectiveN && weightedAcc <= cfg.lowAccuracy) {
      reasons.push('lowAccuracy');
    }
    if (effectiveN >= cfg.minEffectiveN && avgCorrectSeconds >= cfg.slowSeconds) {
      reasons.push('slow');
    }
    if (recentMistakes >= cfg.mistakeThreshold) {
      reasons.push('recentMistakes');
    }
    if (overdue) {
      reasons.push('overdue');
    }
    if (reasons.length === 0) continue;

    // Deterministic priority. Overdue dominates (SRS is the standing plan),
    // then accuracy gap, then repeated misses, then slowness.
    let score = 0;
    if (overdue) score += 100 + Math.min(odMs / DAY_MS, 30);
    if (reasons.includes('lowAccuracy')) {
      score += (cfg.lowAccuracy - weightedAcc) * 120 + 20;
    }
    if (reasons.includes('recentMistakes')) score += recentMistakes * 15;
    if (reasons.includes('slow')) score += (avgCorrectSeconds - cfg.slowSeconds) * 8 + 8;

    signals.push({
      itemId: id,
      string: pos.string,
      fret: pos.fret,
      attempts,
      weightedAccuracy: weightedAcc,
      effectiveN,
      avgCorrectSeconds,
      recentMistakes,
      overdue,
      overdueByMs: odMs,
      reasons,
      score,
    });
  }

  return signals.sort(
    (a, b) => b.score - a.score || compareNoteItemId(a.itemId, b.itemId),
  );
}

// ── Least-practised positions (planner fallback) ────────────────────────
//
// When weakness + SRS turn up nothing (a Premium user who has barely played,
// or one who is genuinely solid everywhere), the planner still needs
// something to recommend. This returns positions inside a fret span, ranked
// by fewest lifetime attempts first, so "practise today" always has content
// and it steers toward the least-covered ground. Deterministic.

export interface CoveragePos extends NotePos {
  itemId: string;
  attempts: number;
}

export function leastPractisedPositions(
  entries: HistoryEntry[],
  opts: { strings: number[]; fretFrom: number; fretTo: number },
): CoveragePos[] {
  const attemptsByItem = new Map<string, number>();
  for (const e of entries) {
    const id = noteItemId(e.string, e.fret);
    attemptsByItem.set(id, (attemptsByItem.get(id) ?? 0) + 1);
  }
  const out: CoveragePos[] = [];
  for (const string of opts.strings) {
    for (let fret = opts.fretFrom; fret <= opts.fretTo; fret++) {
      const id = noteItemId(string, fret);
      out.push({ string, fret, itemId: id, attempts: attemptsByItem.get(id) ?? 0 });
    }
  }
  return out.sort(
    (a, b) => a.attempts - b.attempts || compareNoteItemId(a.itemId, b.itemId),
  );
}
