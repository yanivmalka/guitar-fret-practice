// ── pathProgress.ts — where the learner stands on the Learning Path ──────
//
// P3. Pure evaluation + the persisted per-checkpoint star record. No React,
// no storage, no clock of its own — the caller injects `now`. Storage and
// sync live in `learningState.ts` (the same blob the SRS schedule and daily
// goal already use); this module only computes and folds.
//
// A checkpoint's "%" is derived from the SAME data the rest of the Teacher
// reads — the recorded `HistoryEntry` rows and the SRS map — never a new
// history. Each position gets a continuous 0..1 strength score from the shared
// exponential time-decay engine in `./recency` (approved spec —
// product-wishlist.md, "Recency model: exponential time-decay for the
// practice-statistics windows"), folding pathProgress onto the same model
// `weakness.ts` / `intervalWeakness.ts` / `intervalMastery.ts` already use:
//
//   • every answer inside the 180-day hard cap gets weight
//     `w = 0.5 ** (ageMs / halfLifeMs)` (14-day half-life); the position's
//     weighted accuracy is `Σ(w·correct) / Σ w` and its evidence weight is
//     the effective sample size `effectiveN = Σ w`;
//   • below `MIN_EFFECTIVE_N` (3) the weighted accuracy is discarded as noise
//     and the score is the SRS bucket floor (`BUCKET_SCORE`), or 0 when there
//     is no schedule row — so a barely-played position with no schedule row
//     contributes 0, not a noisy fraction;
//   • at or above the gate the weighted accuracy stands alone (the bucket
//     plays no part), so a long-ago hot streak can no longer keep a
//     checkpoint looking done and there is no "take the last N in order"
//     window — every answer is weighted purely by age.
//
// The checkpoint's tiered goal is scored with the EXISTING star-tier math
// (`evaluateStars` / `meetsGoal` from `src/game/stageResult.ts`): the metric
// fed in is the MEAN of the checkpoint's per-position scores as `accuracy`
// (a 0–100 number), not a `mastered / total` ratio. Only that threshold math
// is reused — not the World / Stage / GameProgress framing
// (premium-product-plan.md §13 / §16.1). `PathProgress.bestStars` stays
// monotonic and stored, exactly as before.
//
// Deferred UI follow-ups (product decision pending — NOT built here; see
// product-wishlist.md "Recency model" → "UI follow-ups this forces"):
// rendering the per-position green dot as an intensity gradient off the new
// continuous `CheckpointItemView.score` instead of the on/off `mastered`
// flag, and turning the "N / M positions" line into a "N positions ≥ 85%"
// readout or dropping it for the single continuous bar.

import type { SessionResult } from '../drill/DrillConfig';
import type { HistoryEntry } from '../utils/music';
import { evaluateStars, meetsGoal, type StarRating } from '../game/stageResult';
import { parseNoteItemId } from './noteItem';
import type { SrsMap } from './srs';
import {
  weightedAccuracy,
  positionScore,
  DAY_MS,
  DEFAULT_HALF_LIFE_DAYS,
  HARD_CAP_DAYS,
  MIN_EFFECTIVE_N,
} from './recency';
import {
  PATH_CHECKPOINTS,
  checkpointItemIds,
  type Checkpoint,
  type CheckpointItem,
} from './path';

/** A position's continuous strength score at or above this reads as "mastered"
 *  for the on/off green dot and the planner's "not mastered yet" filter. It
 *  matches `BUCKET_SCORE[3]` in `recency.ts`, so a well-scheduled position with
 *  little recent history still clears the line, mirroring the old
 *  "SRS bucket >= 3 alone ⇒ mastered" behaviour. */
export const MASTERED_ACCURACY = 0.85;

const HALF_LIFE_MS = DEFAULT_HALF_LIFE_DAYS * DAY_MS;

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

/**
 * One position's continuous 0..1 strength: the recency-weighted accuracy of
 * its answers inside the 180-day cap once `effectiveN >= MIN_EFFECTIVE_N`,
 * otherwise the SRS bucket floor (0 when there is no schedule row). Every row
 * in `rows` already has a finite, in-cap `createdAt` (filtered while grouping).
 */
function strengthFor(
  rows: HistoryEntry[] | undefined,
  srsBucket: number | null,
  now: number,
): number {
  const { accuracy, effectiveN } = weightedAccuracy(
    (rows ?? []).map((e) => ({ correct: e.correct === true, atMs: Date.parse(e.createdAt!) })),
    now,
    HALF_LIFE_MS,
  );
  return positionScore(accuracy, effectiveN, srsBucket, MIN_EFFECTIVE_N);
}

export interface CheckpointItemView extends CheckpointItem {
  /** Continuous 0..1 strength score from the shared decay engine. */
  score: number;
  /** `score >= MASTERED_ACCURACY` — the on/off flag the green dot and the
   *  planner's "not mastered yet" filter still read. */
  mastered: boolean;
}

export interface CheckpointView {
  checkpoint: Checkpoint;
  items: CheckpointItemView[];
  /** Positions whose `score >= MASTERED_ACCURACY`. */
  masteredCount: number;
  totalCount: number;
  /** 0–100, whole number — the MEAN of the checkpoint's per-position scores,
   *  not `masteredCount / totalCount`. 0 when the checkpoint has no positions
   *  on this instrument (e.g. all its strings are past the string count). */
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
 * Evaluate the whole path: every checkpoint's per-position score, mean
 * percentage, live and monotonic star rating, unlock state, and which one is
 * current. Deterministic for fixed inputs.
 */
export function evaluatePath(opts: EvaluatePathOptions): PathView {
  const {
    entries, srs, instrument, noteTable, progress, now,
    checkpoints = PATH_CHECKPOINTS,
  } = opts;

  // Group history rows by position id, once — dropping anything past the
  // 180-day hard cap (a performance / storage bound only) and anything with no
  // usable timestamp (treated as too old, same rule as `weakness.ts` /
  // `utils/mastery.ts`). The exponential decay weight — not this filter — is
  // what makes a long-ago streak stop counting; row order no longer matters,
  // so there is no per-position sort any more.
  const cutoff = now - HARD_CAP_DAYS * DAY_MS;
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

  const scoreFor = (itemId: string): number => {
    const srsItem = srs[itemId];
    return strengthFor(rowsById.get(itemId), srsItem ? srsItem.bucket : null, now);
  };

  const currentIndex = currentCheckpointIndex(checkpoints, progress.bestStars);

  const views: CheckpointView[] = checkpoints.map((checkpoint, i) => {
    const rawItems = checkpointItemIds(checkpoint, instrument, noteTable);
    const items: CheckpointItemView[] = rawItems.map((it) => {
      const score = parseNoteItemId(it.itemId) ? scoreFor(it.itemId) : 0;
      return { ...it, score, mastered: score >= MASTERED_ACCURACY };
    });
    const totalCount = items.length;
    const masteredCount = items.filter((it) => it.mastered).length;
    // The checkpoint metric is the MEAN of the continuous position scores, not
    // `masteredCount / totalCount` — a partly-known position still contributes.
    const pctMastered =
      totalCount > 0
        ? Math.round((items.reduce((s, it) => s + it.score, 0) / totalCount) * 100)
        : 0;

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
