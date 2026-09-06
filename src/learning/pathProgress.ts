// ── pathProgress.ts — where the learner stands on the Learning Path ──────
//
// P3. Pure evaluation + the persisted per-checkpoint star record. No React,
// no storage, no clock of its own — the caller injects `now`. Storage and
// sync live in `learningState.ts` (the same blob the SRS schedule and daily
// goal already use); this module only computes and folds.
//
// "% mastered" for a checkpoint is derived from the SAME data the rest of the
// Teacher reads — the recorded `HistoryEntry` rows and the SRS map — never a
// new history. A position counts as mastered when either:
//   • its SRS bucket is at or above `MASTERED_BUCKET` (the Teacher has seen
//     it answered right enough times to space it out), or
//   • over its recent window it was answered correctly at or above
//     `MASTERED_ACCURACY`, with at least `MASTERED_MIN_ATTEMPTS` attempts.
// An unplayed / barely-played position is simply not mastered yet.
//
// The checkpoint's tiered goal is scored with the EXISTING star-tier math
// (`evaluateStars` / `meetsGoal` from `src/game/stageResult.ts`): the metric
// fed in is the checkpoint's mastered percentage as `accuracy`. Only that
// threshold math is reused — not the World / Stage / GameProgress framing
// (premium-product-plan.md §13 / §16.1).

import type { SessionResult } from '../drill/DrillConfig';
import type { HistoryEntry } from '../utils/music';
import { evaluateStars, meetsGoal, type StarRating } from '../game/stageResult';
import { parseNoteItemId } from './noteItem';
import type { SrsMap } from './srs';
import {
  PATH_CHECKPOINTS,
  checkpointItemIds,
  type Checkpoint,
  type CheckpointItem,
} from './path';

export const MASTERED_BUCKET = 3;
export const MASTERED_ACCURACY = 0.85;
export const MASTERED_MIN_ATTEMPTS = 3;
/** Only the most recent this-many answers per position decide "mastered now". */
export const MASTERY_WINDOW = 12;
/** Rows older than this are ignored, matching `weakness.ts`'s recency horizon
 *  so a long-ago hot streak can't keep a checkpoint looking done. */
export const MASTERY_MAX_AGE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Persisted record ──────────────────────────────────────────────────
//
// Only stars actually earned are stored (1–3), monotonic — a checkpoint that
// has ever reached a tier keeps it even if recent accuracy dips, exactly like
// `utils/gameProgress.ts`. A missing id means 0 and is never written.
export interface PathProgress {
  /** Best star tier (1–3) reached per `Checkpoint.id`. */
  bestStars: Record<string, 1 | 2 | 3>;
  /** ISO timestamp of the last change; '' until the first fold. */
  updatedAt: string;
}

export function emptyPathProgress(): PathProgress {
  return { bestStars: {}, updatedAt: '' };
}

const VALID_STARS = new Set<number>([1, 2, 3]);

/** Coerce untrusted storage / cloud input into a well-formed record. */
export function normalizePathProgress(raw: unknown): PathProgress {
  if (raw == null || typeof raw !== 'object') return emptyPathProgress();
  const r = raw as Record<string, unknown>;
  const bestStars: Record<string, 1 | 2 | 3> = {};
  if (r.bestStars != null && typeof r.bestStars === 'object') {
    for (const [id, v] of Object.entries(r.bestStars as Record<string, unknown>)) {
      if (typeof v === 'number' && VALID_STARS.has(v)) bestStars[id] = v as 1 | 2 | 3;
    }
  }
  return { bestStars, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '' };
}

/**
 * Fold a freshly-evaluated star rating for one checkpoint into the record.
 * Monotonic: `bestStars[id]` only ever rises, a 0 rating never creates an
 * entry. Returns a new record (or the same reference when nothing changed).
 */
export function foldCheckpointStars(
  progress: PathProgress,
  checkpointId: string,
  stars: StarRating,
  nowISO: string,
): PathProgress {
  const prev = progress.bestStars[checkpointId] ?? 0;
  if (stars < 1 || stars <= prev) return progress;
  return {
    bestStars: { ...progress.bestStars, [checkpointId]: stars as 1 | 2 | 3 },
    updatedAt: nowISO,
  };
}

/** Union-merge two records, keeping the higher star tier per checkpoint. Used
 *  by the learning-state sync so a checkpoint cleared on device B is never
 *  lost because device A wrote the blob more recently. */
