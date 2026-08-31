import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import SelectorPanel from './components/SelectorPanel';
import StatsPanel from './components/StatsPanel';
import Onboarding from './components/Onboarding';
import SpeedBar from './components/SpeedBar';
import AnimatedScore from './components/AnimatedScore';
import { displayNote } from './utils/music';
import type { HistoryEntry, AccidentalMode, OrderMode, NotationMode } from './utils/music';
import { preloadAllSamples, unlockAudio } from './utils/audio';
import { App as CapacitorApp } from '@capacitor/app';
import { playClickSound, playToggleOnSound, playToggleOffSound, playStickClick, haptic, celebrateTier3 } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { loadBest, saveBest, loadAllBests, writeAllBests } from './utils/personalBest';
import { useAuth } from './hooks/useAuth';
import { bootstrapUser, pushAll, syncedUser, clearSyncedUser } from './utils/sync';
import { useSelector, nextDifficulty, totalRunQuestions } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useGameEngine } from './hooks/useGameEngine';
import { useHistory } from './hooks/useHistory';
import { useScoring } from './hooks/useScoring';

const STRING_DISPLAY: Record<number, string> = {
  1: 'String 1 · high E', 2: 'String 2 · B', 3: 'String 3 · G',
  4: 'String 4 · D', 5: 'String 5 · A', 6: 'String 6 · low E',
};

// Uppercase display name for the Auto Advance stage-transition banner.
const STAGE_NAME: Record<string, string> = { dots: 'DOTS', naturals: 'NATURALS', full: 'FULL' };

