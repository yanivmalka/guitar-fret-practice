import { useCallback, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { useSelector, DerivedSettings } from './useSelector';
import type { TeacherPlan } from '../learning/planner';
import type { DrillConfig } from '../drill/DrillConfig';

type EngineStart = (maxQ: number, currentTime: number, isByNote: boolean) => void;

interface Params {
  selector: ReturnType<typeof useSelector>;
  derivedSettings: DerivedSettings;
  /** Filled by App right after `useDrillSession`, so the hold timeout below can
   *  call the version that has already seen the next stage's `eff`. */
  engineStartRef: MutableRefObject<EngineStart>;
  teacherPlanRef: MutableRefObject<TeacherPlan | null>;
  intervalPlanRef: MutableRefObject<DrillConfig | null>;
}

/**
 * Auto Advance (A18): when a stage/selection is actually completed (every
 * question answered, not a manual Stop), roll straight into the next stage of
 * the ordered curriculum (see utils/stageSequence.ts) keeping the same
 * score/streak/session, showing a brief "STAGE COMPLETE" banner during the hold.
 *
 * `handleAutoComplete` is wired into `useDrillSession`'s `onComplete`. No
 * scoring/streak/multiplier/timing state is touched here — only *when* the first
 * question of the new stage is asked is delayed (~1s, ~0.55s under
 * reduced-motion).
 */
export function useAutoAdvance({
  selector, derivedSettings, engineStartRef, teacherPlanRef, intervalPlanRef,
}: Params) {
  const [pendingAutoAdvance, setPendingAutoAdvance] = useState(false);
  const [stageTransition, setStageTransition] =
    useState<{ name: string; from: number; to: number } | null>(null);

  // Mirror of the *current* stage's question count, read at the moment a stage
  // completes (before the next stage re-renders) to show "15 → 20".
  const stageMaxQRef = useRef(derivedSettings.maxQuestions);
  stageMaxQRef.current = derivedSettings.maxQuestions;
  const autoAdvanceFromRef = useRef(0);
  // Label of the stage being advanced into, captured for the transition banner.
  const autoAdvanceLabelRef = useRef('');

  const handleAutoComplete = useCallback(() => {
    // Teacher / interval sessions are a fixed one-off plan — never chain into
    // the Auto Advance curriculum even if the user has it switched on.
    if (teacherPlanRef.current || intervalPlanRef.current) return;
    if (!selector.state.autoAdvance) return;
    const next = selector.nextStage();
    if (!next) return; // end of the curriculum — let the run finish normally
    autoAdvanceFromRef.current = stageMaxQRef.current;
    autoAdvanceLabelRef.current = next.label;
    // Continuous run: carry score / streak / timing progression straight into
    // the next stage. runStreak keeps counting across this boundary — the
    // engine's next start() must NOT call scoring.beginRun (only manual Play
    // does), so the single run-length ramp is preserved.
    selector.applyStage(next);
    setPendingAutoAdvance(true);
  }, [selector, teacherPlanRef, intervalPlanRef]);

  // Latest-value mirror so the effect below can depend ONLY on
  // `pendingAutoAdvance`. `derivedSettings` gets a fresh identity on every
  // render; listing it as a dep would re-run the effect mid-hold and restart
  // the timer forever.
  const latestRef = useRef({ derivedSettings });
  latestRef.current = { derivedSettings };

  // On an Auto Advance boundary: show the "STAGE COMPLETE / <NAME>" banner,
  // hold briefly, then start the next stage exactly the way it started before —
  // same engineStart, same per-question countdown, no 3-2-1. `pendingAutoAdvance`
  // stays true for the whole hold so the "round complete" screen stays
  // suppressed and the game screen stays mounted (see gameActive).
  useLayoutEffect(() => {
    if (!pendingAutoAdvance) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { derivedSettings: ds } = latestRef.current;
    setStageTransition({
      name: autoAdvanceLabelRef.current,
      from: autoAdvanceFromRef.current,
      to: ds.maxQuestions,
    });
    const id = window.setTimeout(() => {
      const { derivedSettings: l } = latestRef.current;
      setStageTransition(null);
      setPendingAutoAdvance(false);
      engineStartRef.current(l.maxQuestions, l.time, l.byNote);
    }, reduced ? 550 : 1000);
    return () => window.clearTimeout(id);
  }, [pendingAutoAdvance, engineStartRef]);

  return { pendingAutoAdvance, setPendingAutoAdvance, stageTransition, handleAutoComplete };
}
