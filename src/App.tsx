import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import SelectorPanel from './components/SelectorPanel';
import StatsPanel from './components/StatsPanel';
import Onboarding from './components/Onboarding';
import SpeedBar from './components/SpeedBar';
import { displayNote } from './utils/music';
import type { HistoryEntry, AccidentalMode, OrderMode, NotationMode } from './utils/music';
import { preloadAllSamples, unlockAudio } from './utils/audio';
import { playClickSound, playToggleOnSound, playToggleOffSound, haptic } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { useSelector } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useGameEngine } from './hooks/useGameEngine';
import { useHistory } from './hooks/useHistory';

const STRING_DISPLAY: Record<number, string> = {
  1: 'String 1 · high E', 2: 'String 2 · B', 3: 'String 3 · G',
  4: 'String 4 · D', 5: 'String 5 · A', 6: 'String 6 · low E',
};

export default function App() {
  // ── Selector (replaces useGameSettings) ────────────────────────
  const selector = useSelector();
  const { derivedSettings } = selector;

  // ── Local display state ────────────────────────────────────────
  const [guitarString, setGuitarString] = useState(derivedSettings.guitarString);
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('pref_order', 'fifths'));
  const [accidental] = useState<AccidentalMode>(() => loadSetting('pref_accidental', 'sharps'));

  // Sync guitarString when selector changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setGuitarString(derivedSettings.guitarString); }, [derivedSettings.guitarString]);

  // ── History ────────────────────────────────────────────────────
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

  // ── Derived notes ──────────────────────────────────────────────
  const derived = useDerivedNotes(
    guitarString, derivedSettings.fretFrom, derivedSettings.fretTo,
    derivedSettings.wholeToneOnly, derivedSettings.dotsOnly,
    accidental, order, byString, derivedSettings.multiStrings,
  );
  const { cofList, startIndex, activeNotes, questionActiveNotes, fretDots, noteFrets, isMulti } = derived;

  // ── Game engine ────────────────────────────────────────────────
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
      setTime: () => {},
      setFretFrom: () => {},
      setFretTo: () => {},
      setAccidental: () => {},
      setOrder: () => {},
      setWholeToneOnly: () => {},
      setDotsOnly: () => {},
      setByNote: () => {},
      setMultiStrings: () => {},
      setByString: () => {},
      setStageIndex: () => {},
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

  // ── Stop game when selector changes while playing ──────────────
  const derivedRef = useRef(derivedSettings);
  useEffect(() => {
    if (derivedRef.current !== derivedSettings && running) {
      stop();
    }
    derivedRef.current = derivedSettings;
  }, [derivedSettings, running, stop]);

  // ── UI state ───────────────────────────────────────────────────
  const [preloaded, setPreloaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  const gameRowRef = useRef<HTMLDivElement>(null);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;

  // US-09: wrap any button handler with a click sound
  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

  const start = () => {
    unlockAudio();
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
    setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  };

  const clearStats = () => {
    historyOps.clearHistory(histKey);
  };

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;

  // ── Live speed stats ───────────────────────────────────────────
  const sessionHistory = historyOps.history;
  const speedStats = useMemo(() => {
    const correctEntries = sessionHistory.filter(h => h.correct === true);
    if (correctEntries.length === 0) return { avg: 0, best: 0, count: 0 };
    const times = correctEntries.map(h => h.seconds);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const best = Math.min(...times);
    return { avg: Math.round(avg * 10) / 10, best: Math.round(best * 10) / 10, count: correctEntries.length };
  }, [sessionHistory]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding onDone={() => {
          setOnboardingDone(true);
          saveSetting('onboardingDone', true);
        }} />
      )}
      <h1>🎸 Guitar Fret Practice</h1>

      <SelectorPanel
        selector={selector.state}
        onStringSelect={selector.onStringSelect}
        onMultiToggle={selector.onMultiToggle}
        onModeSelect={selector.onModeSelect}
        onFretRangeToggle={selector.onFretRangeToggle}
        onDifficultySelect={selector.onDifficultySelect}
        isPlaying={isPlaying}
        activeString={isPlaying ? guitarString : undefined}
        activeFret={isPlaying ? askedFret : undefined}
      />

      {/* Order switcher row — visible when in By Fret mode */}
      <div className="order-switcher" style={{ visibility: derivedSettings.byNote ? 'hidden' : 'visible' }}>
        <button className={`order-chip chip-toggle${byString ? ' chip-toggle-active' : ''}`} onClick={() => { byString ? playToggleOffSound() : playToggleOnSound(); haptic.tap(); const next = !byString; setByString(next); saveSetting('pref_byString', next); }}>By String</button>
        <button className={`order-chip${order === 'fifths' ? ' order-chip-active' : ''}`} onClick={() => { playClickSound(); haptic.tap(); setOrder('fifths'); saveSetting('pref_order', 'fifths'); }}>Fifths</button>
        <button className={`order-chip${order === 'alphabet' ? ' order-chip-active' : ''}`} onClick={() => { playClickSound(); haptic.tap(); setOrder('alphabet'); saveSetting('pref_order', 'alphabet'); }}>Alpha</button>
      </div>

      <div className="game-row" ref={gameRowRef}>
        <div className="question-col">
          {isPlaying && (
            <>
              <div className="string-label">{STRING_DISPLAY[guitarString]}</div>
              {derivedSettings.byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar remaining={remaining} total={derivedSettings.time} answered={answered} />
              {speedStats.count > 0 && (
                <div className="speed-avg">⚡ {speedStats.avg}s avg</div>
              )}
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}
              </div>
            </>
          )}

          {paused && <div className="paused-text">⏸ Paused</div>}

          <div className="controls">
            {!running && !paused ? (
              <>
                <button className="icon-btn play-btn" onClick={click(start)} title="Start">
                  <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </button>
                {hasHistory && <button className="clear-btn" onClick={click(clearStats)}>Clear</button>}
              </>
            ) : (
              <>
                {!paused
                  ? <button className="icon-btn pause-btn" onClick={click(pause)} title="Pause">
                      <svg viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                    </button>
                  : <button className="icon-btn play-btn" onClick={click(() => resume(derivedSettings.byNote, currentFret, guitarString))} title="Continue">
                      <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                    </button>
                }
                <button className="icon-btn stop-btn-icon" onClick={click(stop)} title="Stop">
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Show NoteCircle/FretGrid when playing, paused, or stopped with no history */}
        {(!isStopped || !hasHistory) && (
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
              correctNote={correctCofNote}
              wrongNote={wrongCofNote}
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

      {/* Show stats when stopped AND there is history */}
      {isStopped && hasHistory && (
        <div className="stats-wrapper">
          <StatsPanel
            history={historyOps.getEntriesForKey(histKey)}
            maxTime={derivedSettings.time}
            maxQuestions={derivedSettings.maxQuestions}
            accidental={accidental}
            notation={notation}
            everPlayed={true}
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
