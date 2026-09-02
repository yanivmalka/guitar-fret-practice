// All-time, cross-settings aggregation for the Progress screen. Everything
// here is a pure function over the `allHistory` map (every `historyKey`
// bucket flattened together) plus the per-key `best_<key>` records. It never
// writes — StatsPanel stays the owner of per-session/per-combination display,
// this module answers "am I improving over time?".

import type { HistoryEntry } from './music';
import { noteMasteryMap } from './mastery';
import { loadAllBests, type PersonalBest } from './personalBest';

export interface DayStat {
  date: string; // YYYY-MM-DD
  count: number;
  accuracy: number; // 0-1 over all recorded questions that day
  avgSeconds: number; // mean answer time of correct answers, 0 if none
}

// One row per calendar day that has history, oldest first. Rows without a
// `createdAt` (localStorage entries that predate id/timestamp stamping) can't
// be placed on the timeline and are skipped here — the lifetime totals below
// still count them.
export function dailyStats(entries: HistoryEntry[]): DayStat[] {
  const byDay = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    if (!e.createdAt) continue;
    const day = e.createdAt.slice(0, 10);
    const list = byDay.get(day);
    if (list) list.push(e);
    else byDay.set(day, [e]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, es]) => {
      const correct = es.filter(e => e.correct === true);
      const avgSeconds = correct.length > 0
        ? correct.reduce((s, e) => s + e.seconds, 0) / correct.length
        : 0;
      return {
        date,
        count: es.length,
        accuracy: es.length > 0 ? correct.length / es.length : 0,
        avgSeconds,
      };
    });
}

export interface StreakInfo {
  current: number; // consecutive practice days ending today or yesterday
  longest: number;
}

function isNextDay(a: string, b: string): boolean {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return db - da === 86_400_000;
}

export function practiceStreak(days: DayStat[]): StreakInfo {
  const dates = days.map(d => d.date); // sorted asc, unique
  if (dates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (isNextDay(dates[i - 1], dates[i])) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const last = dates[dates.length - 1];
  let current = 0;
  if (last === today || isNextDay(last, today)) {
    current = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      if (isNextDay(dates[i - 1], dates[i])) current++;
      else break;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

export interface LifetimeTotals {
  totalQuestions: number;
  accuracy: number; // 0-1
  avgSeconds: number;
  bestSeconds: number;
  daysPracticed: number;
}

export function lifetimeTotals(entries: HistoryEntry[], days: DayStat[]): LifetimeTotals {
  const correct = entries.filter(e => e.correct === true);
  return {
    totalQuestions: entries.length,
    accuracy: entries.length > 0 ? correct.length / entries.length : 0,
    avgSeconds: correct.length > 0
      ? correct.reduce((s, e) => s + e.seconds, 0) / correct.length
      : 0,
    bestSeconds: correct.length > 0 ? Math.min(...correct.map(e => e.seconds)) : 0,
    daysPracticed: days.length,
  };
}

export interface WeakSpot {
  label: string; // raw note name — caller formats via displayNote
  accuracy: number; // 0-1
}

// The weakest note names across all-time history (mastery level 'needsWork'),
// worst first. Reuses the same categorisation as the fretboard equalizer.
export function weakNotes(entries: HistoryEntry[], noteNames: string[], limit = 6): WeakSpot[] {
  const map = noteMasteryMap(entries, noteNames);
  return Object.entries(map)
    .filter(([, s]) => s.level === 'needsWork')
    .sort(([, a], [, b]) => a.accuracy - b.accuracy)
    .slice(0, limit)
    .map(([label, s]) => ({ label, accuracy: s.accuracy }));
}

export interface BestSummary {
  key: string; // historyKey the record is scoped to
  best: PersonalBest;
}

export function allBestsSummary(): BestSummary[] {
  return Object.entries(loadAllBests())
    .map(([key, best]) => ({ key, best }))
    .sort((a, b) => b.best.score - a.best.score);
}
