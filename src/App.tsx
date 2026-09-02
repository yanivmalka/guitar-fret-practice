import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import SelectorPanel from './components/SelectorPanel';
import StatsPanel from './components/StatsPanel';
import ProgressPanel from './components/ProgressPanel';
import Onboarding from './components/Onboarding';
import SpeedBar from './components/SpeedBar';
import AnimatedScore from './components/AnimatedScore';
import { displayNote, setActiveInstrument } from './utils/music';
import type { HistoryEntry, AccidentalMode, OrderMode, NotationMode } from './utils/music';
import { getInstrument, type InstrumentId } from './utils/instruments';
import { preloadAllSamples, unlockAudio, setAudioInstrument } from './utils/audio';
import { App as CapacitorApp } from '@capacitor/app';
import { playClickSound, playToggleOnSound, playToggleOffSound, playStickClick, haptic, celebrateTier3 } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { loadBest, saveBest, loadAllBests, writeAllBests } from './utils/personalBest';
import { flattenHistory, fretMasteryMap, noteMasteryMap } from './utils/mastery';
import { useAuth } from './hooks/useAuth';
import { bootstrapUser, reconcileUser, syncedUser, clearSyncedUser } from './utils/sync';
import { bootstrapSettings, syncedSettingsUser, clearSyncedSettingsUser } from './utils/settingsSync';
import { useSelector, nextDifficulty, totalRunQuestions } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useGameEngine } from './hooks/useGameEngine';
import { useHistory } from './hooks/useHistory';
import { useScoring } from './hooks/useScoring';
import { useVoiceAnswer } from './hooks/useVoiceAnswer';
import VoiceLevelMeter from './components/VoiceLevelMeter';
import DebugLogPanel from './components/DebugLogPanel';
import VoiceCalibration from './components/VoiceCalibration';
import { vlog } from './utils/debugLog';
import type { SpeechNotation } from './utils/speechVocab';
import { resetSpeechEngine, type VoiceEnginePref } from './utils/speech';
import {
  getActiveProfile, setActiveProfile, isProfileReady, recomputeReady, templateCounts,
} from './utils/voiceProfile';
import { PROFILE_LABELS, SAMPLES_PER_LABEL, profileVocabId } from './utils/voiceProfileVocab';
import { bootstrapVoiceProfile, voiceSyncedUser, clearVoiceSyncedUser } from './utils/voiceSync';

type AnswerMode = 'tap' | 'voice';

// Uppercase display name for the Auto Advance stage-transition banner.
const STAGE_NAME: Record<string, string> = { dots: 'DOTS', naturals: 'NATURALS', full: 'FULL' };

