// Per-selector-combination personal best, keyed by the same `historyKey()`
// string used for history/stats. Stored under `best_<key>` in localStorage.
// This is the single source of truth for "personal best" — shared by
// StatsPanel (display) and App (Tier 3 celebration trigger).

import { cloudUpsertBest } from './sync';

export interface PersonalBest {
  score: number;
  streak: number;
  accuracy: number;
}

const PREFIX = 'best_';

export function loadBest(key: string): PersonalBest | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as PersonalBest) : null;
  } catch {
    return null;
  }
}

export function saveBest(key: string, data: PersonalBest): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
  } catch {
    /* localStorage unavailable — best-effort only */
  }
  // Write-through to the cloud for signed-in users (no-op for guests/offline).
  void cloudUpsertBest(key, data);
}

// Every `best_<key>` record in localStorage, keyed by historyKey — used to
// seed the local->cloud merge on sign-in.
export function loadAllBests(): Record<string, PersonalBest> {
  const out: Record<string, PersonalBest> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (raw) out[k.slice(PREFIX.length)] = JSON.parse(raw) as PersonalBest;
    }
  } catch {
    /* ignore */
  }
  return out;
}

// Overwrite local `best_<key>` records with the post-sign-in merged set.
export function writeAllBests(bests: Record<string, PersonalBest>): void {
  try {
    for (const [key, data] of Object.entries(bests)) {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
    }
  } catch {
    /* ignore */
  }
}
