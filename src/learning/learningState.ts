// ── learningState.ts — the Premium Teacher's persisted model (local) ─────
//
// localStorage is the immediate / offline source of truth for the Teacher,
// exactly like the rest of the app (history, settings, badges). The cloud
// layer (`learningSync.ts`) sits on top and is best-effort.
//
// One `localStorage['learningState']` key holds a map of instrument id →
// per-instrument state, so a guitar learner and a bass learner never mix:
//
//   { version, instruments: { guitar: {...}, bass: {...} } }
//
// Per instrument we keep only what P2 needs:
//   • srs   — NoteItem id → SrsItem (the Leitner schedule; see srs.ts)
//   • daily — today's prescribed goal: date, target, completed
//   • updatedAt
//
// This module is pure model + persistence. It does NOT import the sync layer
// (mirrors how `badges.ts` stays independent of `badgeSync.ts`); the hook
// that uses it triggers the cloud push after a local save.

import {
  reviewSrsItem,
  getOrCreate,
  mergeSrsMaps,
  type SrsItem,
  type SrsMap,
} from './srs';
import { noteItemId } from './noteItem';

export const LEARNING_STORAGE_KEY = 'learningState';

// One Teacher session is roughly this many answered items; the daily goal is
// "do one session".
export const DEFAULT_DAILY_TARGET = 12;

export interface DailyGoal {
  /** Local calendar day, `YYYY-MM-DD`. */
  dateISO: string;
  /** Teacher items to answer today. */
  target: number;
  /** Teacher items answered today so far. */
  completed: number;
}

export interface InstrumentLearningState {
  srs: SrsMap;
  daily: DailyGoal;
  /** Epoch ms of the last Teacher answer, for merge tie-breaking. */
  lastAnswerAt: number;
  /** ISO timestamp of the last change. */
  updatedAt: string;
}

export interface LearningState {
  version: 1;
  instruments: Record<string, InstrumentLearningState>;
}

// ── Local day helper ───────────────────────────────────────────────────
export function localDayISO(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function freshDaily(now: number, target = DEFAULT_DAILY_TARGET): DailyGoal {
  return { dateISO: localDayISO(now), target, completed: 0 };
}

export function emptyInstrumentState(now: number): InstrumentLearningState {
  return {
    srs: {},
    daily: freshDaily(now),
    lastAnswerAt: 0,
    updatedAt: new Date(now).toISOString(),
  };
}

function emptyState(): LearningState {
  return { version: 1, instruments: {} };
}

// ── Normalisation (untrusted input from storage / cloud) ────────────────

function normalizeSrsItem(id: string, raw: unknown): SrsItem | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const bucket = Math.max(0, Math.round(num(r.bucket, 0)));
  return {
    itemId: id,
    bucket,
    dueAt: num(r.dueAt, 0),
    lastReviewedAt: num(r.lastReviewedAt, 0),
    reps: Math.max(0, Math.round(num(r.reps, 0))),
    lapses: Math.max(0, Math.round(num(r.lapses, 0))),
  };
}

function normalizeDaily(raw: unknown, now: number): DailyGoal {
  if (raw == null || typeof raw !== 'object') return freshDaily(now);
  const r = raw as Record<string, unknown>;
  const dateISO = typeof r.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateISO)
    ? r.dateISO
    : localDayISO(now);
  const target =
    typeof r.target === 'number' && r.target > 0 ? Math.round(r.target) : DEFAULT_DAILY_TARGET;
  const completed =
    typeof r.completed === 'number' && r.completed >= 0 ? Math.round(r.completed) : 0;
  return { dateISO, target, completed };
}

export function normalizeInstrumentState(
  raw: unknown,
  now: number,
): InstrumentLearningState {
  if (raw == null || typeof raw !== 'object') return emptyInstrumentState(now);
  const r = raw as Record<string, unknown>;
  const srs: SrsMap = {};
  if (r.srs != null && typeof r.srs === 'object') {
    for (const [id, v] of Object.entries(r.srs as Record<string, unknown>)) {
      const item = normalizeSrsItem(id, v);
      if (item) srs[id] = item;
    }
  }
  return {
    srs,
    daily: normalizeDaily(r.daily, now),
    lastAnswerAt:
      typeof r.lastAnswerAt === 'number' && Number.isFinite(r.lastAnswerAt)
        ? r.lastAnswerAt
        : 0,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(now).toISOString(),
  };
}

