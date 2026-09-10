import type { HistoryEntry } from './music';
import { notesMatch } from './music';

// All-time, all-settings mastery used for the fretboard/note-circle
// "equalizer" overlays — deliberately simpler than StatsPanel's 3-tier
// mastered/solid/growing categories (see CLAUDE.md: this view favors a
// glanceable read over StatsPanel's detailed breakdown).
//
// The overlay bar carries two signals: its LENGTH is how much of the active
// mastery window landed on this position (`attempts / windowSize`, so 70 of
// the last 100 questions ⇒ a 70%-length bar), and its COLOUR is how those
// attempts went — a theme-aware danger→known ramp on the correct/wrong split,
// pulled toward a muted neutral by the "didn't know" share (timeouts/skips). See
// `masteryFillPct` / `masteryColor`. `level` + `accuracy` stay for the Stats
// screen's fret heatmap and weak-note list (utils/progress.ts), which read a
// coarse known/needs-work bucket, not the raw tallies.
export type MasteryLevel = 'unplayed' | 'needsWork' | 'known';

export interface MasteryStat {
  level: MasteryLevel;
  accuracy: number; // 0-1 = correct / attempts; meaningful only when level !== 'unplayed'
  // Raw outcome tallies within the window, for the overlay's coverage-length
  // + tri-outcome colour. `attempts` = correct + wrong + unsure.
  attempts: number;
  correct: number;
  wrong: number;
  unsure: number; // timeouts / skips (`correct === null`, or `skipped`)
}

const KNOWN_THRESHOLD = 0.7;
const UNPLAYED: MasteryStat = {
  level: 'unplayed', accuracy: 0, attempts: 0, correct: 0, wrong: 0, unsure: 0,
};

// A bar can never quite reach zero width or it would be indistinguishable from
// an unplayed position; this is small enough that "touched once in 1000" still
// all but vanishes, which is the intent.
const MIN_FILL_PCT = 2;

function toStat(entries: HistoryEntry[]): MasteryStat {
  if (entries.length === 0) return UNPLAYED;
  let correct = 0, wrong = 0, unsure = 0;
  for (const e of entries) {
    if (e.correct === true) correct++;
    else if (e.correct === false && !e.skipped) wrong++;
    else unsure++; // timeout / skip: `correct === null`, or `skipped`
  }
  const attempts = correct + wrong + unsure;
  const accuracy = correct / attempts;
  return {
    level: accuracy >= KNOWN_THRESHOLD ? 'known' : 'needsWork',
    accuracy, attempts, correct, wrong, unsure,
  };
}

// The count that fills an overlay bar to 100%. A fixed-size "last N" window
// returns N — a position asked in every one of those questions is a full bar.
// An open-ended window (onDay / dateRange / all-time `n <= 0`) has no such
// count: it returns null, and the overlay then draws every played position at
// full length so colour alone carries the signal.
export function masteryDenominator(window: MasteryWindow): number | null {
  return window.kind === 'lastN' && window.n > 0 ? window.n : null;
}

// The overlay bar's length, 0-100. `denom` is `masteryDenominator(window)`.
export function masteryFillPct(stat: MasteryStat, denom: number | null): number {
  if (stat.attempts === 0) return 0;
  if (denom == null) return 100;
  return Math.max(MIN_FILL_PCT, Math.min(100, (stat.attempts / denom) * 100));
}

// The overlay bar's colour. Hue rides the correct-vs-wrong split among the
// answers the player actually committed to; the "didn't know" share then pulls
// the whole thing toward a muted neutral, so a position you keep timing out on
// reads as unproven, not as confidently good or firmly failed. Returned via
// `color` (not `background`) so the bar's self-coloured glow follows for free.
//
// Every endpoint is a theme token, not a fixed hsl: the old hard-coded
// red→green ramp sat off-palette on the warm (summer / autumn) and light
// (*-day) seasonal grounds. `--heat-known` is the same token the fret /
// interval heatmaps use, so a season that retints "known" (autumn) retints
// this bar to match; `--danger` is the shared wrong-answer red; `--text-2` is
// a per-palette muted mid-tone that stays visible on dark and light grounds
// alike.
export function masteryColor(stat: MasteryStat): string {
  if (stat.attempts === 0) return 'transparent';
  const decisive = stat.correct + stat.wrong;
  const acc = decisive > 0 ? stat.correct / decisive : 0;
  const okPct = Math.round(acc * 100); // 0 => --danger … 100 => --heat-known
  const base = `color-mix(in srgb, var(--heat-known) ${okPct}%, var(--danger))`;
  const greyPct = Math.round((stat.unsure / stat.attempts) * 70); // cap the pull at 70%
  return greyPct > 0
    ? `color-mix(in srgb, ${base}, var(--text-2) ${greyPct}%)`
    : base;
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

// The last-N count every account gets by default: Free is pinned to it, Pro
// starts here until the "Mastery time window" control is touched.
export const DEFAULT_MASTERY_LASTN = 250;
export const FREE_MASTERY_WINDOW: MasteryWindow = { kind: 'lastN', n: DEFAULT_MASTERY_LASTN };
export const DEFAULT_MASTERY_WINDOW: MasteryWindow = { kind: 'lastN', n: DEFAULT_MASTERY_LASTN };
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

// True when the window is the plain "last 250" default that every account
// (Free, and Pro that hasn't changed it) sees — i.e. nothing worth captioning.
export function isDefaultMasteryWindow(window: MasteryWindow): boolean {
  return window.kind === 'lastN' && window.n === DEFAULT_MASTERY_LASTN;
}

// A short, translatable label for the active window — for the fretboard overlay
// caption and the Settings card, so a time-travelled overlay is never mistaken
// for the live one. `t` is passed in so this stays i18n-free itself.
export function describeMasteryWindow(
  window: MasteryWindow,
  t: (s: string) => string,
): string {
  if (window.kind === 'lastN') {
    return window.n <= 0
      ? t('showing all questions')
      : `${t('showing last')} ${window.n}`;
  }
  if (window.kind === 'onDay') return `${t('showing')} ${window.dayISO.slice(0, 10)}`;
  // dateRange: `toISO` is the half-open upper bound (local midnight after the
  // last counted day), so step back one day for the inclusive label.
  const lastDay = new Date(window.toISO);
  lastDay.setDate(lastDay.getDate() - 1);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, '0');
  const d = String(lastDay.getDate()).padStart(2, '0');
  return `${t('showing')} ${window.fromISO.slice(0, 10)} – ${y}-${m}-${d}`;
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
