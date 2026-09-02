// Achievements ("badges"). Two kinds:
//
//  • Session badges  — evaluated at game-end from that round's score/streak and
//    its `HistoryEntry` rows. They are NOT back-computed from flat history
//    (sessions aren't delimited in storage), so they only ever accrue going
//    forward.
//  • Lifetime badges — pure functions over play history, re-checked at game-end
//    AND whenever the Badges screen opens, so existing history retroactively
//    unlocks them.
//
// Storage is local-only for v1 (localStorage key `badges`), mirroring
// `stat_longestStreakEver`. Cloud write-through is a later phase.
//
// Instrument scoping has two layers:
//  • The *store key* — string/fret-shaped badges are earned per instrument
//    (`"{badgeId}@{instrumentId}"`); everything else uses the bare `badgeId`.
//    `awardBadge` / `isEarned` route this from the id.
//  • The *evaluation input* — badges that measure the fretboard
//    (String Master, Full String Master, Full Neck) look only at the current
//    instrument's history; badges that measure the player (Century, streaks,
//    accuracy, improvement…) look at every instrument's history combined, so
//    bass practice counts toward them the moment it happens.

import type { HistoryEntry } from './music';
import type { InstrumentConfig, InstrumentId } from './instruments';
import { dailyStats, practiceStreak, lifetimeTotals } from './progress';

// Fixed-identity badges. String Master is per-string and generated at runtime
// from the instrument (`string_master_s1`…), so those ids are not listed here.
export type FixedBadgeId =
  | 'perfect_session' | 'speed_demon' | 'flawless_sprint' | 'on_fire' | 'comeback'
  | 'every_string'
  | 'string_master_all' | 'week_warrior' | 'dedicated' | 'century' | 'marathoner'
  | 'sharpshooter' | 'most_improved' | 'both_ends' | 'quick_read' | 'doubling_up'
  | 'full_neck' | 'low_end'
  | 'admin';
export type BadgeId = FixedBadgeId | `string_master_s${number}`;

// 'session' / 'lifetime' badges are computed from play; 'role' badges reflect
// the account (e.g. admin) and are never evaluated from history.
export type BadgeKind = 'session' | 'lifetime' | 'role';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  icon: string;
  blurb: string;            // one line: how to earn it
  kind: BadgeKind;
  instrumentScoped: boolean; // true → stored/earned per instrument
  target?: number;          // for the locked-state progress bar
  onlyInstrument?: InstrumentId; // badge exists only for this instrument
}

