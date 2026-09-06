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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notes, type HistoryEntry, type AccidentalMode, type OrderMode } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  loadLearningState,
  saveLearningStateLocal,
  getInstrumentState,
  withInstrumentState,
  recordTeacherAnswer,
  recordPracticeAnswer as recordPracticeAnswerModel,
  recordIntervalAnswer as recordIntervalAnswerModel,
  recordCheckpointStars,
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
import type { DrillPosition, DrillConfig } from '../drill/DrillConfig';
import { evaluatePath, type PathView } from '../learning/pathProgress';
import { buildIntervalDrill } from '../learning/intervalDrill';
import type { IntervalForm } from '../utils/intervals';

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
  /** The Learning Path: every checkpoint's mastered %, star rating, unlock
   *  state, and which one is current. `null` for a non-Premium user. */
  pathView: PathView | null;
  /** Feed one answered Teacher question back into the model. Safe to call
   *  from inside the drill's history sink. Stable identity. */
  recordAnswer: (entry: HistoryEntry) => void;
  /** Feed one ordinary Selector (by-fret) answer into the SRS schedule only —
   *  no daily-goal tick. Lets the Teacher learn from all note practice, not
   *  just Teacher sessions. No-op for non-Premium users. Stable identity. */
  recordPracticeAnswer: (entry: HistoryEntry) => void;
  /** Distinct interval qualities the interval SRS schedule is tracking (P4). */
  intervalTrackedCount: number;
  /** Fold one interval-drill answer into the interval SRS schedule (P4).
   *  `itemId` is the `intervalItemId(...)` the engine tagged the row with.
   *  No-op for non-Premium users. Stable identity. */
  recordIntervalAnswer: (itemId: string, correct: boolean) => void;
  /** Build the DrillConfig for an interval session in the given form, or
   *  `null` for a non-Premium user (P4). */
  buildIntervalPlan: (form: IntervalForm) => DrillConfig | null;
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

  // ── Interval drill (P4) ──────────────────────────────────────────────
  // Interval answers fold into their OWN SRS map (`intervalSrs`), never the
  // note schedule or the daily goal. Same offline-first save + best-effort
  // cloud push as every other learning write.
  const recordIntervalAnswer = useCallback(
    (itemId: string, correct: boolean) => {
      if (!isPremium || !itemId) return;
      const ts = Date.now();
      setNow(ts);
      setState((prev) => {
        const st = getInstrumentState(prev, instrumentId, ts);
        const next = withInstrumentState(
          prev,
          instrumentId,
          recordIntervalAnswerModel(st, itemId, correct, ts),
        );
        saveLearningStateLocal(next);
        cloudPushLearning();
        return next;
      });
    },
    [isPremium, instrumentId],
  );

  const buildIntervalPlan = useCallback(
    (form: IntervalForm): DrillConfig | null => {
      if (!isPremium) return null;
      return buildIntervalDrill({
        intervalSrs: instState.intervalSrs ?? {},
        now: Date.now(),
        maxFret: instrument.maxFret,
        allStrings: Array.from({ length: instrument.stringCount }, (_, i) => i + 1),
        accidental,
        order,
        form,
      });
    },
    [isPremium, instState.intervalSrs, instrument.maxFret, instrument.stringCount, accidental, order],
  );

  // ── Learning Path (P3) ───────────────────────────────────────────────
  // Every checkpoint's mastered %, star rating and unlock state, derived from
  // the SAME history + SRS the Teacher already reads. Pure; `now` injected.
  const pathView = useMemo<PathView | null>(() => {
    if (!isPremium) return null;
    return evaluatePath({
      entries,
      srs: instState.srs,
      instrument: { stringCount: instrument.stringCount, maxFret: instrument.maxFret },
      noteTable: notes,
      progress: instState.path,
      now,
    });
  }, [isPremium, entries, instState.srs, instState.path, instrument.stringCount, instrument.maxFret, now]);

  // Persist a checkpoint's stars the moment its live rating first passes the
  // stored best (monotonic — see `pathProgress.foldCheckpointStars`). Keeps
  // "finishing a checkpoint visibly advances them" true across a reload even
  // if later accuracy dips. Guarded by a signature so it runs only on a real
  // rise, never in a loop.
  const lastFoldSigRef = useRef('');
  useEffect(() => {
    if (!isPremium || !pathView) return;
    const risen = pathView.checkpoints.filter(
      (c) => c.liveStars > (instState.path.bestStars[c.checkpoint.id] ?? 0),
    );
    if (risen.length === 0) return;
    const sig = risen.map((c) => `${c.checkpoint.id}:${c.liveStars}`).join(',');
    if (sig === lastFoldSigRef.current) return;
    lastFoldSigRef.current = sig;
    const ts = Date.now();
    setState((prev) => {
      let st = getInstrumentState(prev, instrumentId, ts);
      for (const c of risen) {
        st = recordCheckpointStars(st, c.checkpoint.id, c.liveStars, ts);
      }
      const next = withInstrumentState(prev, instrumentId, st);
      saveLearningStateLocal(next);
      cloudPushLearning();
      return next;
    });
  }, [isPremium, pathView, instState.path, instrumentId]);

  // Positions from the current checkpoint that are not mastered yet — the
  // planner folds these in after overdue + weak (P3: "the planner now respects
  // Path position"). Capped so the Path never dominates a session.
  const pathItems = useMemo<DrillPosition[]>(() => {
    if (!pathView) return [];
    const cur = pathView.checkpoints[pathView.currentIndex];
    if (!cur || !cur.unlocked) return [];
    return cur.items
      .filter((it) => !it.mastered)
      .slice(0, 6)
      .map((it) => ({ string: it.string, fret: it.fret }));
  }, [pathView]);

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
      pathItems,
    };
  }, [isPremium, entries, instState.srs, instrument.maxFret, instrument.stringCount, accidental, order, pathItems]);

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
    pathView,
    recordAnswer,
    recordPracticeAnswer,
    intervalTrackedCount: Object.keys(instState.intervalSrs ?? {}).length,
    recordIntervalAnswer,
    buildIntervalPlan,
  };
}
