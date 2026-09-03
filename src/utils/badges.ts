// Achievements ("badges"). Three kinds:
//
//  • Session badges  — evaluated at game-end from that round's score/streak and
//    its `HistoryEntry` rows. They are NOT back-computed from flat history
//    (sessions aren't delimited in storage), so they only ever accrue going
//    forward.
//  • Lifetime badges — pure functions over play history, re-checked at game-end
//    AND whenever the Badges screen opens, so existing history retroactively
//    unlocks them.
//  • Role badges — reflect the account (e.g. Admin), never evaluated from
//    history, and carry no levels.
//
// Every session/lifetime badge is a *family* with up to four ordered levels —
// Bronze / Silver / Gold, and Platinum where the milestone genuinely earns a
// fourth rung (Dedicated, Century, Marathoner). A player keeps the family the
// moment Bronze is reached and keeps progressing through the same tile.
//
// Storage is local-only for v1 (localStorage key `badges`), mirroring
// `stat_longestStreakEver`. Cloud write-through is a later phase.
//
// Instrument scoping has two layers (unchanged from the binary-badge design):
//  • The *store key* — string/fret-shaped badges are earned per instrument
//    (`"{badgeId}@{instrumentId}"`); everything else uses the bare `badgeId`.
//    `awardBadge` / `isEarned` route this from the id. A level beyond Bronze
//    appends `::{tier}` to whichever of those two shapes applies, so every
//    badge already earned under the pre-levels system keeps meaning unchanged
//    as its Bronze record — no migration.
//  • The *evaluation input* — badges that measure the fretboard
//    (String Master, Full String Master, Neck Runner, Both Ends, Low End)
//    look only at the current instrument's history; badges that measure the
//    player (Century, Marathoner, streaks, accuracy, improvement…) look at
//    every instrument's history combined, so bass practice counts toward them
//    the moment it happens.

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

export type BadgeKind = 'session' | 'lifetime' | 'role';

// Bronze/Silver/Gold are levels of one achievement, not a fixed badge "type" —
// a Session family can reach Gold exactly like a Lifetime one. Platinum exists
// only on the handful of families big enough to earn a fourth rung.
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export const TIERS: readonly Tier[] = ['bronze', 'silver', 'gold', 'platinum'];
export const TIER_LABEL: Record<Tier, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

export interface LevelDef {
  tier: Tier;
  blurb: string; // this tier's exact earning condition
}

export interface BadgeDef {
  id: BadgeId;
  name: string;              // stable family display name, independent of tier
  kind: BadgeKind;
  instrumentScoped: boolean; // true → stored/earned per instrument
  onlyInstrument?: InstrumentId; // badge exists only for this instrument
  levels: LevelDef[];        // ordered Bronze→Platinum; empty for role badges
  blurb?: string;            // role badges only (levels is empty for them)
}

function tierIndex(t: Tier): number {
  return TIERS.indexOf(t);
}

export function tierAtLeast(t: Tier | null, min: Tier): boolean {
  return t !== null && tierIndex(t) >= tierIndex(min);
}

