// ── Cloud sync for the personal voice profile ──────────────────────────
//
// Same model as `sync.ts` (History / Personal Best): IndexedDB stays the
// source of truth the recogniser reads from, always. The cloud is a
// backup/restore layer on top, active only for a signed-in user:
//   - on first sign-in on a device: pull cloud -> merge with local (union by
//     key) -> write the merged set into IndexedDB -> push anything local-only
//     up to the cloud.
//   - while signed in + online: each calibration action (record a take,
//     delete a take, delete the whole profile) also writes through to the
//     cloud, best-effort.
//
// Scope: only calibration-screen actions sync. Self-learned takes added
// in-game (`templateSpeechEngine.learnProfile`) stay device-local for now —
// syncing those too would also propagate a still-unreliable recogniser's own
// mistakes across devices.

import { supabase } from './supabase';
import { getSyncUserId } from './sync';
import {
  listAllTemplates, putTemplates, type StoredTemplate,
} from './voiceProfile';

// Marks that this device has completed the initial local<->cloud merge for a
// given user, so a later sign-in of the same account doesn't re-pull/re-push
// the whole set on every app start (write-through keeps things current after
// that point).
const SYNCED_FLAG = 'cloudSyncedVoiceUser';
export function voiceSyncedUser(): string | null {
  try { return localStorage.getItem(SYNCED_FLAG); } catch { return null; }
}
function setVoiceSyncedUser(id: string): void {
  try { localStorage.setItem(SYNCED_FLAG, id); } catch { /* ignore */ }
}
export function clearVoiceSyncedUser(): void {
  try { localStorage.removeItem(SYNCED_FLAG); } catch { /* ignore */ }
}

function cloudReady(): boolean {
  return !!supabase && !!getSyncUserId() && navigator.onLine;
}

type Row = {
  user_id: string;
  key: string;
  profile: string;
  vocab_id: string;
  label: string;
  frames: number[][];
  source: 'cal' | 'learned';
  created_at: number;
};

function toRow(userId: string, t: StoredTemplate): Row {
  return {
    user_id: userId,
    key: t.key,
    profile: t.profile,
    vocab_id: t.vocabId,
    label: t.label,
    frames: t.frames,
    source: t.source ?? 'cal',
    created_at: t.createdAt,
  };
}

function fromRow(r: Row): StoredTemplate {
  return {
    key: r.key, profile: r.profile, vocabId: r.vocab_id, label: r.label,
    frames: r.frames, source: r.source, createdAt: r.created_at,
  };
}

// ── Write-through (called right after each local calibration write) ────

export async function cloudInsertTemplate(t: StoredTemplate): Promise<void> {
  if (!cloudReady()) return;
  try {
    await supabase!.from('voice_templates')
      .upsert(toRow(getSyncUserId()!, t), { onConflict: 'user_id,key' });
  } catch { /* best-effort */ }
}

export async function cloudDeleteTemplate(key: string): Promise<void> {
  if (!cloudReady()) return;
  try {
    await supabase!.from('voice_templates').delete()
      .eq('user_id', getSyncUserId()!).eq('key', key);
  } catch { /* best-effort */ }
}

export async function cloudDeleteProfile(profile: string): Promise<void> {
  if (!cloudReady()) return;
  try {
    await supabase!.from('voice_templates').delete()
      .eq('user_id', getSyncUserId()!).eq('profile', profile);
  } catch { /* best-effort */ }
}

// ── Pull / merge / push (bootstrap on sign-in) ──────────────────────────

async function pullAll(userId: string): Promise<StoredTemplate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('voice_templates')
    .select('key, profile, vocab_id, label, frames, source, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as Row));
}

async function pushAll(userId: string, rows: StoredTemplate[]): Promise<void> {
  if (!supabase || !rows.length) return;
  const payload = rows.map((t) => toRow(userId, t));
  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await supabase
      .from('voice_templates')
      .upsert(payload.slice(i, i + 200), { onConflict: 'user_id,key' });
    if (error) throw error;
  }
}

/**
 * Full bootstrap: pull cloud rows, union with whatever is already in
 * IndexedDB (by `key`, so nothing is duplicated), write the merged set back
 * to IndexedDB, then push anything that was local-only. Returns the merged
 * rows so the caller can pick an active profile / recompute readiness.
 * Throws on failure — the caller must leave local data untouched.
 */
export async function bootstrapVoiceProfile(userId: string): Promise<StoredTemplate[]> {
  const [cloudRows, localRows] = await Promise.all([pullAll(userId), listAllTemplates()]);
  const byKey = new Map<string, StoredTemplate>();
  for (const r of cloudRows) byKey.set(r.key, r);
  for (const r of localRows) if (!byKey.has(r.key)) byKey.set(r.key, r);
  const merged = [...byKey.values()];
  await putTemplates(merged);
  await pushAll(userId, merged);
  setVoiceSyncedUser(userId);
  return merged;
}