export function normalizeLearningState(raw: unknown, now: number): LearningState {
  if (raw == null || typeof raw !== 'object') return emptyState();
  const r = raw as Record<string, unknown>;
  const out = emptyState();
  const instruments = r.instruments;
  if (instruments != null && typeof instruments === 'object') {
    for (const [id, v] of Object.entries(instruments as Record<string, unknown>)) {
      out.instruments[id] = normalizeInstrumentState(v, now);
    }
  }
  return out;
}

// ── Load / save (localStorage) ─────────────────────────────────────────

export function loadLearningState(now: number = Date.now()): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return emptyState();
    return normalizeLearningState(JSON.parse(raw), now);
  } catch {
    return emptyState();
  }
}

/** Write the whole state to localStorage. Best-effort. */
export function saveLearningStateLocal(state: LearningState): void {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — best-effort only */
  }
}

export function getInstrumentState(
  state: LearningState,
  instrumentId: string,
  now: number,
): InstrumentLearningState {
  return state.instruments[instrumentId] ?? emptyInstrumentState(now);
}

export function withInstrumentState(
  state: LearningState,
  instrumentId: string,
  next: InstrumentLearningState,
): LearningState {
  return {
    version: 1,
    instruments: { ...state.instruments, [instrumentId]: next },
  };
}

// ── Daily goal roll-over ───────────────────────────────────────────────
//
// If the stored day is not today, start a fresh goal for today. Pure — the
// caller decides whether to persist the result.
export function rollDailyGoal(
  daily: DailyGoal,
  now: number,
  target: number = DEFAULT_DAILY_TARGET,
): DailyGoal {
  const today = localDayISO(now);
  if (daily.dateISO === today) return daily;
  return { dateISO: today, target, completed: 0 };
}

export function isDailyGoalComplete(daily: DailyGoal): boolean {
  return daily.completed >= daily.target;
}

// ── Apply one Teacher answer ──────────────────────────────────────────
//
// Updates the position's SRS schedule and bumps today's completed count.
// `correct` folds a timeout in as incorrect (the caller passes
// `entry.correct === true`). Pure.
export function recordTeacherAnswer(
  st: InstrumentLearningState,
  pos: { string: number; fret: number },
  correct: boolean,
  now: number,
): InstrumentLearningState {
  const id = noteItemId(pos.string, pos.fret);
  const srsItem = getOrCreate(st.srs, id, now);
  const nextItem = reviewSrsItem(srsItem, correct, now);
  const daily = rollDailyGoal(st.daily, now, st.daily.target);
  return {
    srs: { ...st.srs, [id]: nextItem },
    daily: { ...daily, completed: daily.completed + 1 },
    lastAnswerAt: now,
    updatedAt: new Date(now).toISOString(),
  };
}

// ── Merge (per-instrument, per-item) for sync ─────────────────────────
//
// NOT last-writer-wins: SRS maps merge item-by-item (`mergeSrsMaps`), so a
// review made on one device is never dropped because the other device wrote
// the blob more recently. The daily goal is a single small record — for the
// SAME day, keep the higher `completed` and `target` (progress only moves
// forward within a day); for different days, the later date wins.
export function mergeDailyGoal(a: DailyGoal, b: DailyGoal): DailyGoal {
  if (a.dateISO === b.dateISO) {
    return {
      dateISO: a.dateISO,
      target: Math.max(a.target, b.target),
      completed: Math.max(a.completed, b.completed),
    };
  }
  return a.dateISO >= b.dateISO ? a : b;
}

export function mergeInstrumentState(
  a: InstrumentLearningState,
  b: InstrumentLearningState,
): InstrumentLearningState {
  return {
    srs: mergeSrsMaps(a.srs, b.srs),
    daily: mergeDailyGoal(a.daily, b.daily),
    lastAnswerAt: Math.max(a.lastAnswerAt, b.lastAnswerAt),
    updatedAt: a.updatedAt >= b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

export function mergeLearningState(a: LearningState, b: LearningState): LearningState {
  const out: LearningState = { version: 1, instruments: { ...a.instruments } };
  for (const [id, st] of Object.entries(b.instruments)) {
    const cur = out.instruments[id];
    out.instruments[id] = cur ? mergeInstrumentState(cur, st) : st;
  }
  return out;
}
