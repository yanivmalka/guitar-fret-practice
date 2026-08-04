import { useState, useMemo, useRef } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import StageNav from './components/StageNav';
import Onboarding from './components/Onboarding';
import { displayNote } from './utils/music';
import type { HistoryEntry } from './utils/music';
import { preloadAllSamples } from './utils/audio';
import { playClickSound, haptic } from './utils/feedback';
import { STAGES } from './utils/stages';
import { loadSetting, saveSetting } from './utils/settings';
import { useGameSettings } from './hooks/useGameSettings';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useGameEngine } from './hooks/useGameEngine';
import { useHistory } from './hooks/useHistory';

function computeSuggestion(history: HistoryEntry[]): 'next' | 'prev' | null {
  if (history.length < 10) return null;
  const correct = history.filter(h => h.correct === true).length;
  const rate = correct / history.length;
  if (rate >= 0.85) return 'next';
  if (rate < 0.35) return 'prev';
  return null;
}

const STRING_DISPLAY: Record<number, string> = {
  1: 'String 1 · high E', 2: 'String 2 · B', 3: 'String 3 · G',
  4: 'String 4 · D', 5: 'String 5 · A', 6: 'String 6 · low E',
};

export default function App() {
  const settings = useGameSettings();
  const {
    stageIndex, stage,
    guitarString, setGuitarString,
    time, setTime,
    fretFrom, setFretFrom,
    fretTo, setFretTo,
    accidental, setAccidental,
    order, setOrder,
    wholeToneOnly, setWholeToneOnly,
    dotsOnly, setDotsOnly,
    byString, setByString,
    byNote, setByNote,
    multiStrings, setMultiStrings,
    notation, setNotation,
    setStageIndex,
    goToStage,
    isCustomized,
    resetToStage,
  } = settings;

  const derived = useDerivedNotes(
    guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly,
    accidental, order, byString, multiStrings,
  );
  const { cofList, startIndex, activeNotes, questionActiveNotes, fretDots, noteFrets, isMulti, activeStrings } = derived;

  const historyOps = useHistory(stage.id);
  const { allHistory, addEntry, markPlayed, clearStage, resetSession, everPlayed } = historyOps;

  const engine = useGameEngine(
    { guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly, byNote, isMulti, activeStrings, time, accidental, order },
    { setGuitarString, setTime, setFretFrom, setFretTo, setAccidental, setOrder, setWholeToneOnly, setDotsOnly, setByNote, setMultiStrings, setByString, setStageIndex },
    { addEntry, markPlayed, resetSession, history: historyOps.history },
    saveSetting,
  );
  const {
    running, paused, currentFret, currentNote, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
  } = engine;

  const [preloaded, setPreloaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // US-09: wrap any button handler with a click sound
  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

  const showDesc = () => {
    setDescExpanded(true);
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(() => setDescExpanded(false), 3000);
  };
  const hideDesc = () => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    setDescExpanded(false);
  };

  const suggestion = useMemo(() => computeSuggestion(historyOps.history), [historyOps.history]);
  const liveSuggestion = historyOps.history.length >= 10 ? suggestion : null;

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;

  const start = () => {
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    engineStart(stage.id, stage.maxQuestions, time, byNote);
    setShowSettings(false);
  };

  const clearStats = () => {
    clearStage(stage.id);
  };

  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding onDone={({ stageIndex: si }) => {
          goToStage(si);
          setOnboardingDone(true);
        }} />
      )}
      <h1>🎸 Guitar Fret Practice</h1>

      <StageNav
        stage={stage}
        stageIndex={stageIndex}
        onPrev={() => { stop(); goToStage(stageIndex - 1); }}
        onNext={() => { stop(); goToStage(stageIndex + 1); }}
        isPlaying={isPlaying}
        suggestion={liveSuggestion}
        allHistory={allHistory}
      />

      {/* Burger menu button — fixed top-right */}
      <button className="burger-btn" onClick={click(() => { if (running || paused) stop(); setShowSettings(s => !s); })} title="Settings">
        {showSettings ? '✕' : '☰'}
      </button>

      {/* Floating settings overlay */}
      {showSettings && (
        <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="settings-panel">
            {isCustomized && (
              <span className="custom-stage-badge" style={{ marginBottom: 10, display: 'flex' }}>
                ✎ custom
                <button className="custom-reset-btn" onClick={click(resetToStage)}>↺ reset</button>
              </span>
            )}
            <Settings
              guitarString={guitarString} setGuitarString={setGuitarString}
              time={time} setTime={setTime}
              fretFrom={fretFrom} setFretFrom={setFretFrom}
              fretTo={fretTo} setFretTo={setFretTo}
              accidental={accidental} setAccidental={setAccidental}
              order={order} setOrder={setOrder}
              wholeToneOnly={wholeToneOnly} setWholeToneOnly={(v) => { setWholeToneOnly(v); if (v) setDotsOnly(false); }}
              dotsOnly={dotsOnly} setDotsOnly={(v) => { setDotsOnly(v); if (v) setWholeToneOnly(false); }}
              byString={byString} setByString={setByString}
              byNote={byNote} setByNote={setByNote}
              multiStrings={multiStrings} setMultiStrings={setMultiStrings}
              activeNotes={activeNotes}
              showOrderSwitcher={!byNote}
              notation={notation} setNotation={setNotation}
            />
          </div>
        </div>
      )}

      {/* Description button and order switcher */}
      {!byNote && !showSettings && (
        <div className="order-switcher">
          <button className={`order-chip${byString ? ' order-chip-active' : ''}`} onClick={click(() => setByString(!byString))}>By String</button>
          <button className={`order-chip${!byString && order === 'fifths' ? ' order-chip-active' : ''}`} onClick={click(() => { setByString(false); setOrder('fifths'); })}>Fifths</button>
          <button className={`order-chip${!byString && order === 'alphabet' ? ' order-chip-active' : ''}`} onClick={click(() => { setByString(false); setOrder('alphabet'); })}>Alpha</button>
        </div>
      )}

      {/* Custom badge when visible (not in settings overlay) */}
      {isCustomized && !running && !showSettings && (
        <span className="custom-stage-badge">
          ✎ custom
          <button className="custom-reset-btn" onClick={click(resetToStage)}>↺ reset</button>
        </span>
      )}

      <div className="game-row">
        <div className="question-col">
          {isPlaying && (
            <>
              <div className="string-label">{STRING_DISPLAY[guitarString]}</div>
              {byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
              }
              <div className="countdown">{remaining > 0 ? remaining : ''}</div>
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}
              </div>
            </>
          )}

          {isStopped && (
            <>
              <StatsPanel history={allHistory[stage.id] ?? []} maxTime={time} accidental={accidental} notation={notation} everPlayed={everPlayed.has(stage.id)} />
              {liveSuggestion === 'next' && stageIndex < STAGES.length - 1 && (
                <div className="stage-suggestion stage-suggestion-next">
                  🔥 Great job! Ready for the next stage?
                  <button className="stage-suggest-btn" onClick={click(() => goToStage(stageIndex + 1))}>
                    Go to {STAGES[stageIndex + 1].label} ▶
                  </button>
                </div>
              )}
              {liveSuggestion === 'prev' && stageIndex > 0 && (
                <div className="stage-suggestion stage-suggestion-prev">
                  💡 Try the previous stage to build a stronger base.
                  <button className="stage-suggest-btn" onClick={click(() => { clearStage(stage.id); goToStage(stageIndex - 1); })}>
                    ◀ Go to {STAGES[stageIndex - 1].label}
                  </button>
                </div>
              )}
            </>
          )}

          {paused && <div className="paused-text">⏸ Paused</div>}

          <div className="controls">
            {!running && !paused ? (
              <>
                <button className="icon-btn play-btn" onClick={click(start)} title="Start">
                  <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </button>
                {(allHistory[stage.id]?.length ?? 0) > 0 && <button className="clear-btn" onClick={click(clearStats)}>Clear</button>}
              </>
            ) : (
              <>
                {!paused
                  ? <button className="icon-btn pause-btn" onClick={click(pause)} title="Pause">
                      <svg viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                    </button>
                  : <button className="icon-btn play-btn" onClick={click(() => resume(byNote, currentFret, guitarString))} title="Continue">
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

        {byNote ? (
          <FretGrid
            fretFrom={fretFrom}
            fretTo={fretTo}
            guitarString={guitarString}
            validFrets={new Set(Object.values(noteFrets).flat())}
            active={isPlaying && !answered}
            correctFrets={remainingFrets}
            wrongFret={wrongFret}
            foundFrets={foundFrets}
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
            showDots={!(isMulti && multiStrings.length > 1) || isPlaying}
            accidental={accidental}
            notation={notation}
          />
        )}
      </div>

      {/* ? info button at bottom center */}
      {!descExpanded
        ? <button className="desc-question-btn-bottom" onClick={click(showDesc)}>?</button>
        : <div className="stage-description-bottom" onClick={hideDesc} style={{ cursor: 'pointer' }}>
            <span className="stage-desc-filter">
              {stage.dotsOnly ? '🎯 Dots Only' : stage.wholeToneOnly ? '🎵 Natural Notes' : '🎸 Full Chromatic'}
            </span>
            {' · '}
            {stage.shortDesc}
          </div>
      }

      <div className="build-info">{__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}</div>
    </div>
  );
}
