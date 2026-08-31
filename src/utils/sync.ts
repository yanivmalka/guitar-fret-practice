// Cloud sync for signed-in users. Guests never reach any of this.
//
// Model: localStorage stays the source of truth the UI reads from, always.
// The cloud is a backup/restore layer on top:
//   - on first sign-in on a device: pull cloud -> merge with local -> push
//     the merged set back -> write merged set into localStorage.
//   - while signed in + online: each new history row / personal best is
//     also written through to the cloud (best-effort, failure ignored).
//   - on later app starts while signed in + online: a full idempotent
//     re-push catches anything written offline.

import { supabase } from './supabase';
import type { HistoryEntry } from './music';
import type { PersonalBest } from './personalBest';

type HistoryMap = Record<string, HistoryEntry[]>;
type BestMap = Record<string, PersonalBest>;

let currentUserId: string | null = null;

export function setSyncUser(id: string | null) {
  currentUserId = id;
}

function cloudReady(): boolean {
  return !!supabase && !!currentUserId && navigator.onLine;
}

// Marks that this device has completed the initial local->cloud merge for a
// given user, so a later sign-in of the same account doesn't re-run it.
const SYNCED_FLAG = 'cloudSyncedUser';
export function syncedUser(): string | null {
  try { return localStorage.getItem(SYNCED_FLAG); } catch { return null; }
}
function setSyncedUser(id: string) {
  try { localStorage.setItem(SYNCED_FLAG, id); } catch { /* ignore */ }
}
export function clearSyncedUser() {
  try { localStorage.removeItem(SYNCED_FLAG); } catch { /* ignore */ }
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Ensure every entry has a stable id + createdAt (older local rows predate
// these fields). Mutates a shallow copy, returns it.
export function withIds(entry: HistoryEntry): HistoryEntry {
  return {
    ...entry,
    id: entry.id ?? newId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

// ── Write-through (called on each new row / best while signed in) ─────────

export async function cloudInsertEntry(historyKey: string, entry: HistoryEntry) {
  if (!cloudReady()) return;
  const e = withIds(entry);
  try {
    await supabase!.from('history_entries').upsert(
      {
        id: e.id,
        user_id: currentUserId,
        history_key: historyKey,
        note: e.note,
        fret: e.fret,
        string: e.string,
        seconds: e.seconds,
        skipped: e.skipped,
        correct: e.correct,
        created_at: e.createdAt,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  } catch { /* best-effort */ }
}

export async function cloudUpsertBest(historyKey: string, best: PersonalBest) {
  if (!cloudReady()) return;
  try {
    await supabase!.from('personal_bests').upsert(
      {
        user_id: currentUserId,
        history_key: historyKey,
        score: best.score,
        streak: best.streak,
        accuracy: best.accuracy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,history_key' },
    );
  } catch { /* best-effort */ }
}

// ── Pull / merge / push (bootstrap on sign-in) ───────────────────────────

export async function pullAll(userId: string): Promise<{ history: HistoryMap; bests: BestMap }> {
  const history: HistoryMap = {};
  const bests: BestMap = {};
  if (!supabase) return { history, bests };

  const { data: rows, error: hErr } = await supabase
    .from('history_entries')
    .select('id, history_key, note, fret, string, seconds, skipped, correct, created_at')
    .eq('user_id', userId);
  if (hErr) throw hErr;
  for (const r of rows ?? []) {
    (history[r.history_key] ??= []).push({
      id: r.id,
      note: r.note,
      fret: r.fret,
      string: r.string,
      seconds: r.seconds,
      skipped: r.skipped,
      correct: r.correct,
      createdAt: r.created_at,
    });
  }

  const { data: bestRows, error: bErr } = await supabase
    .from('personal_bests')
    .select('history_key, score, streak, accuracy')
    .eq('user_id', userId);
  if (bErr) throw bErr;
  for (const r of bestRows ?? []) {
    bests[r.history_key] = { score: r.score, streak: r.streak, accuracy: r.accuracy };
  }

  return { history, bests };
}

// History merge: union by id across every historyKey. Local rows without an
// id get one assigned here so the result is stable for the push that follows.
export function mergeHistory(local: HistoryMap, cloud: HistoryMap): HistoryMap {
  const out: HistoryMap = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const key of keys) {
    const byId = new Map<string, HistoryEntry>();
    for (const e of cloud[key] ?? []) byId.set(e.id!, e);
    for (const e of local[key] ?? []) {
      const withId = withIds(e);
      if (!byId.has(withId.id!)) byId.set(withId.id!, withId);
    }
    out[key] = [...byId.values()].sort(
      (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
    );
  }
  return out;
}

// Personal-best merge: highest score per historyKey wins.
export function mergeBests(local: BestMap, cloud: BestMap): BestMap {
  const out: BestMap = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const key of keys) {
    const l = local[key];
    const c = cloud[key];
    out[key] = !l ? c! : !c ? l : l.score >= c.score ? l : c;
  }
  return out;
}

export async function pushAll(userId: string, history: HistoryMap, bests: BestMap): Promise<void> {
  if (!supabase) return;

  const rows: Record<string, unknown>[] = [];
  for (const [historyKey, entries] of Object.entries(history)) {
    for (const e of entries) {
      const w = withIds(e);
      rows.push({
        id: w.id,
        user_id: userId,
        history_key: historyKey,
        note: w.note,
        fret: w.fret,
        string: w.string,
        seconds: w.seconds,
        skipped: w.skipped,
        correct: w.correct,
        created_at: w.createdAt,
      });
    }
  }
  if (rows.length) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase
        .from('history_entries')
        .upsert(rows.slice(i, i + 500), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    }
  }

  const bestRows = Object.entries(bests).map(([historyKey, b]) => ({
    user_id: userId,
    history_key: historyKey,
    score: b.score,
    streak: b.streak,
    accuracy: b.accuracy,
    updated_at: new Date().toISOString(),
  }));
  if (bestRows.length) {
    const { error } = await supabase
      .from('personal_bests')
      .upsert(bestRows, { onConflict: 'user_id,history_key' });
    if (error) throw error;
  }
}

// Full bootstrap: pull -> merge -> push. Returns the merged sets for the
// caller to commit to localStorage / React state. Throws on failure, in
// which case the caller must leave local data untouched.
export async function bootstrapUser(
  userId: string,
  localHistory: HistoryMap,
  localBests: BestMap,
): Promise<{ history: HistoryMap; bests: BestMap }> {
  const { history: cloudHistory, bests: cloudBests } = await pullAll(userId);
  const history = mergeHistory(localHistory, cloudHistory);
  const bests = mergeBests(localBests, cloudBests);
  await pushAll(userId, history, bests);
  setSyncedUser(userId);
  return { history, bests };
}
