// ── gameSync.ts — cloud sync for the Game's progression ─────────────────
//
// Same local-first, best-effort model as settingsSync.ts / badgeSync.ts /
// learningSync.ts: localStorage (`gameProgress`) stays the source of truth
// GameFlow reads every render; the cloud is a restore layer for signed-in
// users, backed by one row per user in `public.user_game_progress`
// (migration 0015, authenticated own-row RLS — the 0004 / 0008 pattern).
//
// This is NOT last-writer-wins for the part that matters: `bestStars` is
// merged per stage as a max (`mergeGameProgress`), so a 3★ earned on device
// B is never dropped because device A pushed more recently. Every reconcile
// is pull → merge → write-back → upsert, which is idempotent and
// order-independent; two devices cannot permanently diverge on stars.
// `lastPlayed` / `updatedAt` are "continue" hints and follow the newer
// `updatedAt`.
//
// The module reads/writes the `gameProgress` key directly (like badgeSync
// touches `badges`) so there is no import cycle with `gameProgress.ts` —
// it only pulls that module's pure helpers. A reconcile that actually
// changes local state dispatches a `game-progress-synced` window event; a
// mounted GameFlow re-reads on it.

import { supabase } from './supabase';
import { getSyncUserId } from './sync';
import {
  GAME_STORAGE_KEY,
  normalizeGameProgress,
  mergeGameProgress,
  clearLocalGameProgress,
} from './gameProgress';
import type { GameProgress } from '../game/models';

export { clearLocalGameProgress };

const TABLE = 'user_game_progress';
const SYNCED_FLAG = 'cloudSyncedGameProgressUser';

function cloudReady(): boolean {
  return !!supabase && !!getSyncUserId() && navigator.onLine;
}

export function syncedGameProgressUser(): string | null {
  try {
    return localStorage.getItem(SYNCED_FLAG);
  } catch {
    return null;
  }
}
function setSyncedGameProgressUser(id: string): void {
  try {
    localStorage.setItem(SYNCED_FLAG, id);
  } catch {
    /* ignore */
  }
}
export function clearSyncedGameProgressUser(): void {
  try {
    localStorage.removeItem(SYNCED_FLAG);
  } catch {
    /* ignore */
  }
}

function loadLocal(): GameProgress {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    return normalizeGameProgress(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeGameProgress(null);
  }
}

// Write straight to localStorage, bypassing `saveGameProgress` so a reconcile
// never re-triggers its own push. Returns true only if the stored value
// actually changed, and tells a mounted GameFlow to re-read.
function writeLocal(progress: GameProgress): boolean {
  try {
    const next = JSON.stringify(progress);
    if (localStorage.getItem(GAME_STORAGE_KEY) === next) return false;
    localStorage.setItem(GAME_STORAGE_KEY, next);
  } catch {
    return false;
  }
  try {
    window.dispatchEvent(new Event('game-progress-synced'));
  } catch {
    /* non-DOM env */
  }
  return true;
}

// pull → merge → write-back → upsert. Idempotent, order-independent on stars.
// Returns whether the local store changed on disk.
async function reconcile(userId: string): Promise<boolean> {
  const { data: row, error } = await supabase!
    .from(TABLE)
    .select('best_stars, last_played, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const cloud = normalizeGameProgress(
    row
      ? {
          version: 1,
          bestStars: row.best_stars ?? {},
          lastPlayed: row.last_played ?? undefined,
          updatedAt: (row.updated_at as string) ?? '',
        }
      : null,
  );
  const merged = mergeGameProgress(loadLocal(), cloud);

  const changed = writeLocal(merged);

  const { error: upErr } = await supabase!.from(TABLE).upsert(
    {
      user_id: userId,
      best_stars: merged.bestStars,
      last_played: merged.lastPlayed ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upErr) throw upErr;

  return changed;
}

// ── Write-through (debounced) ─────────────────────────────────────────
// Called from GameFlow right after `recordStageResult`, and from App's
// `online` handler — the learningSync cadence.

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function cloudPushGameProgress(): void {
  if (!cloudReady()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void (async () => {
      if (!cloudReady()) return;
      try {
        await reconcile(getSyncUserId()!);
      } catch {
        /* best-effort — retried on the next run / app start */
      }
    })();
  }, 800);
}

// ── Bootstrap on sign-in ─────────────────────────────────────────────
// Pull / merge / push once per sign-in on this device. Throws on failure so
// the caller leaves local data untouched and retries on the next app start.
//
// Shared-device guard: if the on-device progress was last reconciled for a
// *different* account, drop it before the merge so account A's stars are
// never carried into account B's cloud row. Sign-out already clears the
// blob; this also covers a stale flag or an interrupted sign-out.
export async function bootstrapGameProgress(
  userId: string,
): Promise<{ changed: boolean }> {
  if (!supabase) return { changed: false };
  const prevUser = syncedGameProgressUser();
  if (prevUser && prevUser !== userId) clearLocalGameProgress();
  const changed = await reconcile(userId);
  setSyncedGameProgressUser(userId);
  return { changed };
}
