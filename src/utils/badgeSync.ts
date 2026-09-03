// ── Cloud sync for earned achievement badges ──────────────────────────
//
// Same spirit as settingsSync.ts / voiceSync.ts: localStorage (key `badges`)
// stays the source of truth the badge wall reads from on every render. The
// cloud is a restore layer for signed-in users.
//
// The badge store is a tiny fixed-size map — `{ "<storeKey>": { earnedAt } }`
// — and "earned" is monotonic, so it merges cleanly field-wise (unlike the
// settings blob): the merge is a key union that keeps the earliest `earnedAt`
// for any key both sides hold. That makes it commutative and idempotent, so
// every push is really a pull -> merge -> write-back -> upsert mini-reconcile;
// two devices can never diverge the way they do with a last-writer blob.
//
//   - first sign-in on a device: pull cloud, merge with local, write the
//     merged set back to localStorage, push it up.
//   - while signed in + online: each new badge triggers a debounced reconcile.
//   - on reconnect / later app starts: the same idempotent reconcile re-runs.
//
// This module never imports badges.ts (which imports this one for the
// write-through hook) — it reads and writes the `badges` key directly, exactly
// as settingsSync.ts stays independent of settings.ts.
//
// When a reconcile actually changes the local store it dispatches a
// `badges-synced` window event; a mounted BadgeGrid listens for it and
// re-reads. No full-page reload (the settings model needs one only because its
// hooks read localStorage once at mount — the badge wall re-reads every render
// and remounts each time it's opened).

import { supabase } from './supabase';
import { getSyncUserId } from './sync';

const STORE_KEY = 'badges';

type EarnedBadge = { earnedAt: string };
type BadgeStore = Record<string, EarnedBadge>;

function cloudReady(): boolean {
  return !!supabase && !!getSyncUserId() && navigator.onLine;
}

// Marks that this device has completed the initial local<->cloud merge for a
// given user, so a later sign-in of the same account doesn't re-bootstrap.
const SYNCED_FLAG = 'cloudSyncedBadgesUser';
export function syncedBadgesUser(): string | null {
  try { return localStorage.getItem(SYNCED_FLAG); } catch { return null; }
}
function setSyncedBadgesUser(id: string): void {
  try { localStorage.setItem(SYNCED_FLAG, id); } catch { /* ignore */ }
}
export function clearSyncedBadgesUser(): void {
  try { localStorage.removeItem(SYNCED_FLAG); } catch { /* ignore */ }
}

function loadLocal(): BadgeStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as BadgeStore) : {};
  } catch {
    return {};
  }
}

// Write the merged store straight to localStorage, bypassing badges.ts's
// `saveBadges` so a reconcile never re-triggers its own write-through. Returns
// true only if the on-disk value actually changed, and lets a mounted badge
// wall know to re-read.
function writeLocal(store: BadgeStore): boolean {
  try {
    const next = JSON.stringify(store);
    if (localStorage.getItem(STORE_KEY) === next) return false;
    localStorage.setItem(STORE_KEY, next);
  } catch {
    return false;
  }
  try { window.dispatchEvent(new Event('badges-synced')); } catch { /* non-DOM env */ }
  return true;
}

// Key union; for a key both sides hold, keep the earliest `earnedAt` (a badge
// earned is earned — the first time it happened is the honest timestamp).
export function mergeBadgeStores(a: BadgeStore, b: BadgeStore): BadgeStore {
  const out: BadgeStore = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = !cur
      ? v
      : { earnedAt: cur.earnedAt <= v.earnedAt ? cur.earnedAt : v.earnedAt };
  }
  return out;
}

// pull -> merge -> write-back -> upsert. Idempotent and order-independent.
// Returns whether the local store changed on disk.
async function reconcile(userId: string): Promise<boolean> {
  const { data: row, error } = await supabase!
    .from('user_badges')
    .select('badges')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const cloud = (row?.badges ?? {}) as BadgeStore;
  const merged = mergeBadgeStores(loadLocal(), cloud);
  const changed = writeLocal(merged);

  const { error: upErr } = await supabase!.from('user_badges').upsert(
    { user_id: userId, badges: merged, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (upErr) throw upErr;

  return changed;
}

// ── Write-through (debounced) ─────────────────────────────────────────
// Called from badges.ts after any successful `saveBadges`.

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function cloudPushBadges(): void {
  if (!cloudReady()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void (async () => {
      if (!cloudReady()) return;
      try { await reconcile(getSyncUserId()!); } catch { /* best-effort */ }
    })();
  }, 800);
}

// ── Bootstrap on sign-in ─────────────────────────────────────────────
// Pull/merge/push once per sign-in on this device. Throws on failure so the
// caller leaves local data untouched and retries on the next app start.
// Returns whether the local store changed, so the caller can refresh a
// badge wall that happens to already be mounted.
export async function bootstrapBadges(userId: string): Promise<{ changed: boolean }> {
  if (!supabase) return { changed: false };
  const changed = await reconcile(userId);
  setSyncedBadgesUser(userId);
  return { changed };
}
