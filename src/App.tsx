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
import { playClickSound, playToggleOnSound, playToggleOffSound, playStickClick, haptic } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { useSelector, nextDifficulty } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useGameEngine } from './hooks/useGameEngine';
import { useHistory } from './hooks/useHistory';
import { useScoring } from './hooks/useScoring';

const STRING_DISPLAY: Record<number, string> = {
  1: 'String 1 · high E', 2: 'String 2 · B', 3: 'String 3 · G',
  4: 'String 4 · D', 5: 'String 5 · A', 6: 'String 6 · low E',
};

export default function App() {
  const selector = useSelector();
  const { derivedSettings } = selector;

  const [guitarString, setGuitarString] = useState(derivedSettings.guitarString);
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
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
  const handleAutoComplete = useCallback(() => {
    if (!selector.state.autoAdvance) return;
    const next = nextDifficulty(selector.state.difficulty);
    if (!next) return;
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
      getStreak: scoring.getStreak,
    },
    {
      onComplete: handleAutoComplete,
    },
  );
  const {
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
  } = engine;

  // Runs right after the difficulty bump above has re-rendered (so
  // derivedSettings already reflects the new stage) and before the browser
  // paints, so there's no visible flash of the idle/selector screen between
  // stages — score/streak/session are untouched since this calls the
  // engine's own start(), not App's start() (which would reset scoring).
  useLayoutEffect(() => {
    if (!pendingAutoAdvance) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingAutoAdvance(false);
    engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
  }, [pendingAutoAdvance, derivedSettings, engineStart]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!paused) setGuitarString(derivedSettings.guitarString); }, [derivedSettings.guitarString, paused]);

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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const gameRowRef = useRef<HTMLDivElement>(null);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;
  // The game screen (question, grid/circle, selector-mini) stays visible and
  // frozen while paused, not just while actively running.
  const gameActive = running || paused;

  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;

  useEffect(() => { setShowStats(false); setGameEnded(false); }, [histKey]);

  const sessionHistory = historyOps.history;

  // Detect game end (skipped when Auto Advance is about to continue straight
  // into the next stage, so the "round complete" screen doesn't flash up for
  // a transition that isn't actually ending the session).
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !running && !paused && scoring.session.questionsAnswered > 0 && !pendingAutoAdvance) {
      setGameEnded(true);
    }
    wasRunningRef.current = running;
  }, [running, paused, scoring.session.questionsAnswered, pendingAutoAdvance]);

  const start = () => {
    unlockAudio();
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    scoring.reset();
    setGameEnded(false);
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

  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding onDone={() => { setOnboardingDone(true); saveSetting('onboardingDone', true); }} />
      )}
      <h1>🎸 Guitar Fret Practice</h1>

      <SelectorPanel
        selector={selector.state}
        onStringSelect={selector.onStringSelect}
        onMultiToggle={selector.onMultiToggle}
        onModeSelect={selector.onModeSelect}
        onFretRangeToggle={selector.onFretRangeToggle}
        onDifficultySelect={selector.onDifficultySelect}
        onAutoAdvanceToggle={() => { if (selector.state.autoAdvance) playToggleOffSound(); else playToggleOnSound(); haptic.tap(); selector.onAutoAdvanceToggle(); }}
        isPlaying={gameActive}
        activeString={gameActive ? guitarString : undefined}
        activeFret={gameActive ? askedFret : undefined}
        byString={byString}
        order={order}
        onByStringToggle={() => { byString ? playToggleOffSound() : playToggleOnSound(); haptic.tap(); const next = !byString; setByString(next); saveSetting('pref_byString', next); }}
        onOrderChange={(o) => { playClickSound(); haptic.tap(); setOrder(o); saveSetting('pref_order', o); }}
        showStats={showStats}
        onStatsToggle={() => { playClickSound(); setShowStats(s => !s); }}
        hasHistory={hasHistory}
      />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <span className="countdown-num" key={countdown}>{countdown}</span>
        </div>
      )}

      <div className="game-row" ref={gameRowRef}>
        <div className="question-col">
          {gameActive && (
            <>
              <div className="string-label" key={guitarString}>{STRING_DISPLAY[guitarString]}</div>
              {derivedSettings.byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar remaining={remaining} total={derivedSettings.time} answered={answered} paused={paused} />
              <div className="game-info-row">
                <span className="game-timer">{remaining}s</span>
                <span className="game-progress-text">{scoring.session.questionsAnswered}/{derivedSettings.maxQuestions}</span>
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
              <button className="clear-btn" onClick={() => setGameEnded(false)}>OK</button>
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

      <div className="build-info">
        {__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}
        <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh">↻</button>
      </div>
    </div>
  );
}
