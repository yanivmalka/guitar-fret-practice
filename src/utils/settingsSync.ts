// ── Cloud sync for selector picks + UI preferences ─────────────────────
//
// Same spirit as sync.ts / voiceSync.ts: localStorage stays the source of
// truth the app reads from. The cloud is a restore layer for signed-in
// users. Settings can't be merged field-wise the way history rows can, so
// the model is last-synced-device-wins: one JSON blob per user with an
// `updated_at`. On the first sign-in on a device:
//   - no cloud row yet            -> push this device's settings up.
//   - cloud row newer than local  -> adopt it (write every key to
//     localStorage) and reload so the hooks pick the values up at mount.
//   - cloud row older/equal       -> push this device's settings up.
// While signed in + online, every change to a synced key is pushed through
// (debounced, best-effort).

import { supabase } from './supabase';
import { getSyncUserId } from './sync';

// Exact keys + key prefixes that count as "settings". Everything else in
// localStorage (onboarding flag, voice-profile bookkeeping, sync flags,
// tombstones, per-combination history/best) is intentionally left out.
const SYNCED_KEYS = new Set([
  'sel_mode', 'sel_lower', 'sel_upper', 'sel_difficulty', 'sel_autoAdvance',
  'pref_accidental', 'pref_order', 'pref_notation', 'pref_byString',
  'pref_answerMode', 'pref_showScore', 'pref_instrument', 'pref_voiceEngine',
]);
const SYNCED_PREFIXES = ['sel_strings_', 'sel_multi_'];

export function isSyncedKey(key: string): boolean {
  return SYNCED_KEYS.has(key) || SYNCED_PREFIXES.some(p => key.startsWith(p));
}

// Local high-water mark: the `updated_at` of the settings blob this device
// last agreed with. Absent => this device has never synced settings, so any
// cloud row wins.
const LOCAL_TS_KEY = 'settingsSyncedAt';
function localTs(): string {
  try { return localStorage.getItem(LOCAL_TS_KEY) ?? ''; } catch { return ''; }
}
function setLocalTs(iso: string): void {
  try { localStorage.setItem(LOCAL_TS_KEY, iso); } catch { /* ignore */ }
}

const SYNCED_FLAG = 'cloudSyncedSettingsUser';
export function syncedSettingsUser(): string | null {
  try { return localStorage.getItem(SYNCED_FLAG); } catch { return null; }
}
function setSyncedSettingsUser(id: string): void {
  try { localStorage.setItem(SYNCED_FLAG, id); } catch { /* ignore */ }
}
export function clearSyncedSettingsUser(): void {
  try { localStorage.removeItem(SYNCED_FLAG); } catch { /* ignore */ }
}

function cloudReady(): boolean {
  return !!supabase && !!getSyncUserId() && navigator.onLine;
}

type Blob = Record<string, unknown>;

// Read every synced key currently in localStorage into a plain object.
function snapshot(): Blob {
  const out: Blob = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !isSyncedKey(k)) continue;
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        try { out[k] = JSON.parse(raw); } catch { out[k] = raw; }
      }
    }
  } catch { /* ignore */ }
  return out;
}

// Write a pulled blob back into localStorage. Returns true if anything
// actually changed on disk (so the caller knows whether a reload is worth it).
function applyBlob(data: Blob): boolean {
  let changed = false;
  try {
    for (const [k, v] of Object.entries(data)) {
      if (!isSyncedKey(k)) continue;
      const next = JSON.stringify(v);
      if (localStorage.getItem(k) !== next) {
        localStorage.setItem(k, next);
        changed = true;
      }
    }
  } catch { /* ignore */ }
  return changed;
}

// ── Write-through (debounced) ──────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function cloudPushSettings(): void {
  if (!cloudReady()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void flushSettings();
  }, 800);
}

async function flushSettings(): Promise<void> {
  if (!cloudReady()) return;
  const userId = getSyncUserId();
  const now = new Date().toISOString();
  try {
    const { error } = await supabase!.from('user_settings').upsert(
      { user_id: userId, data: snapshot(), updated_at: now },
      { onConflict: 'user_id' },
    );
    if (!error) setLocalTs(now);
  } catch { /* best-effort — retried on the next change / app start */ }
}

// ── Bootstrap on sign-in ──────────────────────────────────────────────

// Pull the cloud blob; adopt it if it is newer than what this device last
// synced, otherwise push this device's settings up. Marks the device synced
// for this account either way. Returns whether local settings changed on
// disk (caller reloads so the freshly-written values are read at mount).
export async function bootstrapSettings(
  userId: string,
): Promise<{ applied: boolean }> {
  if (!supabase) return { applied: false };

  const { data: row, error } = await supabase
    .from('user_settings')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  let applied = false;
  if (row && (row.updated_at as string) > localTs()) {
    applied = applyBlob((row.data ?? {}) as Blob);
    setLocalTs(row.updated_at as string);
  } else {
    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from('user_settings').upsert(
      { user_id: userId, data: snapshot(), updated_at: now },
      { onConflict: 'user_id' },
    );
    if (upErr) throw upErr;
    setLocalTs(now);
  }

  setSyncedSettingsUser(userId);
  return { applied };
}