// ── Definitions ───────────────────────────────────────────────────────────────
// Display order is this array's order; the per-string String Master tiles are
// spliced in just before `string_master_all` by `badgeList`.
export const FIXED_BADGES: readonly BadgeDef[] = [
  // Session
  {
    id: 'perfect_session', name: 'Perfect Session', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Answer 10+ questions in a round with no mistakes at all.' },
      { tier: 'silver', blurb: '25+ questions in a round, still zero mistakes.' },
      { tier: 'gold', blurb: '50+ questions in a round, still zero mistakes — a full clean run.' },
    ],
  },
  {
    id: 'speed_demon', name: 'Speed Demon', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Get 10+ correct answers in a round, at least 8 of them under 1.5s.' },
      { tier: 'silver', blurb: '20+ correct answers, at least 16 of them under 1.5s.' },
      { tier: 'gold', blurb: '40+ correct answers, at least 32 of them under 1.2s.' },
    ],
  },
  {
    id: 'flawless_sprint', name: 'Flawless Sprint', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Finish a whole round at 90% accuracy or better.' },
      { tier: 'silver', blurb: 'Finish a whole round at 95% accuracy or better.' },
      { tier: 'gold', blurb: 'Finish a whole round at 100% accuracy.' },
    ],
  },
  {
    id: 'on_fire', name: 'On Fire', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Reach a streak of 15 in a single round.' },
      { tier: 'silver', blurb: 'Reach a streak of 20 in a single round.' },
      { tier: 'gold', blurb: 'Reach a streak of 30 in a single round.' },
    ],
  },
  {
    id: 'comeback', name: 'Comeback', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.' },
      { tier: 'silver', blurb: 'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.' },
      { tier: 'gold', blurb: 'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.' },
    ],
  },
  {
    id: 'every_string', name: 'Every String', kind: 'session', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Finish a round that visited every string: 2x that many questions, 90% accuracy.' },
      { tier: 'silver', blurb: 'Visited every string: 4x that many questions, 90% accuracy.' },
      { tier: 'gold', blurb: 'Visited every string: 6x that many questions, 95% accuracy.' },
    ],
  },
  // Per-instrument (fretboard-shape)
  {
    id: 'string_master_all', name: 'Full String Master', kind: 'lifetime', instrumentScoped: true,
    levels: [
      { tier: 'bronze', blurb: 'Earn String Master — Bronze on every string of this instrument.' },
      { tier: 'silver', blurb: 'Earn String Master — Silver on every string.' },
      { tier: 'gold', blurb: 'Earn String Master — Gold on every string.' },
    ],
  },
  {
    id: 'full_neck', name: 'Neck Runner', kind: 'lifetime', instrumentScoped: true,
    levels: [
      { tier: 'bronze', blurb: 'Answer at least one question on every fret of the neck.' },
      { tier: 'silver', blurb: 'Answer at least 3 questions on every fret of the neck.' },
      { tier: 'gold', blurb: 'Answer at least 5 questions on every fret of the neck.' },
    ],
  },
  {
    id: 'both_ends', name: 'Both Ends', kind: 'lifetime', instrumentScoped: true,
    levels: [
      { tier: 'bronze', blurb: 'Answer 40+ questions above the 12th fret at 85% accuracy or better.' },
      { tier: 'silver', blurb: '100+ questions above the 12th fret at 88% accuracy or better.' },
      { tier: 'gold', blurb: '200+ questions above the 12th fret at 92% accuracy or better.' },
    ],
  },
  {
    id: 'low_end', name: 'Low End', kind: 'lifetime', instrumentScoped: true, onlyInstrument: 'bass',
    levels: [
      { tier: 'bronze', blurb: 'Answer 40+ questions on the bass low-E string at 90% accuracy or better.' },
      { tier: 'silver', blurb: '100+ questions on the low-E string at 93% accuracy or better.' },
      { tier: 'gold', blurb: '200+ questions on the low-E string at 96% accuracy or better.' },
    ],
  },
  // Global player
  {
    id: 'week_warrior', name: 'Week Warrior', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Practise on 5 separate days within a single 7-day window.' },
      { tier: 'silver', blurb: '6 separate days within a single 7-day window.' },
      { tier: 'gold', blurb: 'All 7 days within a single 7-day window — a perfect week.' },
    ],
  },
  {
    id: 'dedicated', name: 'Dedicated', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Build a run of 7 consecutive practice days.' },
      { tier: 'silver', blurb: '14 consecutive practice days.' },
      { tier: 'gold', blurb: '30 consecutive practice days.' },
      { tier: 'platinum', blurb: '60 consecutive practice days.' },
    ],
  },
  {
    id: 'century', name: 'Century', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Answer 100 questions all-time, across every instrument.' },
      { tier: 'silver', blurb: '250 questions all-time.' },
      { tier: 'gold', blurb: '500 questions all-time.' },
      { tier: 'platinum', blurb: '1,000 questions all-time.' },
    ],
  },
  {
    id: 'marathoner', name: 'Marathoner', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Answer 1,000 questions all-time, across every instrument.' },
      { tier: 'silver', blurb: '2,500 questions all-time.' },
      { tier: 'gold', blurb: '5,000 questions all-time.' },
      { tier: 'platinum', blurb: '10,000 questions all-time.' },
    ],
  },
  {
    id: 'sharpshooter', name: 'Sharpshooter', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Hold 85% accuracy over at least 200 questions, across every instrument.' },
      { tier: 'silver', blurb: '88% accuracy over at least 500 questions.' },
      { tier: 'gold', blurb: '92% accuracy over at least 1,000 questions.' },
    ],
  },
  {
    id: 'quick_read', name: 'Quick Read', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Hold an average answer time under 2.0s over 200+ questions.' },
      { tier: 'silver', blurb: 'Under 1.6s over 500+ questions.' },
      { tier: 'gold', blurb: 'Under 1.3s over 1,000+ questions.' },
    ],
  },
  {
    id: 'most_improved', name: 'Most Improved', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.' },
      { tier: 'silver', blurb: 'Over 15+ practice days, lift your accuracy by 30 points.' },
      { tier: 'gold', blurb: 'Over 20+ practice days, lift your accuracy by 40 points.' },
    ],
  },
  {
    id: 'doubling_up', name: 'Doubling Up', kind: 'lifetime', instrumentScoped: false,
    levels: [
      { tier: 'bronze', blurb: 'Earn String Master on every string of both guitar and bass.' },
      { tier: 'silver', blurb: 'Earn Full String Master — Silver on both guitar and bass.' },
      { tier: 'gold', blurb: 'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.' },
    ],
  },
  // Role
  {
    id: 'admin', name: 'Admin', kind: 'role', instrumentScoped: false, levels: [],
    blurb: 'Granted to app administrators — read every Feedback board post, not just your own.',
  },
];