// ── Definitions ───────────────────────────────────────────────────────────────
// Display order is this array's order; the per-string String Master tiles are
// spliced in just before `string_master_all` by `badgeList`.
export const FIXED_BADGES: readonly BadgeDef[] = [
  // Session
  {
    id: 'perfect_session', name: 'Perfect Session', icon: '🎯',
    blurb: 'Answer 10 or more questions in a round with no mistakes at all.',
    kind: 'session', instrumentScoped: false,
  },
  {
    id: 'speed_demon', name: 'Speed Demon', icon: '⚡',
    blurb: 'Get 10+ correct answers in a round, at least 8 of them under 1.5s.',
    kind: 'session', instrumentScoped: false,
  },
  {
    id: 'flawless_sprint', name: 'Flawless Sprint', icon: '🏁',
    blurb: 'Finish a whole round at 90% accuracy or better.',
    kind: 'session', instrumentScoped: false,
  },
  {
    id: 'on_fire', name: 'On Fire', icon: '🔥',
    blurb: 'Reach a streak of 15 in a single round.',
    kind: 'session', instrumentScoped: false,
  },
  {
    id: 'comeback', name: 'Comeback', icon: '💪',
    blurb: 'Miss 3+ in the first half of a round, then close it on an 8+ streak.',
    kind: 'session', instrumentScoped: false,
  },
  {
    id: 'every_string', name: 'Every String', icon: '🎸',
    blurb: 'Finish a clean round that visited every string of the instrument.',
    kind: 'session', instrumentScoped: false,
  },
  // Lifetime
  {
    id: 'string_master_all', name: 'Full String Master', icon: '🎸✨',
    blurb: 'Earn String Master on every string of this instrument.',
    kind: 'lifetime', instrumentScoped: true,
  },
  {
    id: 'week_warrior', name: 'Week Warrior', icon: '📅',
    blurb: 'Practise on 5 separate days within a single 7-day window.',
    kind: 'lifetime', instrumentScoped: false, target: 5,
  },
  {
    id: 'dedicated', name: 'Dedicated', icon: '🗓️',
    blurb: 'Build a run of 7 consecutive practice days.',
    kind: 'lifetime', instrumentScoped: false, target: 7,
  },
  {
    id: 'century', name: 'Century', icon: '💯',
    blurb: 'Answer 100 questions all-time, across every instrument.',
    kind: 'lifetime', instrumentScoped: false, target: 100,
  },
  {
    id: 'marathoner', name: 'Marathoner', icon: '🏆',
    blurb: 'Answer 1,000 questions all-time, across every instrument.',
    kind: 'lifetime', instrumentScoped: false, target: 1000,
  },
  {
    id: 'sharpshooter', name: 'Sharpshooter', icon: '🎯',
    blurb: 'Hold 85% accuracy over at least 200 questions, across every instrument.',
    kind: 'lifetime', instrumentScoped: false, target: 200,
  },
  {
    id: 'most_improved', name: 'Most Improved', icon: '📈',
    blurb: 'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.',
    kind: 'lifetime', instrumentScoped: false,
  },
  {
    id: 'both_ends', name: 'Both Ends', icon: '🎚️',
    blurb: 'Answer 40+ questions above the 12th fret at 85% accuracy or better.',
    kind: 'lifetime', instrumentScoped: true, target: 40,
  },
  {
    id: 'quick_read', name: 'Quick Read', icon: '👁️',
    blurb: 'Hold an average answer time under 2.0s over 200+ questions, across every instrument.',
    kind: 'lifetime', instrumentScoped: false, target: 200,
  },
  {
    id: 'doubling_up', name: 'Doubling Up', icon: '🎸🎵',
    blurb: 'Earn Full String Master on both guitar and bass.',
    kind: 'lifetime', instrumentScoped: false, target: 2,
  },
  {
    id: 'full_neck', name: 'Full Neck', icon: '🛤️',
    blurb: 'Answer at least one question on every fret of the neck.',
    kind: 'lifetime', instrumentScoped: true,
  },
  {
    id: 'low_end', name: 'Low End', icon: '🎵',
    blurb: 'Answer 40+ questions on the bass low-E string at 90% accuracy or better.',
    kind: 'lifetime', instrumentScoped: true, target: 40, onlyInstrument: 'bass',
  },
  // Role
  {
    id: 'admin', name: 'Admin', icon: '🛡️',
    blurb: 'Granted to app administrators — read every Feedback board post, not just your own.',
    kind: 'role', instrumentScoped: false,
  },
];

export function stringMasterBadges(instrument: InstrumentConfig): BadgeDef[] {
  return Array.from({ length: instrument.stringCount }, (_, i) => {
    const n = i + 1;
    const label = instrument.stringLabels[n] ?? `String ${n}`;
    return {
      id: `string_master_s${n}` as BadgeId,
      name: `String Master · ${label}`,
      icon: '🎸',
      blurb: `Answer 40+ questions on ${label} at 90% accuracy or better.`,
      kind: 'lifetime' as const,
      instrumentScoped: true,
      target: 40,
    };
  });
}

// The full ordered badge set for one instrument: per-string String Master tiles
// inserted before `string_master_all`, and the two instrument-shaped targets
// (`string_master_all`, `full_neck`) resolved to concrete numbers.
export function badgeList(instrument: InstrumentConfig): BadgeDef[] {
  const out: BadgeDef[] = [];
  for (const def of FIXED_BADGES) {
    if (def.onlyInstrument && def.onlyInstrument !== instrument.id) continue;
    if (def.id === 'string_master_all') {
      out.push(...stringMasterBadges(instrument));
      out.push({ ...def, target: instrument.stringCount });
    } else if (def.id === 'full_neck') {
      out.push({ ...def, target: instrument.maxFret + 1 });
    } else {
      out.push(def);
    }
  }
  return out;
}

export function badgeDef(id: BadgeId, instrument: InstrumentConfig): BadgeDef | undefined {
  return badgeList(instrument).find(b => b.id === id);
}

// ── Store ────────────────────────────────────────────────────────────────────
export interface EarnedBadge { earnedAt: string; } // ISO
export type BadgeStore = Record<string, EarnedBadge>;

const STORE_KEY = 'badges';

function isInstrumentScoped(id: BadgeId): boolean {
  return id.startsWith('string_master_s')
    || id === 'string_master_all'
    || id === 'full_neck'
    || id === 'both_ends'
    || id === 'low_end';
}

function storeKey(id: BadgeId, instrumentId?: string): string {
  return isInstrumentScoped(id) && instrumentId ? `${id}@${instrumentId}` : id;
}

export function loadBadges(): BadgeStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as BadgeStore) : {};
  } catch {
    return {};
  }
}

function saveBadges(store: BadgeStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* localStorage unavailable — best-effort only */
  }
}

