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
//   • low recent accuracy   — over a recent window, not lifetime
//   • slow correct answers   — mean time of recent correct answers is high
//   • repeated recent misses — several wrong/timeouts in the last few tries
//   • overdue SRS review     — its `dueAt` has passed
//
// The result is deterministic: same inputs → same ranked list, ties broken by
// position id. Each row carries the numbers behind the decision so the
// planner and the Today card can explain the pick in plain language.

import type { HistoryEntry } from '../utils/music';
import { noteItemId, compareNoteItemId, parseNoteItemId, type NotePos } from './noteItem';
import { overdueByMs, type SrsItem, type SrsMap } from './srs';

export interface WeaknessConfig {
  /** Only the most recent this-many answers per position are considered — a
   *  recent window, never the whole lifetime history (task §1). */
  windowSize: number;
  /** Need at least this many answers in the window before accuracy / speed
   *  are trusted, so a couple of unlucky answers can't brand a position weak. */
  minAttempts: number;
  /** Recent accuracy at or below this (with enough attempts) ⇒ weak. 0–1. */
  lowAccuracy: number;
  /** Mean time (seconds) of recent CORRECT answers at or above this ⇒ weak. */
  slowSeconds: number;
  /** How many of the most recent answers the "repeated misses" check looks at. */
  mistakeLookback: number;
  /** That many wrong/timeout answers within the lookback ⇒ weak. */
  mistakeThreshold: number;
}

export const DEFAULT_WEAKNESS_CONFIG: WeaknessConfig = {
  windowSize: 12,
  minAttempts: 3,
  lowAccuracy: 0.7,
  slowSeconds: 4,
  mistakeLookback: 4,
  mistakeThreshold: 2,
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
  reasons: WeaknessReason[];
  /** Deterministic priority; higher = more urgent. */
  score: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Chronological order for a position's rows. `createdAt` may be missing on old
// localStorage rows — those sort oldest (same rule as utils/mastery.ts), so
// they are the first dropped when the window overflows.
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
  // Group rows by position.
  const byItem = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    if (!Number.isInteger(e.string) || !Number.isInteger(e.fret)) continue;
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

    const rows = (byItem.get(id) ?? []).slice().sort(byCreatedAtAsc);
    const window = rows.slice(-cfg.windowSize);
    const attempts = window.length;
    const correct = window.filter(isCorrect);
    const recentAccuracy = attempts > 0 ? correct.length / attempts : 0;
    const avgCorrectSeconds =
      correct.length > 0
        ? correct.reduce((s, e) => s + (Number.isFinite(e.seconds) ? e.seconds : 0), 0) /
          correct.length
        : 0;
    const recentMistakes = window.slice(-cfg.mistakeLookback).filter(isMiss).length;

    const srsItem: SrsItem | undefined = srs[id];
    const odMs = srsItem ? overdueByMs(srsItem, now) : 0;
    const overdue = odMs > 0;

    const reasons: WeaknessReason[] = [];
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

    // Deterministic priority. Overdue dominates (SRS is the standing plan),
    // then accuracy gap, then repeated misses, then slowness.
    let score = 0;
    if (overdue) score += 100 + Math.min(odMs / DAY_MS, 30);
    if (reasons.includes('lowAccuracy')) {
      score += (cfg.lowAccuracy - recentAccuracy) * 120 + 20;
    }
    if (reasons.includes('recentMistakes')) score += recentMistakes * 15;
    if (reasons.includes('slow')) score += (avgCorrectSeconds - cfg.slowSeconds) * 8 + 8;

    signals.push({
      itemId: id,
      string: pos.string,
      fret: pos.fret,
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