export function stringMasterBadges(instrument: InstrumentConfig): BadgeDef[] {
  return Array.from({ length: instrument.stringCount }, (_, i) => {
    const n = i + 1;
    const label = instrument.stringLabels[n] ?? `String ${n}`;
    return {
      id: `string_master_s${n}` as BadgeId,
      name: `String Master · ${label}`,
      kind: 'lifetime' as const,
      instrumentScoped: true,
      levels: [
        { tier: 'bronze' as const, blurb: `Answer 40+ questions on ${label} at 90% accuracy or better.` },
        { tier: 'silver' as const, blurb: `100+ questions on ${label} at 92% accuracy or better.` },
        { tier: 'gold' as const, blurb: `200+ questions on ${label} at 95% accuracy or better.` },
      ],
    };
  });
}

// The full ordered badge set for one instrument: per-string String Master
// tiles inserted before `string_master_all`.
export function badgeList(instrument: InstrumentConfig): BadgeDef[] {
  const out: BadgeDef[] = [];
  for (const def of FIXED_BADGES) {
    if (def.onlyInstrument && def.onlyInstrument !== instrument.id) continue;
    if (def.id === 'string_master_all') {
      out.push(...stringMasterBadges(instrument));
    }
    out.push(def);
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

// Level 1 (Bronze) keeps the exact key shape the pre-levels system used, so
// every badge already earned transfers untouched as "Bronze earned" — no
// migration. Silver/Gold/Platinum append `::{tier}` to that same base.
function storeKey(id: BadgeId, instrumentId?: string, tier: Tier = 'bronze'): string {
  const base = isInstrumentScoped(id) && instrumentId ? `${id}@${instrumentId}` : id;
  return tier === 'bronze' ? base : `${base}::${tier}`;
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

export function isEarned(id: BadgeId, instrumentId?: string, tier: Tier = 'bronze'): boolean {
  return storeKey(id, instrumentId, tier) in loadBadges();
}

export function earnedAt(id: BadgeId, instrumentId?: string, tier: Tier = 'bronze'): string | null {
  return loadBadges()[storeKey(id, instrumentId, tier)]?.earnedAt ?? null;
}

// Writes `earnedAt` only on the first earn; returns true only when NEWLY
// earned, so a "new badge" celebration never repeats.
export function awardBadge(id: BadgeId, instrumentId?: string, tier: Tier = 'bronze'): boolean {
  const store = loadBadges();
  const k = storeKey(id, instrumentId, tier);
  if (store[k]) return false;
  store[k] = { earnedAt: new Date().toISOString() };
  saveBadges(store);
  return true;
}

// The highest tier actually persisted for a family, or null if none yet.
export function earnedTier(id: BadgeId, instrumentId?: string): Tier | null {
  let best: Tier | null = null;
  for (const t of TIERS) {
    if (isEarned(id, instrumentId, t)) best = t;
  }
  return best;
}

// Awards every level up to and including `reachedTier` (idempotent — already-
// earned levels are skipped), so a retroactive jump straight to Gold still
// stamps Bronze/Silver too. Returns the tiers newly awarded this call, in
// ascending order — the caller celebrates only the last (highest) one.
export function awardFamilyUpTo(
  id: BadgeId,
  instrumentId: string | undefined,
  reachedTier: Tier,
  familyLevels: readonly LevelDef[],
): Tier[] {
  const newly: Tier[] = [];
  for (const level of familyLevels) {
    if (tierIndex(level.tier) > tierIndex(reachedTier)) break;
    if (awardBadge(id, instrumentId, level.tier)) newly.push(level.tier);
  }
  return newly;
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

// The "rough start, strong finish" shape, bounded so it stays meaningful
// regardless of how long an Auto Advance chain runs: misses are only counted
// in a fixed early window (not "the first half of everything"), and the
// recovery streak starts immediately after that window's last miss — wherever
// it lands — rather than requiring it to reach all the way to the round's end.
function comebackRecovery(entries: HistoryEntry[], windowSize = 20): { misses: number; streak: number } {
  const window = entries.slice(0, Math.min(windowSize, entries.length));
  const misses = window.filter(isMiss).length;
  let lastMissIdx = -1;
  for (let i = window.length - 1; i >= 0; i--) {
    if (isMiss(window[i])) { lastMissIdx = i; break; }
  }
  if (lastMissIdx < 0) return { misses, streak: 0 };
  let streak = 0;
  for (let i = lastMissIdx + 1; i < entries.length; i++) {
    if (entries[i].correct === true) streak++;
    else break;
  }
  return { misses, streak };
}

export function evaluateSession(s: SessionSnapshot): Partial<Record<BadgeId, Tier>> {
  const { entries, questionsAnswered, longestStreak, maxQuestions, instrument } = s;
  const out: Partial<Record<BadgeId, Tier>> = {};
  const correct = entries.filter(e => e.correct === true);

  if (entries.length > 0 && entries.every(e => e.correct === true)) {
    if (questionsAnswered >= 50) out.perfect_session = 'gold';
    else if (questionsAnswered >= 25) out.perfect_session = 'silver';
    else if (questionsAnswered >= 10) out.perfect_session = 'bronze';
  }

  const fast15 = correct.filter(e => e.seconds <= 1.5).length;
  const fast12 = correct.filter(e => e.seconds <= 1.2).length;
  if (correct.length >= 40 && fast12 >= 32) out.speed_demon = 'gold';
  else if (correct.length >= 20 && fast15 >= 16) out.speed_demon = 'silver';
  else if (correct.length >= 10 && fast15 >= 8) out.speed_demon = 'bronze';

  if (maxQuestions > 0 && questionsAnswered >= maxQuestions) {
    const acc = accuracyOf(entries);
    if (acc >= 1) out.flawless_sprint = 'gold';
    else if (acc >= 0.95) out.flawless_sprint = 'silver';
    else if (acc >= 0.9) out.flawless_sprint = 'bronze';
  }

  if (longestStreak >= 30) out.on_fire = 'gold';
  else if (longestStreak >= 20) out.on_fire = 'silver';
  else if (longestStreak >= 15) out.on_fire = 'bronze';

  const { misses: slumpMisses, streak: recoveryStreak } = comebackRecovery(entries);
  if (slumpMisses >= 8 && recoveryStreak >= 18) out.comeback = 'gold';
  else if (slumpMisses >= 5 && recoveryStreak >= 12) out.comeback = 'silver';
  else if (slumpMisses >= 3 && recoveryStreak >= 8) out.comeback = 'bronze';

  // A clean multi-string round that touched every string of the instrument —
  // accuracy is over the whole round's entries, same as the other axes here.
  const stringsSeen = new Set(entries.filter(e => e.correct !== null).map(e => e.string));
  if (instrument.stringCount > 1 && stringsSeen.size === instrument.stringCount) {
    const acc = accuracyOf(entries);
    if (questionsAnswered >= instrument.stringCount * 6 && acc >= 0.95) out.every_string = 'gold';
    else if (questionsAnswered >= instrument.stringCount * 4 && acc >= 0.9) out.every_string = 'silver';
    else if (questionsAnswered >= instrument.stringCount * 2 && acc >= 0.9) out.every_string = 'bronze';
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

// Per-fret answer counts, current instrument only — Neck Runner's tiers are
// "visited this fret N times", not just "visited once".
function fretVisitCounts(entries: HistoryEntry[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const e of entries) m.set(e.fret, (m.get(e.fret) ?? 0) + 1);
  return m;
}

function everyFretAtLeast(visits: Map<number, number>, instrument: InstrumentConfig, minVisits: number): boolean {
  for (let f = 0; f <= instrument.maxFret; f++) {
    if ((visits.get(f) ?? 0) < minVisits) return false;
  }
  return true;
}

function meanAccuracy(days: { accuracy: number }[]): number {
  if (days.length === 0) return 0;
  return days.reduce((s, d) => s + d.accuracy, 0) / days.length;
}

export function evaluateLifetime(l: LifetimeSnapshot): Partial<Record<BadgeId, Tier>> {
  const { instrumentEntries, allEntries, instrument } = l;
  const out: Partial<Record<BadgeId, Tier>> = {};

  // ── Fretboard-shape badges — current instrument only ──────────────────────
  const stringTiers: (Tier | null)[] = [];
  for (let n = 1; n <= instrument.stringCount; n++) {
    const { count, accuracy } = stringStats(instrumentEntries, n);
    let tier: Tier | null = null;
    if (count >= 200 && accuracy >= 0.95) tier = 'gold';
    else if (count >= 100 && accuracy >= 0.92) tier = 'silver';
    else if (count >= 40 && accuracy >= 0.9) tier = 'bronze';
    stringTiers.push(tier);
    if (tier) out[`string_master_s${n}` as BadgeId] = tier;
  }
  // Full String Master is derived, not its own numeric threshold: its tier is
  // the weakest-linked string's tier, so "Gold" only means every string is Gold.
  if (stringTiers.length > 0 && stringTiers.every((t): t is Tier => t !== null)) {
    out.string_master_all = stringTiers.reduce((min, t) => (tierIndex(t) < tierIndex(min) ? t : min));
  }

  const visits = fretVisitCounts(instrumentEntries);
  if (instrumentEntries.length > 0) {
    if (everyFretAtLeast(visits, instrument, 5)) out.full_neck = 'gold';
    else if (everyFretAtLeast(visits, instrument, 3)) out.full_neck = 'silver';
    else if (everyFretAtLeast(visits, instrument, 1)) out.full_neck = 'bronze';
  }

  const upper = instrumentEntries.filter(e => e.fret >= 12);
  const upperAcc = accuracyOf(upper);
  if (upper.length >= 200 && upperAcc >= 0.92) out.both_ends = 'gold';
  else if (upper.length >= 100 && upperAcc >= 0.88) out.both_ends = 'silver';
  else if (upper.length >= 40 && upperAcc >= 0.85) out.both_ends = 'bronze';

  if (instrument.id === 'bass') {
    const lowE = stringStats(instrumentEntries, 4); // bass string 4 = low E
    if (lowE.count >= 200 && lowE.accuracy >= 0.96) out.low_end = 'gold';
    else if (lowE.count >= 100 && lowE.accuracy >= 0.93) out.low_end = 'silver';
    else if (lowE.count >= 40 && lowE.accuracy >= 0.9) out.low_end = 'bronze';
  }

  // ── Player-progress badges — every instrument's history combined ──────────
  const days = dailyStats(allEntries);
  const streak = practiceStreak(days);
  const totals = lifetimeTotals(allEntries, days);
  const bestWindow = maxDatesInWindow(practiceDates(allEntries));

  if (bestWindow >= 7) out.week_warrior = 'gold';
  else if (bestWindow >= 6) out.week_warrior = 'silver';
  else if (bestWindow >= 5) out.week_warrior = 'bronze';

  if (streak.longest >= 60) out.dedicated = 'platinum';
  else if (streak.longest >= 30) out.dedicated = 'gold';
  else if (streak.longest >= 14) out.dedicated = 'silver';
  else if (streak.longest >= 7) out.dedicated = 'bronze';

  if (totals.totalQuestions >= 1000) out.century = 'platinum';
  else if (totals.totalQuestions >= 500) out.century = 'gold';
  else if (totals.totalQuestions >= 250) out.century = 'silver';
  else if (totals.totalQuestions >= 100) out.century = 'bronze';

  if (totals.totalQuestions >= 10000) out.marathoner = 'platinum';
  else if (totals.totalQuestions >= 5000) out.marathoner = 'gold';
  else if (totals.totalQuestions >= 2500) out.marathoner = 'silver';
  else if (totals.totalQuestions >= 1000) out.marathoner = 'bronze';

  if (totals.totalQuestions >= 1000 && totals.accuracy >= 0.92) out.sharpshooter = 'gold';
  else if (totals.totalQuestions >= 500 && totals.accuracy >= 0.88) out.sharpshooter = 'silver';
  else if (totals.totalQuestions >= 200 && totals.accuracy >= 0.85) out.sharpshooter = 'bronze';

  if (totals.totalQuestions >= 1000 && totals.avgSeconds > 0 && totals.avgSeconds < 1.3) out.quick_read = 'gold';
  else if (totals.totalQuestions >= 500 && totals.avgSeconds > 0 && totals.avgSeconds < 1.6) out.quick_read = 'silver';
  else if (totals.totalQuestions >= 200 && totals.avgSeconds > 0 && totals.avgSeconds < 2) out.quick_read = 'bronze';

  if (days.length >= 10) {
    const gain = meanAccuracy(days.slice(-5)) - meanAccuracy(days.slice(0, 5));
    if (days.length >= 20 && gain >= 0.4) out.most_improved = 'gold';
    else if (days.length >= 15 && gain >= 0.3) out.most_improved = 'silver';
    else if (gain >= 0.2) out.most_improved = 'bronze';
  }

  // Cross-instrument capstone — reads only what's already persisted for each
  // instrument (not `out`, which only reflects the current one), same as the
  // pre-levels version: completing the second instrument's Full String Master
  // unlocks Doubling Up the next time badges are evaluated, not mid-pass.
  const gFSM = earnedTier('string_master_all', 'guitar');
  const bFSM = earnedTier('string_master_all', 'bass');
  if (gFSM && bFSM) {
    const gNeck = earnedTier('full_neck', 'guitar');
    const bNeck = earnedTier('full_neck', 'bass');
    if (
      tierAtLeast(gFSM, 'gold') && tierAtLeast(bFSM, 'gold')
      && tierAtLeast(gNeck, 'gold') && tierAtLeast(bNeck, 'gold')
    ) {
      out.doubling_up = 'gold';
    } else if (tierAtLeast(gFSM, 'silver') && tierAtLeast(bFSM, 'silver')) {
      out.doubling_up = 'silver';
    } else {
      out.doubling_up = 'bronze';
    }
  }

  return out;
}

// Current / target for a locked tile's thin progress bar, aimed at the given
// (next unearned) tier. Null → no bar for this badge.
export function badgeProgress(
  id: BadgeId,
  l: LifetimeSnapshot,
  nextTier: Tier,
): { current: number; target: number } | null {
  const { instrumentEntries, allEntries, instrument } = l;
  const countTarget = (bronze: number, silver: number, gold: number) =>
    nextTier === 'gold' ? gold : nextTier === 'silver' ? silver : bronze;

  if (id.startsWith('string_master_s')) {
    const n = Number(id.slice('string_master_s'.length));
    const target = countTarget(40, 100, 200);
    return { current: Math.min(stringStats(instrumentEntries, n).count, target), target };
  }
  if (id === 'string_master_all') {
    let count = 0;
    for (let n = 1; n <= instrument.stringCount; n++) {
      if (tierAtLeast(earnedTier(`string_master_s${n}` as BadgeId, instrument.id), nextTier)) count++;
    }
    return { current: count, target: instrument.stringCount };
  }
  if (id === 'full_neck') {
    const visits = fretVisitCounts(instrumentEntries);
    const minVisits = nextTier === 'gold' ? 5 : nextTier === 'silver' ? 3 : 1;
    let seen = 0;
    for (let f = 0; f <= instrument.maxFret; f++) if ((visits.get(f) ?? 0) >= minVisits) seen++;
    return { current: seen, target: instrument.maxFret + 1 };
  }
  if (id === 'both_ends') {
    const target = countTarget(40, 100, 200);
    return { current: Math.min(instrumentEntries.filter(e => e.fret >= 12).length, target), target };
  }
  if (id === 'low_end') {
    const target = countTarget(40, 100, 200);
    return { current: Math.min(stringStats(instrumentEntries, 4).count, target), target };
  }
  if (id === 'doubling_up') {
    const gates = nextTier === 'gold'
      ? [
          tierAtLeast(earnedTier('string_master_all', 'guitar'), 'gold'),
          tierAtLeast(earnedTier('string_master_all', 'bass'), 'gold'),
          tierAtLeast(earnedTier('full_neck', 'guitar'), 'gold'),
          tierAtLeast(earnedTier('full_neck', 'bass'), 'gold'),
        ]
      : [
          tierAtLeast(earnedTier('string_master_all', 'guitar'), nextTier),
          tierAtLeast(earnedTier('string_master_all', 'bass'), nextTier),
        ];
    return { current: gates.filter(Boolean).length, target: gates.length };
  }

  const days = dailyStats(allEntries);
  const totals = lifetimeTotals(allEntries, days);
  switch (id) {
    case 'week_warrior': {
      const target = nextTier === 'gold' ? 7 : nextTier === 'silver' ? 6 : 5;
      return { current: Math.min(maxDatesInWindow(days.map(d => d.date)), target), target };
    }
    case 'dedicated': {
      const target = nextTier === 'platinum' ? 60 : nextTier === 'gold' ? 30 : nextTier === 'silver' ? 14 : 7;
      return { current: Math.min(practiceStreak(days).longest, target), target };
    }
    case 'century': {
      const target = nextTier === 'platinum' ? 1000 : nextTier === 'gold' ? 500 : nextTier === 'silver' ? 250 : 100;
      return { current: Math.min(totals.totalQuestions, target), target };
    }
    case 'marathoner': {
      const target = nextTier === 'platinum' ? 10000 : nextTier === 'gold' ? 5000 : nextTier === 'silver' ? 2500 : 1000;
      return { current: Math.min(totals.totalQuestions, target), target };
    }
    case 'sharpshooter':
    case 'quick_read': {
      const target = countTarget(200, 500, 1000);
      return { current: Math.min(totals.totalQuestions, target), target };
    }
    default:
      return null;
  }
}
