// ── learningSync.ts — cloud sync for the Premium Teacher's learning state ─
//
// Same local-first, best-effort model as settingsSync.ts / badgeSync.ts:
// localStorage (`learningState`) stays the source of truth the Teacher reads
// every render; the cloud is a restore layer for signed-in users, backed by
// one JSONB row per user in `public.user_learning_state` (migration 0012,
// authenticated own-row RLS — the `0004`/`0008` pattern).
//
// The critical difference from settingsSync: this is NOT last-writer-wins.
// SRS state is merged per NoteItem (`mergeLearningState` → `mergeSrsMaps` →
// `mergeSrsItem`), so a review made on device B is never discarded because
// device A pushed the blob more recently. Every reconcile is
// pull → merge → write-back → upsert, which is therefore idempotent and
// order-independent; two devices cannot permanently diverge.
//
// This module reads/writes the `learningState` localStorage key directly
// (like badgeSync touches `badges` directly) so there is no import cycle with
// the model layer. A reconcile that actually changes local state dispatches a
// `learning-synced` window event; a mounted Today card re-reads on it.

import { supabase } from '../utils/supabase';
import { getSyncUserId } from '../utils/sync';
import {
  LEARNING_STORAGE_KEY,
  normalizeLearningState,
  mergeLearningState,
  type LearningState,
} from './learningState';

const TABLE = 'user_learning_state';
const SYNCED_FLAG = 'cloudSyncedLearningUser';

function cloudReady(): boolean {
  return !!supabase && !!getSyncUserId() && navigator.onLine;
}

export function syncedLearningUser(): string | null {
  try {
    return localStorage.getItem(SYNCED_FLAG);
  } catch {
    return null;
  }
}
function setSyncedLearningUser(id: string): void {
  try {
    localStorage.setItem(SYNCED_FLAG, id);
  } catch {
    /* ignore */
  }
}
export function clearSyncedLearningUser(): void {
  try {
    localStorage.removeItem(SYNCED_FLAG);
  } catch {
    /* ignore */
  }
}

function loadLocal(): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    return raw
      ? normalizeLearningState(JSON.parse(raw), Date.now())
      : { version: 1, instruments: {} };
  } catch {
    return { version: 1, instruments: {} };
  }
}

// Write straight to localStorage, bypassing the model's save so a reconcile
// never re-triggers its own push. Returns true only if the stored value
// actually changed, and tells a mounted Today card to re-read.
function writeLocal(state: LearningState): boolean {
  try {
    const next = JSON.stringify(state);
    if (localStorage.getItem(LEARNING_STORAGE_KEY) === next) return false;
    localStorage.setItem(LEARNING_STORAGE_KEY, next);
  } catch {
    return false;
  }
  try {
    window.dispatchEvent(new Event('learning-synced'));
  } catch {
    /* non-DOM env */
  }
  return true;
}

// pull → merge → write-back → upsert. Idempotent, order-independent.
// Returns whether the local store changed on disk.
async function reconcile(userId: string): Promise<boolean> {
  const { data: row, error } = await supabase!
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const cloud = normalizeLearningState(row?.data ?? null, Date.now());
  const merged = mergeLearningState(loadLocal(), cloud);

  const changed = writeLocal(merged);

  const { error: upErr } = await supabase!.from(TABLE).upsert(
    { user_id: userId, data: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (upErr) throw upErr;

  return changed;
}

// ── Write-through (debounced) ─────────────────────────────────────────
// Called by the Teacher hook after any local save.

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function cloudPushLearning(): void {
  if (!cloudReady()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void (async () => {
      if (!cloudReady()) return;
      try {
        await reconcile(getSyncUserId()!);
      } catch {
        /* best-effort — retried on the next answer / app start */
      }
    })();
  }, 800);
}

// ── Bootstrap on sign-in ─────────────────────────────────────────────
// Pull / merge / push once per sign-in on this device. Throws on failure so
// the caller leaves local data untouched and retries on the next app start.
export async function bootstrapLearning(userId: string): Promise<{ changed: boolean }> {
  if (!supabase) return { changed: false };
  const changed = await reconcile(userId);
  setSyncedLearningUser(userId);
  return { changed };
}
