import type { HistoryEntry } from './music';
import { notesMatch } from './music';

// All-time, all-settings mastery used for the fretboard/note-circle
// "equalizer" overlays — deliberately simpler than StatsPanel's 3-tier
// mastered/solid/growing categories (see CLAUDE.md: this view favors a
// glanceable known/needs-work read over StatsPanel's detailed breakdown).
export type MasteryLevel = 'unplayed' | 'needsWork' | 'known';

export interface MasteryStat {
  level: MasteryLevel;
  accuracy: number; // 0-1, meaningful only when level !== 'unplayed'
}

const KNOWN_THRESHOLD = 0.7;
const UNPLAYED: MasteryStat = { level: 'unplayed', accuracy: 0 };

function toStat(entries: HistoryEntry[]): MasteryStat {
  if (entries.length === 0) return UNPLAYED;
  const correct = entries.filter(e => e.correct === true).length;
  const accuracy = correct / entries.length;
  return { level: accuracy >= KNOWN_THRESHOLD ? 'known' : 'needsWork', accuracy };
}

export function flattenHistory(allHistory: Record<string, HistoryEntry[]>): HistoryEntry[] {
  return Object.values(allHistory).flat();
}

// Mastery per fret on one string, across all-time history (any settings combo).
export function fretMasteryMap(entries: HistoryEntry[], guitarString: number): Record<number, MasteryStat> {
  const byFret = new Map<number, HistoryEntry[]>();
  for (const e of entries) {
    if (e.string !== guitarString) continue;
    const list = byFret.get(e.fret);
    if (list) list.push(e); else byFret.set(e.fret, [e]);
  }
  const result: Record<number, MasteryStat> = {};
  for (const [fret, es] of byFret) result[fret] = toStat(es);
  return result;
}

// Mastery per note name, across all strings, all-time.
export function noteMasteryMap(entries: HistoryEntry[], noteNames: string[]): Record<string, MasteryStat> {
  const result: Record<string, MasteryStat> = {};
  for (const note of noteNames) {
    result[note] = toStat(entries.filter(e => notesMatch(e.note, note)));
  }
  return result;
}
