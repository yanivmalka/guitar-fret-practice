// ── Game Progress persistence (local) ─────────────────────────────────────
//
// Task 5. The player's saved progression through the Game, persisted to a
// single dedicated localStorage key (`gameProgress`). Deliberately local
// only — no Supabase, no `gameSync`, no `App.tsx` wiring, no UI. The stored
// record carries `version` and `updatedAt` from the start so a later
// cloud layer (a `badgeSync`-style `gameSync.ts`) can be added without
// migrating the shape.
//
// What is stored (see `GameProgress` in `src/game/models.ts`):
//   • bestStars — best 1–3★ per `Stage.id`. Monotonic: a run never lowers a
//     stage's stars, and a 0★ run never creates an entry. A missing stage
//     id therefore means 0★.
//   • lastPlayed — the world + stage of the most recent run, for "continue".
//   • version / updatedAt — bookkeeping.
//
// What is derived and never stored:
//   • unlock state — `isStageUnlocked()` is a pure function of `bestStars`
//     plus the fixed stage order (`WORLDS` order, then `Stage.order`). The
//     first stage in that order is always unlocked; every later stage
//     unlocks once the stage before it has earned at least 1★.
//
// This module is the local persistence seam and lives under `src/utils/`;
// the `src/game/*` files stay pure data model.

import type { GameProgress } from '../game/models';
import type { StageResult } from '../game/stageResult';
import { STAGES } from '../game/stages';
import { WORLDS } from '../game/worlds';

const STORAGE_KEY = 'gameProgress';

// The only star values that may appear in a stored `bestStars` map.
const VALID_STARS = new Set<number>([1, 2, 3]);

// A fresh, safe, empty record — a new object each call so callers never
// share mutable state. Returned whenever nothing is stored or the stored
// value cannot be trusted.
function emptyProgress(): GameProgress {
  return { version: 1, bestStars: {}, updatedAt: '' };
}

// Coerce an arbitrary parsed value into a well-formed `GameProgress`,
// dropping anything that does not fit. Unknown/invalid input collapses to
// an empty record rather than throwing.
function normalize(value: unknown): GameProgress {
  if (value == null || typeof value !== 'object') return emptyProgress();
  const raw = value as Record<string, unknown>;

  const bestStars: Record<string, 1 | 2 | 3> = {};
  const rawStars = raw.bestStars;
  if (rawStars != null && typeof rawStars === 'object') {
    for (const [stageId, stars] of Object.entries(rawStars as Record<string, unknown>)) {
      if (typeof stars === 'number' && VALID_STARS.has(stars)) {
        bestStars[stageId] = stars as 1 | 2 | 3;
      }
    }
  }

  const result: GameProgress = {
    version: 1,
    bestStars,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  };

  const lastPlayed = raw.lastPlayed;
  if (lastPlayed != null && typeof lastPlayed === 'object') {
    const { worldId, stageId } = lastPlayed as Record<string, unknown>;
    if (typeof worldId === 'string' && typeof stageId === 'string') {
      result.lastPlayed = { worldId, stageId };
    }
  }

  return result;
}

/**
 * Read the saved progress. A missing key, unparseable JSON, or a
 * structurally invalid record all fall back to a safe empty progress —
 * this never throws.
 */
export function loadGameProgress(): GameProgress {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return emptyProgress();
  }
  if (raw == null) return emptyProgress();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/**
 * Persist a progress record. Best-effort — a write failure (private mode,
 * quota) is swallowed, matching the rest of the app's localStorage use.
 */
export function saveGameProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* localStorage unavailable — best-effort only */
  }
}

/**
 * Fold a finished stage run into the saved progress and persist it.
 *
 * Monotonic on stars: `bestStars[stageId]` only ever rises. A run that
 * earns fewer stars than the stored best leaves the best untouched, and a
 * 0★ run never creates an entry. `lastPlayed` and `updatedAt` are always
 * refreshed — playing a stage is recorded even when the rating did not
 * improve.
 *
 * Returns the newly persisted record.
 */
export function recordStageResult(result: StageResult): GameProgress {
  const current = loadGameProgress();
  const previousBest = current.bestStars[result.stageId] ?? 0;
  const nextBest = Math.max(previousBest, result.stars);

  const next: GameProgress = {
    version: 1,
    bestStars: { ...current.bestStars },
    updatedAt: new Date().toISOString(),
  };
  if (current.lastPlayed) next.lastPlayed = current.lastPlayed;

  if (nextBest >= 1) {
    next.bestStars[result.stageId] = nextBest as 1 | 2 | 3;
  }

  const stage = STAGES.find(s => s.id === result.stageId);
  if (stage) {
    next.lastPlayed = { worldId: stage.worldId, stageId: stage.id };
  }

  saveGameProgress(next);
  return next;
}

// Stage ids in game order: by world order first, then by `Stage.order`
// within the world. The single source of sequence for unlock checks.
function orderedStageIds(): string[] {
  const worldOrder = new Map(WORLDS.map(w => [w.id, w.order]));
  const rank = (worldId: string) => worldOrder.get(worldId) ?? Number.MAX_SAFE_INTEGER;
  return [...STAGES]
    .sort((a, b) => rank(a.worldId) - rank(b.worldId) || a.order - b.order)
    .map(s => s.id);
}

/**
 * Is a stage playable given the current progress? The first stage in game
 * order is always unlocked; every later stage unlocks once the stage
 * immediately before it in that order has earned at least 1★. An unknown
 * stage id is locked.
 */
export function isStageUnlocked(stageId: string, progress: GameProgress): boolean {
  const order = orderedStageIds();
  const index = order.indexOf(stageId);
  if (index < 0) return false;
  if (index === 0) return true;
  const previousId = order[index - 1];
  return (progress.bestStars[previousId] ?? 0) >= 1;
}