export default function App() {
  // Which instrument is being drilled. Chosen on first launch (Onboarding) and
  // switchable from the hamburger menu; everything tuning/string/fret/sample
  // related flows from this config (see utils/instruments.ts).
  const [instrumentId, setInstrumentId] = useState<InstrumentId>(
    () => loadSetting('pref_instrument', 'guitar'),
  );
  const instrument = getInstrument(instrumentId);
  // Sync the shared note-table + audio bindings to the active instrument before
  // any child hook/component reads them this render. Idempotent — this is an
  // external-store sync, not derived render state.
  setActiveInstrument(instrument);
  setAudioInstrument(instrument);
  const applyInstrument = (id: InstrumentId) => {
    setInstrumentId(id);
    saveSetting('pref_instrument', id);
  };

  const selector = useSelector(instrument);
  const { derivedSettings } = selector;

  const [guitarString, setGuitarString] = useState(derivedSettings.guitarString);
  // `guitarString` is state synced from derivedSettings via an effect, so for
  // one render right after an instrument switch it can still hold the previous
  // instrument's (larger) string number. Clamp it before anything indexes the
  // now-shorter note table with it — an out-of-range index throws and blanks
  // the whole page.
  const safeGuitarString = Math.min(Math.max(guitarString, 1), instrument.stringCount);
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation, setNotation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
  // Bumped when a personal voice-profile calibration finishes, so
  // useVoiceAnswer re-selects the speech engine (on-device vs Web).
  const [voiceEngineEpoch, setVoiceEngineEpoch] = useState(0);
  const [showVoiceCalibration, setShowVoiceCalibration] = useState(false);
  // Summary of the stored personal voice profile, shown in Settings so it is
  // obvious that recordings exist and can be extended.
  const [voiceProfileStat, setVoiceProfileStat] = useState<
    { enabled: boolean; count: number } | null
  >(null);
  const [voiceEnginePref, setVoiceEnginePref] = useState<VoiceEnginePref>(
    () => loadSetting('pref_voiceEngine', 'auto'),
  );
  const pickVoiceEngine = (p: VoiceEnginePref) => {
    setVoiceEnginePref(p);
    saveSetting('pref_voiceEngine', p);
    resetSpeechEngine();
    setVoiceEngineEpoch((n) => n + 1);
  };
  // Refresh the voice-profile summary on mount and whenever a calibration
  // session ends or the engine preference changes.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const active = getActiveProfile();
      if (!active) { if (alive) setVoiceProfileStat({ enabled: false, count: 0 }); return; }
      try {
        const counts = await templateCounts(active, profileVocabId(notation as SpeechNotation), true);
        const count = Object.values(counts).reduce((s, v) => s + v, 0);
        if (alive) setVoiceProfileStat({ enabled: isProfileReady(), count });
      } catch {
        if (alive) setVoiceProfileStat(null);
      }
    })();
    return () => { alive = false; };
  }, [showVoiceCalibration, voiceEngineEpoch, notation]);
  // How the player answers a question: tapping the circle/grid, or speaking the
  // note name / fret number aloud (WP-4). Voice needs a network connection and
  // is only offered where a recogniser is actually available.
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() => loadSetting('pref_answerMode', 'tap'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('pref_order', 'fifths'));
  const [accidental] = useState<AccidentalMode>(() => loadSetting('pref_accidental', 'sharps'));
  // Whether the on-screen score, streak multiplier and all score celebrations
  // are shown. Off = "serious learning" mode: no score HUD or effects during
  // play, but every answer is still scored into history and personal-best
  // progress exactly as before.
  const [showScore, setShowScore] = useState(() => loadSetting('pref_showScore', true));

  const historyOps = useHistory();
  const histKey = selector.historyKey();
  const { addEntry: addEntryRaw, markPlayed: markPlayedRaw } = historyOps;
  const addEntryWithKey = useCallback(
    (entry: HistoryEntry) => addEntryRaw(histKey, entry),
    [histKey, addEntryRaw],
  );
  const markPlayedForKey = useCallback(
    () => markPlayedRaw(histKey),
    [histKey, markPlayedRaw],
  );

  // ── Accounts (optional): guests are unaffected; signing in with Google
  // syncs History + Personal Best to the account and restores them on other
  // devices. localStorage stays the source of truth the UI reads from.
  const auth = useAuth();
  const { replaceAllHistory, getAllHistory } = historyOps;
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearSyncedUser(); return; }
    let cancelled = false;
    (async () => {
      try {
        if (syncedUser() !== user.id) {
          // First sign-in on this device: pull cloud, merge with local, push
          // the merged set back, then commit it locally. Local data is left
          // untouched unless every step succeeds.
          const { history, bests } = await bootstrapUser(
            user.id, getAllHistory(), loadAllBests(),
          );
          if (cancelled) return;
          replaceAllHistory(history);
          writeAllBests(bests);
        } else {
          // Already merged before — pull the tombstone set, retire any
          // cleared rows that still survive here, then re-push what's left
          // (this also carries up anything written offline).
          const { history, changed } = await reconcileUser(
            user.id, getAllHistory(), loadAllBests(),
          );
          if (cancelled) return;
          if (changed) replaceAllHistory(history);
        }
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user, replaceAllHistory, getAllHistory]);

  // Selector picks + UI preferences: once per sign-in on this device, adopt
  // the account's settings blob if it's newer than what this device last
  // synced. Applied by writing localStorage then reloading, so the settings
  // hooks read the restored values at mount (they only read localStorage
  // once). A no-op when the cloud blob isn't newer.
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearSyncedSettingsUser(); return; }
    if (syncedSettingsUser() === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { applied } = await bootstrapSettings(user.id);
        if (cancelled) return;
        if (applied) window.location.reload();
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  // Same model, for the personal voice profile: pull/merge/push once per
  // sign-in on this device, then switch the app onto the restored profile.
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearVoiceSyncedUser(); return; }
    if (voiceSyncedUser() === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const merged = await bootstrapVoiceProfile(user.id);
        if (cancelled || !merged.length) return;
        // Keep the device's current profile if it's among the restored rows;
        // otherwise switch to whichever profile was touched most recently.
        const current = getActiveProfile();
        const profiles = [...new Set(merged.map((r) => r.profile))];
        const chosen = current && profiles.includes(current)
          ? current
          : merged.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b)).profile;
        setActiveProfile(chosen);
        const vocabIds = [...new Set(
          merged.filter((r) => r.profile === chosen).map((r) => r.vocabId),
        )];
        for (const vocabId of vocabIds) {
          await recomputeReady(vocabId, [...PROFILE_LABELS], SAMPLES_PER_LABEL);
        }
        resetSpeechEngine();
        setVoiceEngineEpoch((n) => n + 1);
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  const derived = useDerivedNotes(
    safeGuitarString, derivedSettings.fretFrom, derivedSettings.fretTo,
    derivedSettings.wholeToneOnly, derivedSettings.dotsOnly,
    accidental, order, byString, derivedSettings.multiStrings, instrumentId,
  );
  const { cofList, startIndex, activeNotes, questionActiveNotes, fretDots, noteFrets, isMulti } = derived;
  const scoring = useScoring();

  // All-time (every settings combo ever played) mastery, shown as a small
  // equalizer-style overlay on the fretboard/note-circle so the user can see
  // at a glance what they know vs. what needs work, in both directions:
  // frets on the current string, and each note across all strings.
  const allHistoryEntries = useMemo(() => flattenHistory(historyOps.allHistory), [historyOps.allHistory]);
  const fretMastery = useMemo(
    () => fretMasteryMap(allHistoryEntries, safeGuitarString),
    [allHistoryEntries, safeGuitarString],
  );
  const noteMastery = useMemo(
    () => noteMasteryMap(allHistoryEntries, cofList),
    [allHistoryEntries, cofList],
  );

  // Auto Advance: when the current stage/selection is actually completed
  // (every question answered, not a manual Stop), bump to the next
  // difficulty and continue straight into it, keeping the same score/
  // streak/session. selector.onDifficultySelect and setPendingAutoAdvance
  // are called together in the same tick as the engine's setRunning(false),
  // so React batches them into one render — the game-end-summary effect
  // (below) sees pendingAutoAdvance already true at that same render and
  // skips showing the "round complete" screen for this transition.
  const [pendingAutoAdvance, setPendingAutoAdvance] = useState(false);
  // Data for the brief Auto Advance stage-transition banner (null = not shown).
  const [stageTransition, setStageTransition] = useState<{ name: string; from: number; to: number } | null>(null);
  // Mirror of the *current* stage's question count, read at the moment a stage
  // completes (before the difficulty bump re-renders) to show "15 → 20".
  const stageMaxQRef = useRef(derivedSettings.maxQuestions);
  stageMaxQRef.current = derivedSettings.maxQuestions;
  const autoAdvanceFromRef = useRef(0);
  const handleAutoComplete = useCallback(() => {
    if (!selector.state.autoAdvance) return;
    const next = nextDifficulty(selector.state.difficulty);
    if (!next) return;
    autoAdvanceFromRef.current = stageMaxQRef.current;
    // Continuous run: carry score / streak / timing progression straight into
    // the next stage. runStreak keeps counting across this boundary — the
    // engine's next start() must NOT call scoring.beginRun (only manual Play
    // does), so the single run-length ramp is preserved.
    selector.onDifficultySelect(next);
    setPendingAutoAdvance(true);
  }, [selector]);

  const engine = useGameEngine(
    {
      guitarString: safeGuitarString,
      fretFrom: derivedSettings.fretFrom,
      fretTo: derivedSettings.fretTo,
      wholeToneOnly: derivedSettings.wholeToneOnly,
      dotsOnly: derivedSettings.dotsOnly,
      byNote: derivedSettings.byNote,
      isMulti: derivedSettings.multiStrings.length > 0,
      activeStrings: derivedSettings.multiStrings.length > 0 ? derivedSettings.multiStrings : [safeGuitarString],
      time: derivedSettings.time,
      accidental,
      order,
    },
    {
      setGuitarString,
      setTime: () => {}, setFretFrom: () => {}, setFretTo: () => {},
      setAccidental: () => {}, setOrder: () => {}, setWholeToneOnly: () => {},
      setDotsOnly: () => {}, setByNote: () => {}, setMultiStrings: () => {},
      setByString: () => {}, setStageIndex: () => {},
    },
    {
      addEntry: addEntryWithKey,
      markPlayed: markPlayedForKey,
      resetSession: historyOps.resetSession,
      history: historyOps.history,
    },
    {
      onCorrect: scoring.onCorrect,
      onWrong: scoring.onWrong,
      onTimeout: scoring.onTimeout,
      getQuestionTime: scoring.getQuestionTime,
      showScore,
    },
    {
      onComplete: handleAutoComplete,
    },
  );
  const {
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    questionTime, questionStart, questionSeq, questionNumber,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
  } = engine;

  // Voice answering (WP-4): while a question is on screen and answerMode is
  // 'voice', listen and route the recognised note/fret through the same
  // selectAnswer/selectFret the tap handlers use.
  // Held in a ref because the callback below is defined inside the same
  // useVoiceAnswer() call that produces `voice.learn`.
  const voiceLearnRef = useRef<(label: string) => void>(() => {});
  const voice = useVoiceAnswer({
    enabled: answerMode === 'voice',
    running,
    paused,
    answered,
    byNote: derivedSettings.byNote,
    questionSeq,
    hasActiveQuestion: derivedSettings.byNote ? currentNote !== null : currentFret !== null,
    notation: notation as SpeechNotation,
    engineEpoch: voiceEngineEpoch,
    // A correct spoken answer is fed back to the engine so the "general"
    // recogniser can learn the user's own voice over time.
    onNote: (n) => { if (selectAnswer(n)) voiceLearnRef.current(n); },
    onFret: selectFret,
  });
  useEffect(() => { voiceLearnRef.current = voice.learn; }, [voice.learn]);
  // Fall back to tap input if voice is selected but no recogniser exists.
  const voiceActive = answerMode === 'voice' && voice.supported;

  // Latest-value mirror so the Auto Advance effect below can depend ONLY on
  // `pendingAutoAdvance`. `engineStart` (and the objects it closes over) get a
  // fresh identity on every render, so listing it as a dep would re-run the
  // effect mid-hold and restart the timer forever.
  const autoAdvanceLatestRef = useRef({ engineStart, derivedSettings, difficulty: selector.state.difficulty });
  autoAdvanceLatestRef.current = { engineStart, derivedSettings, difficulty: selector.state.difficulty };

  // On an Auto Advance boundary: show the "STAGE COMPLETE / <NAME>" banner,
  // hold briefly, then start the next stage exactly the way it started before —
  // same engineStart, same per-question countdown, no 3-2-1. No scoring/streak/
  // multiplier/timing state is touched here; this only delays *when* the first
  // question of the new stage is asked (~1s, or ~0.55s under reduced-motion).
  // `pendingAutoAdvance` stays true for the whole hold so the "round complete"
  // screen stays suppressed and the game screen stays mounted (see gameActive).
  useLayoutEffect(() => {
    if (!pendingAutoAdvance) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { difficulty, derivedSettings: ds } = autoAdvanceLatestRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStageTransition({
      name: STAGE_NAME[difficulty] ?? '',
      from: autoAdvanceFromRef.current,
      to: ds.maxQuestions,
    });
    const id = window.setTimeout(() => {
      const l = autoAdvanceLatestRef.current;
      setStageTransition(null);
      setPendingAutoAdvance(false);
      l.engineStart(l.derivedSettings.maxQuestions, l.derivedSettings.time, l.derivedSettings.byNote);
    }, reduced ? 550 : 1000);
    return () => window.clearTimeout(id);
  }, [pendingAutoAdvance]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!paused) setGuitarString(derivedSettings.guitarString); }, [derivedSettings.guitarString, paused]);

  // Subtle in-place transition when the question changes. Animates the single
  // existing .note-display / .fret-display node via the Web Animations API — no
  // React remount, so there is never more than one element and the layout box
  // never grows or shifts. Transform/opacity only; direction-agnostic (works in
  // LTR and RTL). questionSeq bumps once per question (incl. Auto Advance).
  const questionDisplayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (questionSeq === 0) return;
    const el = questionDisplayRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { transform: 'translateY(4px) scale(0.96)', opacity: 0.35 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      { duration: 130, easing: 'ease-out' },
    );
  }, [questionSeq]);

  // Settings changed while actively playing invalidate the session, so stop it.
  // While paused, just remember the new settings — they're picked up on resume
  // (for the next question) without losing the current score/streak/progress.
  const derivedRef = useRef(derivedSettings);
  useEffect(() => {
    if (derivedRef.current !== derivedSettings && running && !paused) { stop(); }
    derivedRef.current = derivedSettings;
  }, [derivedSettings, running, paused, stop]);

  // Freeze the game (pause, not stop) whenever the app is backgrounded, hidden,
  // or closed, so returning to it resumes exactly where it left off instead of
  // resetting. Only actually running sessions pause; already-idle/paused state
  // is left alone.
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const runningRef2 = useRef(running);
  runningRef2.current = running;
  useEffect(() => {
    const pauseEverything = () => {
      vlog('[voice] pauseEverything', {
        running: runningRef2.current,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
      if (runningRef2.current) pauseRef.current();
    };

    // `visibilitychange` → hidden is a noisy signal on desktop: some setups
    // (remote-desktop sessions, an undocked/focused DevTools window, brief
    // OS-level occlusion) flip the tab to "hidden" for a moment while the user
    // is still looking at it. That was freezing the game — and killing Voice
    // mode's microphone — mid-round. Genuinely backgrounding the app (switching
    // tab/app, minimising) keeps it hidden for far longer, so wait a short
    // beat and only pause if it is still hidden. Becoming visible again cancels.
    let hiddenTimer: number | null = null;
    const clearHiddenTimer = () => {
      if (hiddenTimer !== null) { clearTimeout(hiddenTimer); hiddenTimer = null; }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearHiddenTimer();
        hiddenTimer = window.setTimeout(() => {
          hiddenTimer = null;
          if (document.hidden) pauseEverything();
        }, 2000);
      } else {
        clearHiddenTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // `pagehide` means the page is actually being torn down — pause at once.
    const onPageHide = () => { clearHiddenTimer(); pauseEverything(); };
    document.addEventListener('pagehide', onPageHide);

    let removeAppStateListener: (() => void) | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) pauseEverything();
    }).then((handle) => { removeAppStateListener = () => handle.remove(); });
    CapacitorApp.addListener('pause', pauseEverything).then((handle) => {
      const prev = removeAppStateListener;
      removeAppStateListener = () => { prev?.(); handle.remove(); };
    });

    return () => {
      clearHiddenTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pagehide', onPageHide);
      removeAppStateListener?.();
    };
  }, [pause]);

  const [preloaded, setPreloaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  const [showStats, setShowStats] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Which settings sub-page is open inside the drawer; null = the list of titles.
  const [drawerSection, setDrawerSection] = useState<string | null>(null);
  // Friendly in-app microphone card shown *before* the browser's own bare
  // permission prompt: 'primer' explains why we need the mic, 'denied' is the
  // recovery card for when the browser has already refused (it won't re-ask).
  const [micPrompt, setMicPrompt] = useState<null | 'primer' | 'denied'>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const gameRowRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  // Guards the Tier 3 (new personal best) celebration so it fires at most once
  // per completed run. Reset on every Play and whenever the selector combo changes.
  const tier3FiredRef = useRef(false);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;
  // The game screen (question, grid/circle, selector-mini) stays visible and
  // frozen while paused, not just while actively running.
  // Also "active" during the brief Auto Advance banner: `running` is momentarily
  // false between stages, but the game screen must stay mounted (frozen on the
  // last question) so the transition never collapses the layout.
  const gameActive = running || paused || pendingAutoAdvance;

  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

  // Route every microphone request through our own card instead of springing
  // the browser's permission bar unannounced. Already-granted → straight
  // through; a prior refusal → the recovery card; otherwise → the primer.
  const askForMic = () => {
    if (!voice.supported) return;
    if (voice.permission === 'granted') { void voice.ensurePermission(); return; }
    setMicPrompt(voice.permission === 'denied' ? 'denied' : 'primer');
  };
  const grantMic = async () => {
    const ok = await voice.ensurePermission();
    setMicPrompt(ok ? null : 'denied');
  };

  // "?" affordance pinned to the active mode card: opens the setup-summary
  // bubble and keeps it open until the user taps the "?" again or clicks
  // anywhere else on the page (no auto-dismiss timer).
  const openInfo = () => setShowInfo(v => !v);
  useEffect(() => {
    if (!showInfo) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest('.mode-card-info')) setShowInfo(false);
    };
    // Defer so the click that opened the bubble doesn't immediately close it.
    const id = window.setTimeout(
      () => document.addEventListener('pointerdown', onPointerDown), 0,
    );
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [showInfo]);

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;
  const hasAnyHistory = hasHistory || Object.values(historyOps.allHistory).some(list => list.length > 0);

  // While actively playing the game stays clean and focused — the hamburger
  // (and the stats shortcut) are only offered when stopped or paused.
  // The burger icon is hidden while the drawer itself is open — the drawer's
  // own Back control takes over from there.
  const showBurger = !isPlaying && !pendingAutoAdvance && countdown === null && !settingsOpen;

  useEffect(() => { setShowStats(false); setShowProgress(false); setGameEnded(false); tier3FiredRef.current = false; }, [histKey]);

  // Mirror the open sub-page in a ref so the Escape handler (bound once per
  // open) reads the current value without re-subscribing on every navigation.
  const drawerSectionRef = useRef<string | null>(null);
  useEffect(() => { drawerSectionRef.current = drawerSection; }, [drawerSection]);

  // Escape steps back to the list of titles first, then closes the drawer.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawerSectionRef.current !== null) setDrawerSection(null);
      else setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  // Dismiss the microphone card with Escape too.
  useEffect(() => {
    if (!micPrompt) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMicPrompt(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [micPrompt]);

  // Multi-string mode: a short haptic pulse when the drilled string changes
  // between questions, reinforcing the visual string-change emphasis. Single-
  // string rounds never switch string, so this only ever fires in Multi.
  const activeStringRef = useRef(guitarString);
  useEffect(() => {
    if (gameActive && isMulti && activeStringRef.current !== guitarString) {
      haptic.stageChange();
    }
    activeStringRef.current = guitarString;
  }, [guitarString, gameActive, isMulti]);

  const sessionHistory = historyOps.history;

  // Detect game end (skipped when Auto Advance is about to continue straight
  // into the next stage, so the "round complete" screen doesn't flash up for
  // a transition that isn't actually ending the session).
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !running && !paused && scoring.session.questionsAnswered > 0 && !pendingAutoAdvance) {
      setGameEnded(true);

      // Major achievement: a new personal-best score for this exact selector
      // combination — the same per-historyKey `best_<key>` record StatsPanel
      // maintains. Persist it here and fire the Tier 3 celebration once per run
      // (tier3FiredRef also blocks a repeat if this effect re-runs).
      const score = scoring.session.score;
      const prevBest = loadBest(histKey);
      if (!tier3FiredRef.current && score > 0 && score > (prevBest?.score ?? 0)) {
        tier3FiredRef.current = true;
        const hist = historyOps.history;
        const total = hist.length;
        const correctCount = hist.filter(h => h.correct === true).length;
        const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);
        saveBest(histKey, { score, streak: scoring.session.longestStreak, accuracy });
        // Personal-best progress is always recorded; the celebration itself is
        // a score effect, so it is skipped in "serious learning" mode.
        if (showScore) celebrateTier3(score, scoring.session.longestStreak);
      }
    }
    wasRunningRef.current = running;
  }, [running, paused, pendingAutoAdvance, scoring.session.questionsAnswered, scoring.session.score, scoring.session.longestStreak, histKey, historyOps.history, showScore]);

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
      derivedSettings.time,
      totalRunQuestions(selector.state.difficulty, selector.state.autoAdvance),
    );
    setGameEnded(false);
    tier3FiredRef.current = false;
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
        engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 1000);
  };

  // Multiplier display tracks the streak-tier multiplier from useScoring
  // (1×, 1.25×, 1.5×, 2×, 2.5×, 3×, 4× at streaks 0, 3, 5, 7, 10, 15, 20).
  const currentMultiplier = scoring.session.multiplier;
  const multiplierFireCount = currentMultiplier >= 4 ? 5
    : currentMultiplier >= 3 ? 4
    : currentMultiplier >= 2.5 ? 3
    : currentMultiplier >= 2 ? 2
    : currentMultiplier > 1 ? 1
    : 0;
  const multiplierIcon = multiplierFireCount > 0
    ? `${'🔥'.repeat(multiplierFireCount)} ×${currentMultiplier}`
    : '';

  // One definition of the settings panel, rendered in three ways: the full
  // editable panel inline on the page, the compact read-only HUD during play
  // (panelPlaying = true), and — inside the hamburger overlay — just the
  // note-name notation toggle (notationOnly = true).
  const renderSelectorPanel = (panelPlaying: boolean, notationOnly = false) => (
    <SelectorPanel
      selector={selector.state}
      instrument={instrument}
      onStringSelect={selector.onStringSelect}
      onMultiToggle={selector.onMultiToggle}
      onModeSelect={selector.onModeSelect}
      onFretRangeToggle={selector.onFretRangeToggle}
      onDifficultySelect={selector.onDifficultySelect}
      onAutoAdvanceToggle={() => {
        if (selector.state.autoAdvance) playToggleOffSound(); else playToggleOnSound();
        haptic.tap();
        selector.onAutoAdvanceToggle();
        // Pull focus/hover off the toggle onto Play so a touch device repaints
        // it to its new on/off colour immediately instead of holding the
        // pressed look until the next tap.
        playBtnRef.current?.focus();
      }}
      isPlaying={panelPlaying}
      notationOnly={notationOnly}
      activeString={gameActive ? safeGuitarString : undefined}
      activeFret={gameActive ? askedFret : undefined}
      byString={byString}
      order={order}
      onByStringToggle={() => { byString ? playToggleOffSound() : playToggleOnSound(); haptic.tap(); const next = !byString; setByString(next); saveSetting('pref_byString', next); }}
      onOrderChange={(o) => { playClickSound(); haptic.tap(); setOrder(o); saveSetting('pref_order', o); }}
      accidental={accidental}
      notation={notation}
      onNotationChange={(n) => { playClickSound(); haptic.tap(); setNotation(n); saveSetting('pref_notation', n); }}
      onInfo={() => { playClickSound(); haptic.tap(); openInfo(); }}
      showInfo={showInfo}
    />
  );

  // The hamburger drawer is a list of section titles; tapping one opens a
  // sub-page with a short blurb plus just that section's controls.
  const settingsSections: Array<{ id: string; title: string; blurb: string; body: ReactNode }> = [
    {
      id: 'instrument',
      title: '🎸 Instrument',
      blurb: 'Switch between guitar and bass. Changing this updates the tuning, string count and fret range, and reloads the note samples.',
      body: (
        <div className="notation-row">
          <button
            className={`order-chip${instrumentId === 'guitar' ? ' order-chip-active' : ''}`}
            onClick={click(() => { if (instrumentId !== 'guitar') { if (running || paused) stop(); applyInstrument('guitar'); setPreloaded(false); setSettingsOpen(false); } })}
          >🎸 Guitar</button>
          <button
            className={`order-chip${instrumentId === 'bass' ? ' order-chip-active' : ''}`}
            onClick={click(() => { if (instrumentId !== 'bass') { if (running || paused) stop(); applyInstrument('bass'); setPreloaded(false); setSettingsOpen(false); } })}
          >🎵 Bass</button>
        </div>
      ),
    },
    {
      id: 'notes',
      title: '🎵 Note names',
      blurb: 'Show note names as letters (A B C) or as solfège (Do Re Mi). This only changes how names are displayed, not the drill itself.',
      body: renderSelectorPanel(false, true),
    },
    {
      id: 'score',
      title: '🎯 Score',
      blurb: 'On shows the live score, streak multiplier and all celebrations for a game feel. Off hides them for distraction-free practice — every answer is still scored into your statistics and personal-best progress.',
      body: (
        <div className="notation-row">
          <button
            className={`order-chip${showScore ? ' order-chip-active' : ''}`}
            onClick={click(() => { setShowScore(true); saveSetting('pref_showScore', true); })}
          >On</button>
          <button
            className={`order-chip${!showScore ? ' order-chip-active' : ''}`}
            onClick={click(() => { setShowScore(false); saveSetting('pref_showScore', false); })}
          >Off</button>
        </div>
      ),
    },
    ...(hasHistory ? [{
      id: 'stats',
      title: '📊 Statistics',
      blurb: 'Open the summary screen with cumulative accuracy and response times for the current settings combination.',
      body: (
        <button
          className={`order-chip${showStats ? ' order-chip-active' : ''}`}
          onClick={click(() => { setShowProgress(false); setShowStats(true); setSettingsOpen(false); })}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <rect x="2" y="10" width="4" height="8" rx="1" fill="currentColor" />
            <rect x="8" y="6" width="4" height="12" rx="1" fill="currentColor" />
            <rect x="14" y="2" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
          Overall statistics
        </button>
      ),
    }] : []),
    ...(hasAnyHistory ? [{
      id: 'progress',
      title: '📈 Progress',
      blurb: 'Your all-time progress across every settings combination: lifetime accuracy and speed, a practice-day streak, a per-day timeline, a fretboard mastery heatmap and your weakest notes.',
      body: (
        <button
          className={`order-chip${showProgress ? ' order-chip-active' : ''}`}
          onClick={click(() => { setShowStats(false); setShowProgress(true); setSettingsOpen(false); })}
        >
          📈 Open progress
        </button>
      ),
    }] : []),
    ...(voice.supported ? [{
      id: 'answer',
      title: '👆 Answer mode',
      blurb: 'Choose whether you answer by tapping the screen or by saying the answer out loud. Voice mode asks for microphone permission.',
      body: (
        <div className="notation-row">
          <button
            className={`order-chip${answerMode === 'tap' ? ' order-chip-active' : ''}`}
            onClick={click(() => { setAnswerMode('tap'); saveSetting('pref_answerMode', 'tap'); })}
          >👆 Tap</button>
          <button
            className={`order-chip${answerMode === 'voice' ? ' order-chip-active' : ''}`}
            onClick={click(() => {
              setAnswerMode('voice');
              saveSetting('pref_answerMode', 'voice');
              askForMic();
            })}
          >🎤 Voice</button>
        </div>
      ),
    }] : []),
    {
      id: 'voiceEngine',
      title: '🗣️ Voice engine',
      blurb: 'Auto picks the best recognizer automatically. Personal uses your own calibrated voice profile. General uses a built-in model.',
      body: (
        <div className="notation-row">
          <button
            className={`order-chip${voiceEnginePref === 'auto' ? ' order-chip-active' : ''}`}
            onClick={click(() => pickVoiceEngine('auto'))}
          >Auto</button>
          <button
            className={`order-chip${voiceEnginePref === 'profile' ? ' order-chip-active' : ''}`}
            onClick={click(() => pickVoiceEngine('profile'))}
          >Personal</button>
          <button
            className={`order-chip${voiceEnginePref === 'general' ? ' order-chip-active' : ''}`}
            onClick={click(() => pickVoiceEngine('general'))}
          >General</button>
        </div>
      ),
    },
    {
      id: 'voiceProfile',
      title: '🎙️ Voice profile',
      blurb: 'Calibrate your voice to improve recognition accuracy when answering by voice.',
      body: (
        <div className="notation-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {voiceProfileStat && voiceProfileStat.count > 0 && (
            <span className="vcal-here" style={{ flexBasis: '100%' }}>
              {voiceProfileStat.enabled
                ? `✓ Personal profile enabled · ${voiceProfileStat.count} recordings`
                : `Personal profile started · ${voiceProfileStat.count} recordings (not enabled yet)`}
            </span>
          )}
          <button
            className="order-chip"
            onClick={click(() => { setSettingsOpen(false); setShowVoiceCalibration(true); })}
          >🎙️ {voiceProfileStat && voiceProfileStat.count > 0
            ? 'Add / review recordings'
            : 'Calibrate my voice'}</button>
        </div>
      ),
    },
    ...(auth.configured ? [{
      id: 'account',
      title: '👤 Account',
      blurb: 'Sign in with Google to keep your preferences and data across devices, or sign out.',
      body: (
        <div className="account-row">
          {auth.user ? (
            <>
              <span className="account-email">
                {auth.user.email ?? 'Signed in'}
              </span>
              <button
                className="account-btn"
                onClick={click(() => { void auth.signOut(); })}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="account-btn account-btn-primary"
              onClick={click(() => { void auth.signInWithGoogle(); })}
            >
              <svg className="google-icon" viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding
          onInstrument={applyInstrument}
          onDone={() => { setOnboardingDone(true); saveSetting('onboardingDone', true); }}
        />
      )}

      {/* Pause: dim the entire app screen; .controls (Resume/Stop) sits
          above this via z-index so it stays sharp and clickable in place. */}
      {paused && <div className="pause-overlay" aria-hidden="true" />}

      {/* Settings hamburger + stats shortcut — hidden while actively playing so
          the game stays clean and focused. */}
      {showBurger && (
        <button
          className="burger-btn"
          onClick={click(() => { setDrawerSection(null); setSettingsOpen(o => !o); })}
          aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
          aria-expanded={settingsOpen}
          title="Settings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}

      <h1>{instrument.emoji} {instrument.label} Fret Practice</h1>

      {/* All playing settings live inline on the page; a compact read-only HUD
          replaces the panel during play. */}
      {renderSelectorPanel(gameActive)}

      {/* Hamburger drawer: a list of setting titles; tapping one opens that
          section's sub-page. Backdrop click or Escape dismisses / steps back. */}
      {settingsOpen && (() => {
        const activeSection = drawerSection === null
          ? null
          : settingsSections.find(s => s.id === drawerSection) ?? null;
        return (
          <div className="settings-overlay" onClick={click(() => setSettingsOpen(false))}>
            <div
              className="settings-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Game settings"
              onClick={(e) => e.stopPropagation()}
            >
              {activeSection === null ? (
                <nav className="settings-menu">
                  <button
                    className="settings-back"
                    onClick={click(() => setSettingsOpen(false))}
                  >
                    <span aria-hidden="true">›</span> Back
                  </button>
                  <h2 className="settings-menu-title">Settings</h2>
                  {settingsSections.map(s => (
                    <button
                      key={s.id}
                      className="settings-menu-item"
                      onClick={click(() => setDrawerSection(s.id))}
                    >
                      <span className="settings-menu-item-label">{s.title}</span>
                      <span className="settings-menu-item-chevron" aria-hidden="true">‹</span>
                    </button>
                  ))}
                </nav>
              ) : (
                <div className="settings-detail">
                  <button
                    className="settings-back"
                    onClick={click(() => setDrawerSection(null))}
                  >
                    <span aria-hidden="true">›</span> Back
                  </button>
                  <h2 className="settings-detail-title">{activeSection.title}</h2>
                  <p className="settings-detail-blurb">{activeSection.blurb}</p>
                  {activeSection.body}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Microphone permission card — our own copy + styling, shown ahead of
          (primer) or in place of (denied) the browser's native prompt. */}
      {micPrompt && (
        <div className="mic-overlay" onClick={click(() => setMicPrompt(null))}>
          <div
            className="mic-card"
            role="dialog"
            aria-modal="true"
            aria-label="Microphone access"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mic-card-icon" aria-hidden="true">🎤</div>
            {micPrompt === 'primer' ? (
              <>
                <div className="mic-card-title">Answer out loud</div>
                <p className="mic-card-body">
                  Voice mode listens for the note or fret you say instead of a tap.
                  Your browser will ask to use the microphone next — audio stays on
                  your device and is never recorded or uploaded.
                </p>
                <div className="mic-card-actions">
                  <button className="mic-btn mic-btn-primary" onClick={click(() => { void grantMic(); })}>
                    Allow microphone
                  </button>
                  <button className="mic-btn mic-btn-ghost" onClick={click(() => setMicPrompt(null))}>
                    Not now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mic-card-title">Microphone is blocked</div>
                <p className="mic-card-body">
                  Your browser is refusing microphone access for this site, so
                  voice answers can’t work yet. Tap the 🔒 / 🎤 icon beside the
                  address bar, set the microphone to <strong>Allow</strong>, then
                  reload the page.
                </p>
                <div className="mic-card-actions">
                  <button className="mic-btn mic-btn-primary" onClick={click(() => setMicPrompt(null))}>
                    Got it
                  </button>
                  <button
                    className="mic-btn mic-btn-ghost"
                    onClick={click(() => { setAnswerMode('tap'); saveSetting('pref_answerMode', 'tap'); setMicPrompt(null); })}
                  >
                    Use tap instead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <span className="countdown-num" key={countdown}>{countdown}</span>
        </div>
      )}

      <div className="game-row" ref={gameRowRef}>
        {stageTransition && (
          <div className="stage-transition" role="status" aria-live="polite">
            <div className="stage-transition-label">STAGE COMPLETE</div>
            <div className="stage-transition-name">{stageTransition.name}</div>
            {stageTransition.from !== stageTransition.to && (
              <div className="stage-transition-progress" dir="ltr">
                {stageTransition.from} → {stageTransition.to} QUESTIONS
              </div>
            )}
          </div>
        )}
        <div className="question-col">
          {gameActive && (
            <>
              <div className="string-label" key={`str-${safeGuitarString}`}>{instrument.stringLabels[safeGuitarString]}</div>
              {derivedSettings.byNote
                ? <div className={`note-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className={`fret-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar key={`sb-${questionSeq}`} remaining={remaining} total={questionTime} startAt={questionStart} answered={answered} paused={paused} />
              <div className="game-info-row">
                <span className="game-timer">{remaining}s</span>
                <span className="game-progress-text">{questionNumber}/{derivedSettings.maxQuestions}</span>
                {showScore && multiplierIcon && <span className="multiplier-icon">{multiplierIcon}</span>}
              </div>
              {showScore && (
                <div id="live-score" className="score-live">
                  <AnimatedScore value={scoring.session.score} />
                </div>
              )}
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}{showScore && scoring.session.lastPoints > 0 && feedback.startsWith('✓') ? ` +${scoring.session.lastPoints}` : ''}
              </div>
              {voiceActive && (
                <div className={`voice-status voice-${voice.status}`} role="status" aria-live="polite">
                  {voice.permission === 'denied'
                    ? '🎤 Microphone blocked — enable it or switch to tap'
                    : voice.error === 'network'
                      ? '🎤 Voice needs a connection'
                      : voice.error === 'not-supported'
                        ? '🎤 Voice isn’t working in this browser — try Chrome, or use tap'
                      : voice.error
                        ? '🎤 Didn’t catch that'
                        : voice.status === 'listening'
                          ? `🎤 Listening…${voice.partial ? ` “${voice.partial}”` : ''}`
                          : voice.status === 'heard'
                            ? `🎤 “${voice.partial}”`
                            : '🎤 …'}
                  {(voice.status === 'error') && (
                    <button className="clear-btn voice-retry" onClick={click(voice.retry)}>Retry</button>
                  )}
                </div>
              )}
              {voiceActive && running && !paused && voice.permission !== 'denied' && (
                <VoiceLevelMeter active={running && !paused} />
              )}
            </>
          )}

          {/* Game ended summary */}
          {gameEnded && isStopped && (
            <div className="game-end-summary">
              <div className="game-end-title">🎉 Round Complete!</div>
              {showScore && <div className="game-end-score"><AnimatedScore value={scoring.session.score} /> pts</div>}
              <div className="game-end-details">
                {scoring.session.longestStreak >= 2 && <span>🔥 {scoring.session.longestStreak} streak</span>}
                <span>✓ {sessionHistory.filter(h => h.correct === true).length}/{scoring.session.questionsAnswered}</span>
              </div>
              <button className="clear-btn" onClick={click(() => setGameEnded(false))}>OK</button>
            </div>
          )}

          {/* Controls: Play (centered) → becomes a Pause/Resume toggle plus a separate Stop when playing/paused */}
          <div className="controls">
            {!running && !paused && !countdown ? (
              <button ref={playBtnRef} className="icon-btn play-btn" onClick={click(start)} title="Start">
                <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
              </button>
            ) : running || paused ? (
              <>
                <button
                  className="icon-btn pause-btn"
                  onClick={() => {
                    if (paused) resume();
                    else pause();
                    playClickSound(); haptic.tap();
                  }}
                  title={paused ? 'Resume' : 'Pause'}
                  aria-label={paused ? 'Resume' : 'Pause'}
                >
                  <span className={`morph-icon ${paused ? 'is-resume' : 'is-pause'}`}>
                    <svg className="icon-pause" viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                    <svg className="icon-play" viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                  </span>
                </button>
                <button
                  className="icon-btn stop-btn-icon"
                  onClick={() => { stop(); playClickSound(); haptic.tap(); }}
                  title="Stop"
                  aria-label="Stop"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Keep the grid/circle visible (frozen) while paused; hide only when fully stopped and showing stats/end summary */}
        {(gameActive || (isStopped && !showStats && !showProgress && !gameEnded)) && (
          derivedSettings.byNote ? (
            <FretGrid
              fretFrom={derivedSettings.fretFrom}
              fretTo={derivedSettings.fretTo}
              guitarString={safeGuitarString}
              validFrets={new Set(Object.values(noteFrets).flat())}
              active={isPlaying && !answered}
              correctFrets={gameActive ? remainingFrets : []}
              wrongFret={gameActive ? wrongFret : null}
              foundFrets={gameActive ? foundFrets : []}
              onSelect={selectFret}
              masteryByFret={fretMastery}
              showMastery={!(isPlaying && !answered)}
            />
          ) : (
            <NoteCircle
              notes={cofList}
              activeNotes={isMulti && gameActive ? questionActiveNotes : activeNotes}
              active={isPlaying && !answered}
              correctNote={gameActive ? correctCofNote : null}
              wrongNote={gameActive ? wrongCofNote : null}
              onSelect={selectAnswer}
              guitarString={safeGuitarString}
              fretDots={fretDots}
              noteFrets={noteFrets}
              byString={byString}
              startIndex={startIndex}
              showDots={!(isMulti && derivedSettings.multiStrings.length > 1) || gameActive}
              accidental={accidental}
              notation={notation}
              masteryByNote={noteMastery}
              showMastery={!(isPlaying && !answered)}
            />
          )
        )}
      </div>

      {isStopped && showStats && (
        <div className="stats-wrapper">
          <StatsPanel
            history={historyOps.getEntriesForKey(histKey)}
            maxTime={derivedSettings.time}
            maxQuestions={derivedSettings.maxQuestions}
            accidental={accidental}
            notation={notation}
            everPlayed={true}
            sessionScore={scoring.session.score}
            longestStreak={scoring.session.longestStreak}
            historyKey={histKey}
            onClear={() => { historyOps.clearAllHistory(); setShowStats(false); }}
          />
        </div>
      )}

      {isStopped && showProgress && (
        <div className="stats-wrapper">
          <ProgressPanel
            allHistory={historyOps.allHistory}
            noteNames={cofList}
            accidental={accidental}
            notation={notation}
            instrument={instrument}
            onClose={() => setShowProgress(false)}
          />
        </div>
      )}

      <div className="build-info">
        {__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}
        <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh">↻</button>
      </div>

      <DebugLogPanel />

      {showVoiceCalibration && (
        <VoiceCalibration
          notation={notation}
          accidental={accidental}
          onClose={() => setShowVoiceCalibration(false)}
          onProfileChanged={() => setVoiceEngineEpoch((n) => n + 1)}
        />
      )}
    </div>
  );
}
