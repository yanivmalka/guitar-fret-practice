// ── planner.ts — turn "what needs work" into one focused drill ───────────
//
// P2 session planner, notes-only. It picks a small set of NoteItems and emits
// a `DrillConfig` whose `candidates` are exactly those positions, so the
// session runs through the EXISTING `useDrillSession` / drill engine with no
// new mechanism (premium-product-plan.md §5, §6 P2). It never creates a drill
// engine, a question type, or a `historyKey`.
//
// Priority, high to low (task §4):
//   1. overdue SRS items        — the standing plan says these are due
//   2. clearly weak positions   — from `analyzeWeakness`
//   3. consolidation            — a little reinforcement of positions the
//                                 learner is doing well on, so a session is
//                                 not 100% struggle
//
// Fret range / strings are derived from the chosen positions (a tight window
// around them). Difficulty is kept deliberately predictable: a fixed sensible
// per-question time and question count, nudged only slightly by how the
// chosen cluster is going.

import type { DrillConfig, DrillPosition } from '../drill/DrillConfig';
import type { AccidentalMode, OrderMode, HistoryEntry } from '../utils/music';
import { compareNoteItemId, parseNoteItemId } from './noteItem';
import {
  analyzeWeakness,
  leastPractisedPositions,
  DEFAULT_WEAKNESS_CONFIG,
  type WeaknessConfig,
  type WeaknessReason,
} from './weakness';
import { dueItems, type SrsMap } from './srs';

export type PlanBucket = 'overdue' | 'weak' | 'consolidation' | 'coverage';

export interface PlannedItem {
  itemId: string;
  string: number;
  fret: number;
  bucket: PlanBucket;
  reasons: WeaknessReason[];
}

export interface TeacherPlan {
  /** The positions this session will drill, in priority order. */
  items: PlannedItem[];
  /** Ready to hand straight to `useDrillSession`. `candidates` is set to
   *  `items`; everything else is a plain, valid drill config. */
  drill: DrillConfig;
  /** Structured, translation-ready summary of why these were chosen. The UI
   *  turns these counts into a sentence; the planner does no i18n. */
  rationale: {
    overdue: number;
    weak: number;
    consolidation: number;
    coverage: number;
    strings: number[];
    fretFrom: number;
    fretTo: number;
  };
  /** 'weakSpots' = only overdue + weak (the "Practise my weak spots" action);
   *  'daily' = the recommended session, padded with consolidation / coverage. */
  kind: 'daily' | 'weakSpots';
  generatedAt: number;
}

export interface PlannerOptions {
  /** History rows for ONE instrument. */
  entries: HistoryEntry[];
  /** SRS map for the same instrument. */
  srs: SrsMap;
  now: number;
  maxFret: number;
  /** All drillable string numbers for the instrument (1..stringCount). */
  allStrings: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Distinct positions to aim for. Default 8. */
  sessionSize?: number;
  /** Questions the drill asks. Default 12 (some positions recur). */
  questionCount?: number;
  weaknessCfg?: WeaknessConfig;
}

const DEFAULT_SESSION_SIZE = 8;
const DEFAULT_QUESTION_COUNT = 12;
// Per-question seconds for a Teacher session. One value, so the session feels
// the same every day; the small ± below is the only adaptivity.
const BASE_TIME = 6;
const MIN_FRET_SPAN = 3;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Build the recommended daily session. Always returns a plan (falls back to
 * least-practised coverage when there is nothing weak or due).
 */
export function buildDailyPlan(opts: PlannerOptions): TeacherPlan {
  return build(opts, 'daily');
}

/**
 * Build a "practise my weak spots" session: overdue + weak positions only.
 * Returns `null` when nothing qualifies, so the UI can say so rather than
 * drilling arbitrary notes.
 */
export function buildWeakSpotsPlan(opts: PlannerOptions): TeacherPlan | null {
  const plan = build(opts, 'weakSpots');
  return plan.items.length > 0 ? plan : null;
}

