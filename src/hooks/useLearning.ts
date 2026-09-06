// ── useLearning — wires the Premium Teacher model into React ─────────────
//
// Owns the per-instrument learning state (SRS + daily goal), keeps it in
// React state, and derives the two plans the Today card needs:
//   • todayPlan     — the recommended daily session (always present for a
//                     Premium user; falls back to least-practised coverage)
//   • weakSpotsPlan — overdue + weak positions only, or null when there are
//                     none ("Practise my weak spots")
//
// localStorage is written synchronously on every Teacher answer; the cloud
// push is fired right after (best-effort, debounced in learningSync). A
// `learning-synced` event from a background reconcile makes the hook re-read.
//
// For a non-Premium user the hook is inert: it does no work and returns
// empty/null so a caller can mount it unconditionally.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryEntry, AccidentalMode, OrderMode } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  loadLearningState,
  saveLearningStateLocal,
  getInstrumentState,
  withInstrumentState,
  recordTeacherAnswer,
  recordPracticeAnswer as recordPracticeAnswerModel,
  rollDailyGoal,
  isDailyGoalComplete,
  type LearningState,
  type InstrumentLearningState,
  type DailyGoal,
} from '../learning/learningState';
import { cloudPushLearning } from '../learning/learningSync';
import {
  buildDailyPlan,
  buildWeakSpotsPlan,
  type TeacherPlan,
  type PlannerOptions,
} from '../learning/planner';

export interface UseLearningResult {
  /** Today's goal, rolled to the current calendar day. */
  dailyGoal: DailyGoal;
  goalComplete: boolean;
  /** The recommended session. Null only for a non-Premium user. */
  todayPlan: TeacherPlan | null;
  /** Overdue + weak positions only. Null when nothing qualifies. */
  weakSpotsPlan: TeacherPlan | null;
  /** How many distinct positions the SRS schedule is currently tracking. */
  trackedCount: number;
  /** Feed one answered Teacher question back into the model. Safe to call
   *  from inside the drill's history sink. Stable identity. */
  recordAnswer: (entry: HistoryEntry) => void;
  /** Feed one ordinary Selector (by-fret) answer into the SRS schedule only —
   *  no daily-goal tick. Lets the Teacher learn from all note practice, not
   *  just Teacher sessions. No-op for non-Premium users. Stable identity. */
  recordPracticeAnswer: (entry: HistoryEntry) => void;
}

export interface UseLearningOptions {
  instrument: InstrumentConfig;
  /** History rows already scoped to this instrument
   *  (`historyForInstrument(allHistory, instrument.id)`). */
  entries: HistoryEntry[];
  isPremium: boolean;
  accidental: AccidentalMode;
  order: OrderMode;
}

export function useLearning(opts: UseLearningOptions): UseLearningResult {
  const { instrument, entries, isPremium, accidental, order } = opts;
  const instrumentId = instrument.id;

  const [state, setState] = useState<LearningState>(() =>
    isPremium ? loadLearningState() : { version: 1, instruments: {} },
  );

  // "Now", as render-stable state (calling Date.now() during render is impure).
  // Refreshed on a slow tick so SRS due-times / the day roll-over stay current
  // without a re-render storm, and immediately on the events that matter.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isPremium) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isPremium]);

  // Re-read after a background cloud reconcile, and when Premium turns on.
  useEffect(() => {
    if (!isPremium) return;
    const reread = () => { setState(loadLearningState()); setNow(Date.now()); };
    reread();
    window.addEventListener('learning-synced', reread);
    return () => window.removeEventListener('learning-synced', reread);
  }, [isPremium]);

  // Roll the daily goal to today once per mount / day change, and persist it
  // so the rolled-over goal survives a reload even before the first answer.
  useEffect(() => {
    if (!isPremium) return;
    const ts = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((prev) => {
      const st = getInstrumentState(prev, instrumentId, ts);
      const rolled = rollDailyGoal(st.daily, ts, st.daily.target);
      if (rolled === st.daily) return prev;
      const next = withInstrumentState(prev, instrumentId, { ...st, daily: rolled });
      saveLearningStateLocal(next);
      cloudPushLearning();
      return next;
    });
  }, [isPremium, instrumentId]);

  const instState = useMemo(
    () => getInstrumentState(state, instrumentId, now),
    [state, instrumentId, now],
  );

  const dailyGoal = useMemo(
    () => rollDailyGoal(instState.daily, now, instState.daily.target),
    [instState, now],
  );

  // One code path for "fold this answer into the model"; `apply` is the pure
  // transition — `recordTeacherAnswer` (SRS + daily goal) for a Teacher
  // session, `recordPracticeAnswer` (SRS only) for ordinary Selector play.
  const foldAnswer = useCallback(
    (
      entry: HistoryEntry,
      apply: (
        st: InstrumentLearningState,
        pos: { string: number; fret: number },
        correct: boolean,
        now: number,
      ) => InstrumentLearningState,
    ) => {
      if (!isPremium) return;
      if (!Number.isInteger(entry.string) || !Number.isInteger(entry.fret)) return;
      const ts = Date.now();
      setNow(ts);
      setState((prev) => {
        const st = getInstrumentState(prev, instrumentId, ts);
        const nextSt = apply(
          st,
          { string: entry.string, fret: entry.fret },
          entry.correct === true,
          ts,
        );
        const next = withInstrumentState(prev, instrumentId, nextSt);
        saveLearningStateLocal(next);
        cloudPushLearning();
        return next;
      });
    },
    [isPremium, instrumentId],
  );

  const recordAnswer = useCallback(
    (entry: HistoryEntry) => foldAnswer(entry, recordTeacherAnswer),
    [foldAnswer],
  );
  const recordPracticeAnswer = useCallback(
    (entry: HistoryEntry) => foldAnswer(entry, recordPracticeAnswerModel),
    [foldAnswer],
  );

  // ── Plans ────────────────────────────────────────────────────────────
  // Rebuilt when history, the SRS map, or the day changes. `now` is read
  // once here; the planner/weakness functions themselves take it explicitly
  // so they stay pure and testable.
  const plannerBase: Omit<PlannerOptions, 'now'> | null = useMemo(() => {
    if (!isPremium) return null;
    return {
      entries,
      srs: instState.srs,
      maxFret: instrument.maxFret,
      allStrings: Array.from({ length: instrument.stringCount }, (_, i) => i + 1),
      accidental,
      order,
    };
  }, [isPremium, entries, instState.srs, instrument.maxFret, instrument.stringCount, accidental, order]);

  const { todayPlan, weakSpotsPlan } = useMemo(() => {
    if (!plannerBase) return { todayPlan: null, weakSpotsPlan: null };
    return {
      todayPlan: buildDailyPlan({ ...plannerBase, now }),
      weakSpotsPlan: buildWeakSpotsPlan({ ...plannerBase, now }),
    };
  }, [plannerBase, now]);

  return {
    dailyGoal,
    goalComplete: isDailyGoalComplete(dailyGoal),
    todayPlan,
    weakSpotsPlan,
    trackedCount: Object.keys(instState.srs).length,
    recordAnswer,
    recordPracticeAnswer,
  };
}
