import { useState, useEffect, useCallback, useRef } from 'react';
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
import { playClickSound, playToggleOnSound, playToggleOffSound, haptic } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { useSelector } from './hooks/useSelector';
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setGuitarString(derivedSettings.guitarString); }, [derivedSettings.guitarString]);

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
  );
  const {
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
  } = engine;

  const derivedRef = useRef(derivedSettings);
  useEffect(() => {
    if (derivedRef.current !== derivedSettings && running) { stop(); }
    derivedRef.current = derivedSettings;
  }, [derivedSettings, running, stop]);

  const [preloaded, setPreloaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  const [showStats, setShowStats] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const gameRowRef = useRef<HTMLDivElement>(null);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;

  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;

  useEffect(() => { setShowStats(false); setGameEnded(false); }, [histKey]);

  const scoring = useScoring();
  const prevHistLenRef = useRef(0);
  const sessionHistory = historyOps.history;

  useEffect(() => {
    const len = sessionHistory.length;
    if (len > prevHistLenRef.current) {
      const latest = sessionHistory[len - 1];
      if (latest.correct === true) scoring.onCorrect();
      else if (latest.correct === false) scoring.onWrong();
      else scoring.onTimeout();
    }
    prevHistLenRef.current = len;
  }, [sessionHistory, scoring.onCorrect, scoring.onWrong, scoring.onTimeout]);

  // Detect game end
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !running && !paused && scoring.session.questionsAnswered > 0) {
      setGameEnded(true);
    }
    wasRunningRef.current = running;
  }, [running, paused, scoring.session.questionsAnswered]);

  const start = () => {
    unlockAudio();
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    scoring.reset();
    prevHistLenRef.current = 0;
    setGameEnded(false);
    // Countdown 3-2-1
    setCountdown(3);
    let c = 3;
    const interval = setInterval(() => {
      c--;
      if (c > 0) { setCountdown(c); }
      else {
        clearInterval(interval);
        setCountdown(null);
        engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 700);
  };

  // Multiplier level (3 steps: 1=normal, 2=fast, 3=blazing)
  const multiplierLevel = scoring.session.streak >= 5 ? 3 : scoring.session.streak >= 3 ? 2 : scoring.session.streak >= 1 ? 1 : 0;
  const multiplierIcon = multiplierLevel >= 3 ? '🔥🔥🔥' : multiplierLevel >= 2 ? '🔥🔥' : multiplierLevel >= 1 ? '🔥' : '';

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
        isPlaying={isPlaying || paused}
        activeString={(isPlaying || paused) ? guitarString : undefined}
        activeFret={isPlaying ? askedFret : undefined}
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
          {isPlaying && (
            <>
              <div className="string-label" key={guitarString}>{STRING_DISPLAY[guitarString]}</div>
              {derivedSettings.byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar remaining={remaining} total={derivedSettings.time} answered={answered} />
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

          {paused && <div className="paused-text">⏸ Paused</div>}

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

          {/* Controls: Play (centered) → becomes Pause when playing, Stop appears to the right */}
          <div className="controls">
            {!running && !paused && !countdown ? (
              <button className="icon-btn play-btn" onClick={click(start)} title="Start">
                <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
              </button>
            ) : running ? (
              <>
                <button className="icon-btn pause-btn" onClick={() => { pause(); playClickSound(); haptic.tap(); }} title="Pause">
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                </button>
                <button className="icon-btn stop-btn-icon" onClick={() => { stop(); playClickSound(); haptic.tap(); }} title="Stop">
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
                </button>
              </>
            ) : paused ? (
              <>
                <button className="icon-btn play-btn" onClick={() => { resume(derivedSettings.byNote, currentFret, guitarString); playClickSound(); haptic.tap(); }} title="Continue">
                  <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </button>
                <button className="icon-btn stop-btn-icon" onClick={() => { stop(); playClickSound(); haptic.tap(); }} title="Stop">
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Hide NoteCircle/FretGrid when paused, show stats, or game ended */}
        {(!isStopped && !paused || (isStopped && !showStats && !gameEnded)) && (
          derivedSettings.byNote ? (
            <FretGrid
              fretFrom={derivedSettings.fretFrom}
              fretTo={derivedSettings.fretTo}
              guitarString={guitarString}
              validFrets={new Set(Object.values(noteFrets).flat())}
              active={isPlaying && !answered}
              correctFrets={running ? remainingFrets : []}
              wrongFret={running ? wrongFret : null}
              foundFrets={running ? foundFrets : []}
              onSelect={selectFret}
            />
          ) : (
            <NoteCircle
              notes={cofList}
              activeNotes={isMulti && isPlaying ? questionActiveNotes : activeNotes}
              active={isPlaying && !answered}
              correctNote={running ? correctCofNote : null}
              wrongNote={running ? wrongCofNote : null}
              onSelect={selectAnswer}
              guitarString={guitarString}
              fretDots={fretDots}
              noteFrets={noteFrets}
              byString={byString}
              startIndex={startIndex}
              showDots={!(isMulti && derivedSettings.multiStrings.length > 1) || isPlaying}
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