function build(opts: PlannerOptions, kind: 'daily' | 'weakSpots'): TeacherPlan {
  const {
    entries,
    srs,
    now,
    maxFret,
    allStrings,
    accidental,
    order,
    sessionSize = DEFAULT_SESSION_SIZE,
    questionCount = DEFAULT_QUESTION_COUNT,
    weaknessCfg = DEFAULT_WEAKNESS_CONFIG,
  } = opts;

  const picked: PlannedItem[] = [];
  const seen = new Set<string>();
  const add = (
    itemId: string,
    bucket: PlanBucket,
    reasons: WeaknessReason[],
  ): void => {
    if (seen.has(itemId) || picked.length >= sessionSize) return;
    const pos = parseNoteItemId(itemId);
    if (!pos || pos.string > Math.max(...allStrings) || pos.fret > maxFret) return;
    seen.add(itemId);
    picked.push({ itemId, string: pos.string, fret: pos.fret, bucket, reasons });
  };

  const signals = analyzeWeakness(entries, srs, now, weaknessCfg);
  const signalByItem = new Map(signals.map((s) => [s.itemId, s]));

  // 1 — overdue SRS items, most overdue first.
  for (const it of dueItems(srs, now)) {
    const sig = signalByItem.get(it.itemId);
    add(it.itemId, 'overdue', sig?.reasons ?? ['overdue']);
  }

  // 2 — weak positions not already pulled in as overdue.
  for (const sig of signals) {
    if (sig.overdue) continue; // already handled above
    add(sig.itemId, 'weak', sig.reasons);
  }

  const overdue = picked.filter((p) => p.bucket === 'overdue').length;
  const weak = picked.filter((p) => p.bucket === 'weak').length;
  let consolidation = 0;
  let coverage = 0;

  if (kind === 'daily' && picked.length < sessionSize) {
    // 3 — consolidation: SRS items doing fine (bucket >= 2, not due), the
    // ones most recently reviewed first, so a session ends on solid ground.
    const strong = Object.values(srs)
      .filter((it) => it.bucket >= 2 && it.dueAt > now && !seen.has(it.itemId))
      .sort(
        (a, b) =>
          b.lastReviewedAt - a.lastReviewedAt ||
          compareNoteItemId(a.itemId, b.itemId),
      );
    for (const it of strong) {
      if (picked.length >= sessionSize) break;
      add(it.itemId, 'consolidation', []);
      consolidation++;
    }

    // Still short (new Premium user, little history) — fill from the
    // least-practised positions across the neck.
    if (picked.length < sessionSize) {
      const span = coverageSpan(allStrings, maxFret);
      for (const cp of leastPractisedPositions(entries, span)) {
        if (picked.length >= sessionSize) break;
        add(cp.itemId, 'coverage', []);
        coverage++;
      }
    }
  }

  const strings = [...new Set(picked.map((p) => p.string))].sort((a, b) => a - b);
  const frets = picked.map((p) => p.fret);
  let fretFrom = frets.length ? Math.min(...frets) : 0;
  let fretTo = frets.length ? Math.max(...frets) : Math.min(5, maxFret);
  // Give the drill a little room even if every pick sits on one fret.
  if (fretTo - fretFrom < MIN_FRET_SPAN) {
    fretTo = Math.min(maxFret, fretFrom + MIN_FRET_SPAN);
    fretFrom = Math.max(0, fretTo - MIN_FRET_SPAN);
  }

  const primaryString = strings[0] ?? Math.max(...allStrings);
  const isMulti = strings.length > 1;

  // Light, predictable adaptivity: if the chosen cluster's recent accuracy is
  // low, give a touch more time; if it's already strong, a touch less.
  const clusterAcc = averageRecentAccuracy(picked, signalByItem);
  const timeLimit =
    clusterAcc != null && clusterAcc < 0.6
      ? BASE_TIME + 1
      : clusterAcc != null && clusterAcc > 0.9
        ? BASE_TIME - 1
        : BASE_TIME;

  const candidates: DrillPosition[] = picked.map((p) => ({
    string: p.string,
    fret: p.fret,
  }));

  const drill: DrillConfig = {
    strings: isMulti ? strings : [primaryString],
    primaryString,
    isMulti,
    mode: 'byFret', // notes-only: show a fret, name the note (no new question type)
    fretFrom,
    fretTo,
    wholeToneOnly: false,
    dotsOnly: false,
    questionCount: clamp(questionCount, Math.max(4, picked.length), 30),
    timeLimit: clamp(timeLimit, 4, 9),
    accidental,
    order,
    candidates,
  };

  return {
    items: picked,
    drill,
    rationale: {
      overdue,
      weak,
      consolidation,
      coverage,
      strings,
      fretFrom,
      fretTo,
    },
    kind,
    generatedAt: now,
  };
}

// A neck-wide-ish span for coverage fallback: open position through fret 5 (or
// the whole neck if it is shorter), every string.
function coverageSpan(
  allStrings: number[],
  maxFret: number,
): { strings: number[]; fretFrom: number; fretTo: number } {
  return { strings: [...allStrings], fretFrom: 0, fretTo: Math.min(5, maxFret) };
}

function averageRecentAccuracy(
  picked: PlannedItem[],
  signalByItem: Map<string, { recentAccuracy: number; attempts: number }>,
): number | null {
  const accs: number[] = [];
  for (const p of picked) {
    const s = signalByItem.get(p.itemId);
    if (s && s.attempts > 0) accs.push(s.recentAccuracy);
  }
  if (accs.length === 0) return null;
  return accs.reduce((a, b) => a + b, 0) / accs.length;
}