export default function App() {
  const selector = useSelector();
  const { derivedSettings } = selector;

  const [guitarString, setGuitarString] = useState(derivedSettings.guitarString);
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation, setNotation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('pref_order', 'fifths'));
  const [accidental] = useState<AccidentalMode>(() => loadSetting('pref_accidental', 'sharps'));

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
          // Already merged before — just re-push anything written offline.
          await pushAll(user.id, getAllHistory(), loadAllBests());
        }
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user, replaceAllHistory, getAllHistory]);

  const derived = useDerivedNotes(
    guitarString, derivedSettings.fretFrom, derivedSettings.fretTo,
    derivedSettings.wholeToneOnly, derivedSettings.dotsOnly,
    accidental, order, byString, derivedSettings.multiStrings,
  );
  const { cofList, startIndex, activeNotes, questionActiveNotes, fretDots, noteFrets, isMulti } = derived;
  const scoring = useScoring();

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
      guitarString,
      fretFrom: derivedSettings.fretFrom,
      fretTo: derivedSettings.fretTo,
      wholeToneOnly: derivedSettings.wholeToneOnly,
      dotsOnly: derivedSettings.dotsOnly,
      byNote: derivedSettings.byNote,
      isMulti: derivedSettings.multiStrings.length > 0,
      activeStrings: derivedSettings.multiStrings.length > 0 ? derivedSettings.multiStrings : [guitarString],
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
      if (runningRef2.current) pauseRef.current();
    };
    const onVisibilityChange = () => { if (document.hidden) pauseEverything(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('pagehide', pauseEverything);

    let removeAppStateListener: (() => void) | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) pauseEverything();
    }).then((handle) => { removeAppStateListener = () => handle.remove(); });
    CapacitorApp.addListener('pause', pauseEverything).then((handle) => {
      const prev = removeAppStateListener;
      removeAppStateListener = () => { prev?.(); handle.remove(); };
    });

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pagehide', pauseEverything);
      removeAppStateListener?.();
    };
  }, [pause]);

  const [preloaded, setPreloaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  const [showStats, setShowStats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const infoTimerRef = useRef<number | null>(null);
  const gameRowRef = useRef<HTMLDivElement>(null);
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

  // Bottom-center "?" affordance: briefly explains the clock / timing method,
  // then auto-dismisses after 3s. Re-tapping restarts the 3s window.
  const openInfo = () => {
    setShowInfo(true);
    if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
    infoTimerRef.current = window.setTimeout(() => setShowInfo(false), 3000);
  };
  useEffect(() => () => { if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current); }, []);

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;

  // While actively playing the game stays clean and focused — the hamburger
  // (and the stats shortcut) are only offered when stopped or paused.
  const showBurger = !isPlaying && !pendingAutoAdvance && countdown === null;

  useEffect(() => { setShowStats(false); setGameEnded(false); tier3FiredRef.current = false; }, [histKey]);

  // Close the settings overlay with Escape (desktop / keyboard users).
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

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
        celebrateTier3(score, scoring.session.longestStreak);
      }
    }
    wasRunningRef.current = running;
  }, [running, paused, pendingAutoAdvance, scoring.session.questionsAnswered, scoring.session.score, scoring.session.longestStreak, histKey, historyOps.history]);

  const start = () => {
    unlockAudio();
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
    // Countdown 3-2-1
    setCountdown(3);
    playStickClick();
    let c = 3;
    const interval = setInterval(() => {
      c--;
      if (c > 0) { setCountdown(c); playStickClick(); }
      else {
        clearInterval(interval);
        setCountdown(null);
        playStickClick();
        engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 700);
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

  // One definition of the settings panel, rendered in two places: the compact
  // read-only HUD during play (panelPlaying = true) and the full editable panel
  // inside the hamburger overlay (panelPlaying = false).
  const renderSelectorPanel = (panelPlaying: boolean) => (
    <SelectorPanel
      selector={selector.state}
      onStringSelect={selector.onStringSelect}
      onMultiToggle={selector.onMultiToggle}
      onModeSelect={selector.onModeSelect}
      onFretRangeToggle={selector.onFretRangeToggle}
      onDifficultySelect={selector.onDifficultySelect}
      onAutoAdvanceToggle={() => { if (selector.state.autoAdvance) playToggleOffSound(); else playToggleOnSound(); haptic.tap(); selector.onAutoAdvanceToggle(); }}
      isPlaying={panelPlaying}
      activeString={gameActive ? guitarString : undefined}
      activeFret={gameActive ? askedFret : undefined}
      byString={byString}
      order={order}
      onByStringToggle={() => { byString ? playToggleOffSound() : playToggleOnSound(); haptic.tap(); const next = !byString; setByString(next); saveSetting('pref_byString', next); }}
      onOrderChange={(o) => { playClickSound(); haptic.tap(); setOrder(o); saveSetting('pref_order', o); }}
      notation={notation}
      onNotationChange={(n) => { playClickSound(); haptic.tap(); setNotation(n); saveSetting('pref_notation', n); }}
      showStats={showStats}
      onStatsToggle={() => { playClickSound(); setShowStats(s => !s); }}
      hasHistory={hasHistory}
    />
  );

  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding onDone={() => { setOnboardingDone(true); saveSetting('onboardingDone', true); }} />
      )}

      {/* Pause: dim the entire app screen; .controls (Resume/Stop) sits
          above this via z-index so it stays sharp and clickable in place. */}
      {paused && <div className="pause-overlay" aria-hidden="true" />}

      {/* Settings hamburger + stats shortcut — hidden while actively playing so
          the game stays clean and focused. */}
      {showBurger && (
        <button
          className="burger-btn"
          onClick={click(() => setSettingsOpen(true))}
          aria-label="Open settings"
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
      {showBurger && hasHistory && (
        <button
          className="burger-btn stats-burger-btn"
          onClick={click(() => setShowStats(s => !s))}
          aria-label="Toggle statistics"
          aria-pressed={showStats}
          title="Statistics"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="2" y="10" width="4" height="8" rx="1" fill="currentColor" />
            <rect x="8" y="6" width="4" height="12" rx="1" fill="currentColor" />
            <rect x="14" y="2" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}

      <h1>🎸 Guitar Fret Practice</h1>

      {/* Compact read-only HUD (fret neck + selection summary) during play. */}
      {gameActive && renderSelectorPanel(true)}

      {/* All game settings live here. Backdrop click or Escape dismisses. */}
      {settingsOpen && (
        <div className="settings-overlay" onClick={click(() => setSettingsOpen(false))}>
          <div
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Game settings"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSelectorPanel(false)}
            {auth.configured && (
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
                    Sign in with Google
                  </button>
                )}
              </div>
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
              <div className="string-label" key={guitarString}>{STRING_DISPLAY[guitarString]}</div>
              {derivedSettings.byNote
                ? <div className={`note-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className={`fret-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar key={questionSeq} remaining={remaining} total={questionTime} startAt={questionStart} answered={answered} paused={paused} />
              <div className="game-info-row">
                <span className="game-timer">{remaining}s</span>
                <span className="game-progress-text">{questionNumber}/{derivedSettings.maxQuestions}</span>
                {multiplierIcon && <span className="multiplier-icon">{multiplierIcon}</span>}
              </div>
              <div id="live-score" className="score-live">
                <AnimatedScore value={scoring.session.score} />
              </div>
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}{scoring.session.lastPoints > 0 && feedback.startsWith('✓') ? ` +${scoring.session.lastPoints}` : ''}
              </div>
            </>
          )}

          {/* Game ended summary */}
          {gameEnded && isStopped && (
            <div className="game-end-summary">
              <div className="game-end-title">🎉 Round Complete!</div>
              <div className="game-end-score"><AnimatedScore value={scoring.session.score} /> pts</div>
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
              <button className="icon-btn play-btn" onClick={click(start)} title="Start">
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
        {(gameActive || (isStopped && !showStats && !gameEnded)) && (
          derivedSettings.byNote ? (
            <FretGrid
              fretFrom={derivedSettings.fretFrom}
              fretTo={derivedSettings.fretTo}
              guitarString={guitarString}
              validFrets={new Set(Object.values(noteFrets).flat())}
              active={isPlaying && !answered}
              correctFrets={gameActive ? remainingFrets : []}
              wrongFret={gameActive ? wrongFret : null}
              foundFrets={gameActive ? foundFrets : []}
              onSelect={selectFret}
            />
          ) : (
            <NoteCircle
              notes={cofList}
              activeNotes={isMulti && gameActive ? questionActiveNotes : activeNotes}
              active={isPlaying && !answered}
              correctNote={gameActive ? correctCofNote : null}
              wrongNote={gameActive ? wrongCofNote : null}
              onSelect={selectAnswer}
              guitarString={guitarString}
              fretDots={fretDots}
              noteFrets={noteFrets}
              byString={byString}
              startIndex={startIndex}
              showDots={!(isMulti && derivedSettings.multiStrings.length > 1) || gameActive}
              accidental={accidental}
              notation={notation}
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
            onClear={() => { historyOps.clearHistory(histKey); setShowStats(false); }}
          />
        </div>
      )}

      {/* Bottom-center "?" — quick explanation of the clock / timing method */}
      <div className="info-affordance">
        {showInfo && (
          <div className="info-bubble" role="status" aria-live="polite">
            Read the note wheel like a clock: your open string sits at 12 o'clock,
            and the dots under each note show its fret. Answer before the timing
            bar empties.
          </div>
        )}
        <button
          type="button"
          className="info-btn"
          onClick={() => { playClickSound(); haptic.tap(); openInfo(); }}
          aria-label="How this works"
          title="How this works"
        >
          ?
        </button>
      </div>

      <div className="build-info">
        {__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}
        <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh">↻</button>
      </div>
    </div>
  );
}