export function isEarned(id: BadgeId, instrumentId?: string): boolean {
  return storeKey(id, instrumentId) in loadBadges();
}

export function earnedAt(id: BadgeId, instrumentId?: string): string | null {
  return loadBadges()[storeKey(id, instrumentId)]?.earnedAt ?? null;
}

// Writes `earnedAt` only on the first earn; returns true only when NEWLY earned,
// so a "new badge" celebration never repeats.
export function awardBadge(id: BadgeId, instrumentId?: string): boolean {
  const store = loadBadges();
  const k = storeKey(id, instrumentId);
  if (store[k]) return false;
  store[k] = { earnedAt: new Date().toISOString() };
  saveBadges(store);
  return true;
}

// ── Evaluation ───────────────────────────────────────────────────────────────
export interface SessionSnapshot {
  questionsAnswered: number;
  maxQuestions: number;     // whole run total (Auto Advance stages summed)
  longestStreak: number;
  entries: HistoryEntry[];  // this round's rows, in answer order
  instrument: InstrumentConfig;
}

export interface LifetimeSnapshot {
  /** History for the current instrument only — feeds the fretboard-shape badges. */
  instrumentEntries: HistoryEntry[];
  /** History across every instrument — feeds the player-progress badges. */
  allEntries: HistoryEntry[];
  instrument: InstrumentConfig;
}

function accuracyOf(entries: HistoryEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.filter(e => e.correct === true).length / entries.length;
}

function isMiss(e: HistoryEntry): boolean {
  return e.correct === false || e.skipped;
}

// Trailing run of correct answers at the end of the round.
function closingStreak(entries: HistoryEntry[]): number {
  let n = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].correct === true) n++;
    else break;
  }
  return n;
}

export function evaluateSession(s: SessionSnapshot): BadgeId[] {
  const { entries, questionsAnswered, maxQuestions, longestStreak, instrument } = s;
  const out: BadgeId[] = [];
  const correct = entries.filter(e => e.correct === true);

  if (questionsAnswered >= 10 && entries.length > 0 && entries.every(e => e.correct === true)) {
    out.push('perfect_session');
  }
  if (correct.length >= 10 && correct.filter(e => e.seconds <= 1.5).length >= 8) {
    out.push('speed_demon');
  }
  if (maxQuestions > 0 && questionsAnswered >= maxQuestions && accuracyOf(entries) >= 0.9) {
    out.push('flawless_sprint');
  }
  if (longestStreak >= 15) {
    out.push('on_fire');
  }
  const firstHalf = entries.slice(0, Math.floor(entries.length / 2));
  if (firstHalf.filter(isMiss).length >= 3 && closingStreak(entries) >= 8) {
    out.push('comeback');
  }
  // A clean multi-string round that touched every string of the instrument.
  const stringsSeen = new Set(entries.filter(e => e.correct !== null).map(e => e.string));
  if (
    instrument.stringCount > 1
    && stringsSeen.size === instrument.stringCount
    && questionsAnswered >= instrument.stringCount * 2
    && accuracyOf(entries) >= 0.9
  ) {
    out.push('every_string');
  }
  return out;
}

// Distinct practice dates (YYYY-MM-DD), ascending — from rows that carry a
// `createdAt` (older rows can't be placed on the timeline).
function practiceDates(entries: HistoryEntry[]): string[] {
  return dailyStats(entries).map(d => d.date);
}

// Largest number of distinct dates falling inside any `windowDays`-long window.
function maxDatesInWindow(dates: string[], windowDays = 7): number {
  const ms = windowDays * 86_400_000;
  let best = 0;
  for (let i = 0; i < dates.length; i++) {
    const start = Date.parse(`${dates[i]}T00:00:00Z`);
    let count = 0;
    for (let j = i; j < dates.length; j++) {
      if (Date.parse(`${dates[j]}T00:00:00Z`) - start < ms) count++;
      else break;
    }
    if (count > best) best = count;
  }
  return best;
}

function stringStats(entries: HistoryEntry[], stringNum: number): { count: number; accuracy: number } {
  const rows = entries.filter(e => e.string === stringNum);
  return { count: rows.length, accuracy: accuracyOf(rows) };
}

function meanAccuracy(days: { accuracy: number }[]): number {
  if (days.length === 0) return 0;
  return days.reduce((s, d) => s + d.accuracy, 0) / days.length;
}

