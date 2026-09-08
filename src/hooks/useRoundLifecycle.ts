import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { preloadAllSamples, unlockAudio } from '../utils/audio';
import { playStickClick } from '../utils/feedback';
import type { useSelector, DerivedSettings } from './useSelector';
import type { useScoring } from './useScoring';
import type { useVoiceAnswer } from './useVoiceAnswer';
import type { TeacherPlan } from '../learning/planner';
import type { DrillConfig } from '../drill/DrillConfig';

type EngineStart = (maxQ: number, currentTime: number, isByNote: boolean) => void;

interface Params {
  eff: DerivedSettings;
  selector: ReturnType<typeof useSelector>;
  scoring: ReturnType<typeof useScoring>;
  engineStart: EngineStart;
  voice: ReturnType<typeof useVoiceAnswer>;
  teacherPlan: TeacherPlan | null;
  intervalPlan: DrillConfig | null;
  preloaded: boolean;
  setPreloaded: (v: boolean) => void;
  askForMic: () => void;
  answerMode: 'tap' | 'voice';
  running: boolean;
  paused: boolean;
  /** Clears the per-run celebration state (badges/toasts/PB guard) owned by
   *  useRoundEndCelebrations. Filled by App once that hook has run. */
  celebrationsBeginRunRef: MutableRefObject<(isTeacher: boolean, isInterval: boolean) => void>;
}

/**
 * Round lifecycle (A33): the Play handler (`start`) with its audio unlock, mic
 * prompt, sample preload, scoring reset/beginRun, 3-2-1 count-in (+ drum-stick
 * clicks) and engine kick-off, plus the `gameEnded` flag and the Teacher /
 * interval auto-launch effect that fires `start()` once a plan is set.
 */
export function useRoundLifecycle({
  eff, selector, scoring, engineStart, voice, teacherPlan, intervalPlan,
  preloaded, setPreloaded, askForMic, answerMode, running, paused,
  celebrationsBeginRunRef,
}: Params) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const gameRowRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);

  const start = () => {
    unlockAudio();
    // Trigger the mic permission prompt from this user gesture, like unlockAudio.
    if (answerMode === 'voice' && voice.supported) askForMic();
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    scoring.reset();
    // One continuous timing ramp for the whole run: from this difficulty's
    // base down to the 3s floor across every question the run will ask
    // (all Auto Advance stages, or just this one).
    scoring.beginRun(
      eff.time,
      (teacherPlan || intervalPlan) ? eff.maxQuestions : selector.runQuestionCount(),
    );
    setGameEnded(false);
    // Remember whether this run is a Teacher / interval session and reset the
    // per-run badge / toast / personal-best state — the game-end effect uses
    // these to skip the Selector personal-best / badge / leaderboard flow.
    celebrationsBeginRunRef.current(
      teacherPlan !== null || intervalPlan !== null,
      intervalPlan !== null,
    );
    // Count-in: the on-screen countdown steps 3 → 2 → 1 once a second and the
    // game comes in on "0" at t = 3s. The four drum-stick clicks run on their
    // own steady, faster cadence — one every 750ms (t = 0, 0.75, 1.5, 2.25s),
    // "1-2-3-4" — so the game arrives exactly one beat after the last click.
    setCountdown(3);
    playStickClick();
    [750, 1500, 2250].forEach((t) => window.setTimeout(playStickClick, t));
    let c = 3;
    const interval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(interval);
        setCountdown(null);
        engineStart(eff.maxQuestions, eff.time, eff.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 1000);
  };

  // Fresh-closure handle on `start` so the Teacher-launch effect below always
  // calls the version that has already seen the new `eff` (post-setTeacherPlan
  // render), not a stale one.
  const startRef = useRef(start);
  startRef.current = start;
  // The Today card just calls `setTeacherPlan(plan)`. Once the plan is set (and
  // `eff` / `drillConfig` have re-derived from it) kick off the run exactly
  // like a manual Play — same 3-2-1, same engine, same scoring.
  useEffect(() => {
    if ((teacherPlan || intervalPlan) && !running && !paused && countdown === null && !gameEnded) {
      startRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherPlan, intervalPlan]);

  return { start, countdown, gameEnded, setGameEnded, gameRowRef, playBtnRef };
}
