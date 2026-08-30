// Per-selector-combination personal best, keyed by the same `historyKey()`
// string used for history/stats. Stored under `best_<key>` in localStorage.
// This is the single source of truth for "personal best" — shared by
// StatsPanel (display) and App (Tier 3 celebration trigger).

export interface PersonalBest {
  score: number;
  streak: number;
  accuracy: number;
}

export function loadBest(key: string): PersonalBest | null {
  try {
    const raw = localStorage.getItem(`best_${key}`);
    return raw ? (JSON.parse(raw) as PersonalBest) : null;
  } catch {
    return null;
  }
}

export function saveBest(key: string, data: PersonalBest): void {
  try {
    localStorage.setItem(`best_${key}`, JSON.stringify(data));
  } catch {
    /* localStorage unavailable — best-effort only */
  }
}