export function evaluateLifetime(l: LifetimeSnapshot): BadgeId[] {
  const { instrumentEntries, allEntries, instrument } = l;
  const out: BadgeId[] = [];

  // ── Fretboard-shape badges — current instrument only ──────────────────────
  const stringMastered: string[] = [];
  for (let n = 1; n <= instrument.stringCount; n++) {
    const { count, accuracy } = stringStats(instrumentEntries, n);
    if (count >= 40 && accuracy >= 0.9) {
      const id = `string_master_s${n}` as BadgeId;
      out.push(id);
      stringMastered.push(id);
    } else if (isEarned(`string_master_s${n}` as BadgeId, instrument.id)) {
      stringMastered.push(`string_master_s${n}`);
    }
  }
  if (stringMastered.length === instrument.stringCount && instrument.stringCount > 0) {
    out.push('string_master_all');
  }

  const frets = new Set(instrumentEntries.map(e => e.fret));
  let fullNeck = true;
  for (let f = 0; f <= instrument.maxFret; f++) {
    if (!frets.has(f)) { fullNeck = false; break; }
  }
  if (fullNeck && instrumentEntries.length > 0) out.push('full_neck');

  const upper = instrumentEntries.filter(e => e.fret >= 12);
  if (upper.length >= 40 && accuracyOf(upper) >= 0.85) out.push('both_ends');

  if (instrument.id === 'bass') {
    const lowE = stringStats(instrumentEntries, 4); // bass string 4 = low E
    if (lowE.count >= 40 && lowE.accuracy >= 0.9) out.push('low_end');
  }

  // ── Player-progress badges — every instrument's history combined ──────────
  const days = dailyStats(allEntries);
  const streak = practiceStreak(days);
  const totals = lifetimeTotals(allEntries, days);

  if (maxDatesInWindow(practiceDates(allEntries)) >= 5) out.push('week_warrior');
  if (streak.longest >= 7) out.push('dedicated');
  if (totals.totalQuestions >= 100) out.push('century');
  if (totals.totalQuestions >= 1000) out.push('marathoner');
  if (totals.totalQuestions >= 200 && totals.accuracy >= 0.85) out.push('sharpshooter');
  if (totals.totalQuestions >= 200 && totals.avgSeconds > 0 && totals.avgSeconds < 2) {
    out.push('quick_read');
  }

  if (days.length >= 10) {
    const gain = meanAccuracy(days.slice(-5)) - meanAccuracy(days.slice(0, 5));
    if (gain >= 0.2) out.push('most_improved');
  }

  // Cross-instrument capstone — Full String Master on guitar and on bass.
  if (isEarned('string_master_all', 'guitar') && isEarned('string_master_all', 'bass')) {
    out.push('doubling_up');
  }

  return out;
}

// Current / target for a locked tile's thin progress bar. Null → no bar.
export function badgeProgress(
  id: BadgeId,
  l: LifetimeSnapshot,
): { current: number; target: number } | null {
  const { instrumentEntries, allEntries, instrument } = l;

  if (id.startsWith('string_master_s')) {
    const n = Number(id.slice('string_master_s'.length));
    return { current: Math.min(stringStats(instrumentEntries, n).count, 40), target: 40 };
  }
  if (id === 'string_master_all') {
    let earned = 0;
    for (let n = 1; n <= instrument.stringCount; n++) {
      if (isEarned(`string_master_s${n}` as BadgeId, instrument.id)) earned++;
    }
    return { current: earned, target: instrument.stringCount };
  }
  if (id === 'full_neck') {
    const frets = new Set(instrumentEntries.map(e => e.fret));
    let seen = 0;
    for (let f = 0; f <= instrument.maxFret; f++) if (frets.has(f)) seen++;
    return { current: seen, target: instrument.maxFret + 1 };
  }
  if (id === 'both_ends') {
    return { current: Math.min(instrumentEntries.filter(e => e.fret >= 12).length, 40), target: 40 };
  }
  if (id === 'low_end') {
    return { current: Math.min(stringStats(instrumentEntries, 4).count, 40), target: 40 };
  }
  if (id === 'doubling_up') {
    let n = 0;
    if (isEarned('string_master_all', 'guitar')) n++;
    if (isEarned('string_master_all', 'bass')) n++;
    return { current: n, target: 2 };
  }

  const days = dailyStats(allEntries);
  const totals = lifetimeTotals(allEntries, days);
  switch (id) {
    case 'week_warrior':
      return { current: Math.min(maxDatesInWindow(days.map(d => d.date)), 5), target: 5 };
    case 'dedicated':
      return { current: Math.min(practiceStreak(days).longest, 7), target: 7 };
    case 'century':
      return { current: Math.min(totals.totalQuestions, 100), target: 100 };
    case 'marathoner':
      return { current: Math.min(totals.totalQuestions, 1000), target: 1000 };
    case 'sharpshooter':
    case 'quick_read':
      return { current: Math.min(totals.totalQuestions, 200), target: 200 };
    default:
      return null;
  }
}
