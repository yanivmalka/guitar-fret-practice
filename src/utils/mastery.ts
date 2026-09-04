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

// ── Mastery window ────────────────────────────────────────────────────
//
// Which slice of history the fretboard/note-circle overlay is computed
// from. Free users are pinned to the last 250 questions; Pro users pick
// the count (see PRO_MASTERY_LASTN_CHOICES). The `dateRange` / `onDay`
// variants are the foundation for a future Pro "how was I on that day"
// view — `applyMasteryWindow` already honours them, but nothing in the
// UI produces them yet.
export type MasteryWindow =
  | { kind: 'lastN'; n: number }                          // n <= 0 => all-time
  | { kind: 'dateRange'; fromISO: string; toISO: string } // future UI
  | { kind: 'onDay'; dayISO: string };                    // future UI ("that day")

export const FREE_MASTERY_WINDOW: MasteryWindow = { kind: 'lastN', n: 250 };
export const DEFAULT_MASTERY_WINDOW: MasteryWindow = { kind: 'lastN', n: 250 };
// Options offered to Pro in the "questions counted" control. 0 = all-time.
export const PRO_MASTERY_LASTN_CHOICES = [100, 250, 500, 1000, 0] as const;

// Chronological sort by `createdAt`. Rows without one (localStorage entries
// that predate id/timestamp stamping) sort oldest, matching how
// `utils/progress.ts` treats timestamp-less rows — so they are the first
// dropped once a `lastN` cap is exceeded.
function byCreatedAtAsc(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

// Local-calendar-day bounds [start, nextDayStart) as ISO strings.
function dayBoundsISO(dayISO: string): { fromISO: string; toISO: string } {
  const d = new Date(dayISO);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { fromISO: start.toISOString(), toISO: end.toISOString() };
}

export function applyMasteryWindow(entries: HistoryEntry[], window: MasteryWindow): HistoryEntry[] {
  if (window.kind === 'lastN') {
    if (window.n <= 0) return entries;
    return byCreatedAtAsc(entries).slice(-window.n);
  }
  const { fromISO, toISO } = window.kind === 'onDay' ? dayBoundsISO(window.dayISO) : window;
  return entries.filter(e => e.createdAt != null && e.createdAt >= fromISO && e.createdAt < toISO);
}

// The instrument a stored `historyKey` belongs to. Guitar keys are unprefixed
// and start with their comma-joined string list ("3,4|0-12|byFret|dots"); any
// other leading `|`-segment is an explicit instrument id ("bass|3,4|…",
// "ukulele|…"). Future string instruments work here with no change.
export function instrumentOfKey(key: string): string {
  const first = key.split('|', 1)[0];
  return /^[0-9,]+$/.test(first) ? 'guitar' : first;
}

// All-time history for one instrument only — the per-combination stats are
// already instrument-clean (the id prefixes the key), this restores that
// separation for the flattened all-time roll-ups.
export function historyForInstrument(
  allHistory: Record<string, HistoryEntry[]>,
  instrumentId: string,
): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const [key, rows] of Object.entries(allHistory)) {
    if (instrumentOfKey(key) === instrumentId) out.push(...rows);
  }
  return out;
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
