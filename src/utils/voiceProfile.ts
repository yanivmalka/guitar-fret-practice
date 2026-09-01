// ── Personal voice-profile storage (IndexedDB) ─────────────────────────
//
// Each "profile" is one person's set of calibration recordings, kept
// entirely on-device. A profile holds several templates per label (e.g.
// two or three recordings of the user saying "C#"), grouped by a
// `vocabId` so the alpha-note set and any future set (solfège, frets)
// don't mix.
//
// The MFCC frames are stored pre-computed (see `mfcc.ts`) so matching at
// question time is just DTW, no feature extraction of the stored side.

import { loadSetting, saveSetting } from './settings';

const DB_NAME = 'voiceProfiles';
// v2: the personal profile switched from twelve whole-phrase note templates
// ("C sharp", …) to nine segmented ones (seven letters + "#"/"b"). The old
// templates are incompatible with segmented matching, so the upgrade drops
// the store and clears the ready flag — the user re-calibrates once.
const DB_VERSION = 2;
const STORE = 'templates';
const ACTIVE_KEY = 'voice.profile.active';
const READY_KEY = 'voice.profile.ready';

export interface StoredTemplate {
  /** `${profile}::${vocabId}::${label}::${n}` */
  key: string;
  profile: string;
  vocabId: string;
  label: string;
  frames: number[][];
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Any pre-v2 store holds incompatible whole-phrase templates — drop it.
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
        try { saveSetting(READY_KEY, false); } catch { /* noop */ }
      }
      const os = db.createObjectStore(STORE, { keyPath: 'key' });
      os.createIndex('byProfileVocab', ['profile', 'vocabId'], { unique: false });
      os.createIndex('byProfile', 'profile', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Active-profile pointer (localStorage, sync) ───────────────────────

export function getActiveProfile(): string | null {
  return loadSetting<string | null>(ACTIVE_KEY, null);
}

export function setActiveProfile(name: string | null): void {
  saveSetting(ACTIVE_KEY, name);
}

/**
 * Synchronous hint, kept in localStorage, of whether the active profile has
 * enough recordings to be usable. `getSpeechEngine()` reads this to decide
 * whether to pick the on-device engine without an async IndexedDB round
 * trip. Kept in sync by `recomputeReady()`.
 */
export function isProfileReady(): boolean {
  return loadSetting<boolean>(READY_KEY, false);
}

function setProfileReady(ready: boolean): void {
  saveSetting(READY_KEY, ready);
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function listProfiles(): Promise<string[]> {
  try {
    const db = await openDb();
    const all = await reqToPromise(tx(db, 'readonly').getAll() as IDBRequest<StoredTemplate[]>);
    return [...new Set(all.map((r) => r.profile))].sort();
  } catch {
    return [];
  }
}

export async function loadTemplates(
  profile: string,
  vocabId: string,
): Promise<{ label: string; frames: number[][] }[]> {
  try {
    const db = await openDb();
    const idx = tx(db, 'readonly').index('byProfileVocab');
    const rows = await reqToPromise(
      idx.getAll(IDBKeyRange.only([profile, vocabId])) as IDBRequest<StoredTemplate[]>,
    );
    return rows.map((r) => ({ label: r.label, frames: r.frames }));
  } catch {
    return [];
  }
}

export async function templateCounts(
  profile: string,
  vocabId: string,
): Promise<Record<string, number>> {
  const rows = await loadTemplates(profile, vocabId);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.label] = (out[r.label] ?? 0) + 1;
  return out;
}

export async function addTemplate(
  profile: string,
  vocabId: string,
  label: string,
  frames: number[][],
): Promise<void> {
  const db = await openDb();
  const store = tx(db, 'readwrite');
  const existing = await reqToPromise(
    store.index('byProfileVocab').getAll(IDBKeyRange.only([profile, vocabId])) as IDBRequest<StoredTemplate[]>,
  );
  const n = existing.filter((r) => r.label === label).length;
  const rec: StoredTemplate = {
    key: `${profile}::${vocabId}::${label}::${n}::${Date.now()}`,
    profile, vocabId, label, frames, createdAt: Date.now(),
  };
  await reqToPromise(store.add(rec) as IDBRequest);
}

export async function clearLabel(
  profile: string,
  vocabId: string,
  label: string,
): Promise<void> {
  const db = await openDb();
  const store = tx(db, 'readwrite');
  const rows = await reqToPromise(
    store.index('byProfileVocab').getAll(IDBKeyRange.only([profile, vocabId])) as IDBRequest<StoredTemplate[]>,
  );
  for (const r of rows) if (r.label === label) store.delete(r.key);
}

/**
 * Reserved profile name for the "General" engine's self-learning store —
 * templates captured from correct in-game voice answers. Never shown as a
 * user profile and never the active profile.
 */
export const ADAPTIVE_PROFILE = '__general_adaptive__';

/** Keep only the `keep` newest templates for one label; delete the rest. */
export async function pruneTemplates(
  profile: string,
  vocabId: string,
  label: string,
  keep: number,
): Promise<void> {
  const db = await openDb();
  const store = tx(db, 'readwrite');
  const rows = await reqToPromise(
    store.index('byProfileVocab').getAll(IDBKeyRange.only([profile, vocabId])) as IDBRequest<StoredTemplate[]>,
  );
  const mine = rows.filter((r) => r.label === label).sort((a, b) => a.createdAt - b.createdAt);
  for (const r of mine.slice(0, Math.max(0, mine.length - keep))) store.delete(r.key);
}

export async function deleteProfile(profile: string): Promise<void> {
  const db = await openDb();
  const store = tx(db, 'readwrite');
  const rows = await reqToPromise(
    store.index('byProfile').getAll(IDBKeyRange.only(profile)) as IDBRequest<StoredTemplate[]>,
  );
  for (const r of rows) store.delete(r.key);
  if (getActiveProfile() === profile) setActiveProfile(null);
}

/**
 * Recompute the synchronous `isProfileReady()` hint: true when the active
 * profile has at least `minPerLabel` recordings for every label in
 * `requiredLabels` of `vocabId`.
 */
export async function recomputeReady(
  vocabId: string,
  requiredLabels: string[],
  minPerLabel = 1,
): Promise<boolean> {
  const profile = getActiveProfile();
  if (!profile) { setProfileReady(false); return false; }
  const counts = await templateCounts(profile, vocabId);
  const ready = requiredLabels.every((l) => (counts[l] ?? 0) >= minPerLabel);
  setProfileReady(ready);
  return ready;
}