export function mergePathProgress(a: PathProgress, b: PathProgress): PathProgress {
  const bestStars: Record<string, 1 | 2 | 3> = { ...a.bestStars };
  for (const [id, v] of Object.entries(b.bestStars)) {
    bestStars[id] = Math.max(bestStars[id] ?? 0, v) as 1 | 2 | 3;
  }
  return {
    bestStars,
    updatedAt: a.updatedAt >= b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

// ── Live evaluation ───────────────────────────────────────────────────

function masteryResult(pctMastered: number): SessionResult {
  return {
    score: 0,
    accuracy: pctMastered,
    longestStreak: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    questionCount: 0,
  };
}

/** Recent-window accuracy for one position id, or null when there is not
 *  enough recent history to judge. */
function recentAccuracy(
  rowsById: Map<string, HistoryEntry[]>,
  itemId: string,
): number | null {
  const rows = rowsById.get(itemId);
  if (!rows || rows.length < MASTERED_MIN_ATTEMPTS) return null;
  const window = rows.slice(-MASTERY_WINDOW);
  const correct = window.filter((e) => e.correct === true).length;
  return correct / window.length;
}

export interface CheckpointItemView extends CheckpointItem {
  mastered: boolean;
}

export interface CheckpointView {
  checkpoint: Checkpoint;
  items: CheckpointItemView[];
  masteredCount: number;
  totalCount: number;
  /** 0–100, whole number. 0 when the checkpoint has no positions on this
   *  instrument (e.g. all its strings are past the string count). */
  pctMastered: number;
  /** Live star rating from the checkpoint's targets and `pctMastered`. */
  liveStars: StarRating;
  /** Monotonic rating: `max(liveStars, stored best)`. */
  stars: StarRating;
  /** Met its `oneStar` bar (ever). */
  reached: boolean;
  /** Met its `threeStar` bar (ever). */
  mastered: boolean;
  /** Playable now: the first checkpoint is always open; a later one opens
   *  once the one before it is `reached`. */
  unlocked: boolean;
  /** The single highlighted "you are here" checkpoint (see
   *  {@link currentCheckpointIndex}). */
  current: boolean;
}

export interface PathView {
  checkpoints: CheckpointView[];
  /** Index into `checkpoints` of the highlighted current checkpoint. */
  currentIndex: number;
}

/**
 * The first checkpoint the learner has not yet fully mastered (stored best
 * < 3★), clamped to the last checkpoint when every one is mastered. This is
 * the "you are here" marker and what the planner plans against.
 */
export function currentCheckpointIndex(
  checkpoints: readonly Checkpoint[],
  bestStars: Record<string, number>,
): number {
  for (let i = 0; i < checkpoints.length; i++) {
    if ((bestStars[checkpoints[i].id] ?? 0) < 3) return i;
  }
  return Math.max(0, checkpoints.length - 1);
}

export interface EvaluatePathOptions {
  entries: HistoryEntry[];
  srs: SrsMap;
  instrument: { stringCount: number; maxFret: number };
  noteTable: string[][];
  progress: PathProgress;
  now: number;
  checkpoints?: readonly Checkpoint[];
}

/**
 * Evaluate the whole path: every checkpoint's mastered set, percentage, live
 * and monotonic star rating, unlock state, and which one is current.
 * Deterministic for fixed inputs.
 */
export function evaluatePath(opts: EvaluatePathOptions): PathView {
  const {
    entries, srs, instrument, noteTable, progress, now,
    checkpoints = PATH_CHECKPOINTS,
  } = opts;

  // Group recent history rows by position id, once.
  const cutoff = now - MASTERY_MAX_AGE_DAYS * DAY_MS;
  const rowsById = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    if (!Number.isInteger(e.string) || !Number.isInteger(e.fret)) continue;
    const ts = e.createdAt ? Date.parse(e.createdAt) : NaN;
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const id = `${e.string}:${e.fret}`;
    const list = rowsById.get(id);
    if (list) list.push(e);
    else rowsById.set(id, [e]);
  }

  const isMastered = (itemId: string): boolean => {
    const srsItem = srs[itemId];
    if (srsItem && srsItem.bucket >= MASTERED_BUCKET) return true;
    const acc = recentAccuracy(rowsById, itemId);
    return acc != null && acc >= MASTERED_ACCURACY;
  };

  const currentIndex = currentCheckpointIndex(checkpoints, progress.bestStars);

  const views: CheckpointView[] = checkpoints.map((checkpoint, i) => {
    const rawItems = checkpointItemIds(checkpoint, instrument, noteTable);
    const items: CheckpointItemView[] = rawItems.map((it) => ({
      ...it,
      mastered: parseNoteItemId(it.itemId) ? isMastered(it.itemId) : false,
    }));
    const totalCount = items.length;
    const masteredCount = items.filter((it) => it.mastered).length;
    const pctMastered =
      totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

    const liveStars = evaluateStars(masteryResult(pctMastered), checkpoint.targets);
    const storedBest = progress.bestStars[checkpoint.id] ?? 0;
    const stars = Math.max(liveStars, storedBest) as StarRating;

    return {
      checkpoint,
      items,
      masteredCount,
      totalCount,
      pctMastered,
      liveStars,
      stars,
      reached:
        stars >= 1 || meetsGoal(masteryResult(pctMastered), checkpoint.targets.oneStar),
      mastered:
        stars >= 3 || meetsGoal(masteryResult(pctMastered), checkpoint.targets.threeStar),
      unlocked: false, // filled in the pass below
      current: i === currentIndex,
    };
  });

  // Unlock pass: first is always open; each later one opens once its
  // predecessor is `reached`.
  for (let i = 0; i < views.length; i++) {
    views[i].unlocked = i === 0 || views[i - 1].reached;
  }

  return { checkpoints: views, currentIndex };
}
