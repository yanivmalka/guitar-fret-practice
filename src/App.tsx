import { useState, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import StageNav from './components/StageNav';
import { displayNote } from './utils/music';
import type { HistoryEntry } from './utils/music';
import { preloadAllSamples } from './utils/audio';
import { STAGES } from './utils/stages';
import { saveSetting } from './utils/settings';
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
    setStageIndex,
    goToStage,
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
    start: engineStart, stop, pause, resume, switchStage, selectFret, selectAnswer,
  } = engine;

  const [preloaded, setPreloaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const suggestion = useMemo(() => computeSuggestion(allHistory[stage.id] ?? []), [allHistory, stage.id]);
  const liveSuggestion = (allHistory[stage.id]?.length ?? 0) >= 10 ? suggestion : null;

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
      <h1>🎸 Guitar Fret Practice</h1>

      <StageNav
        stage={stage}
        stageIndex={stageIndex}
        onPrev={() => isPlaying ? switchStage(stageIndex - 1) : (stop(), goToStage(stageIndex - 1))}
        onNext={() => isPlaying ? switchStage(stageIndex + 1) : (stop(), goToStage(stageIndex + 1))}
        isPlaying={isPlaying}
        suggestion={liveSuggestion}
        allHistory={allHistory}
      />

      <button className="toggle-btn" onClick={() => { if (running || paused) stop(); setShowSettings(!showSettings); }}>
        {showSettings ? '▲ Hide Settings' : '⚙ Settings'}
      </button>

      {showSettings && (
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
        />
      )}

      <div className="game-row">
        <div className="question-col">
          {isPlaying && (
            <>
              <div className="string-label">{STRING_DISPLAY[guitarString]}</div>
              {byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental) : '—'}</div>
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
              <StatsPanel history={allHistory[stage.id] ?? []} maxTime={time} accidental={accidental} everPlayed={everPlayed.has(stage.id)} />
              {liveSuggestion === 'next' && stageIndex < STAGES.length - 1 && (
                <div className="stage-suggestion stage-suggestion-next">
                  🔥 Great job! Ready for the next stage?
                  <button className="stage-suggest-btn" onClick={() => goToStage(stageIndex + 1)}>
                    Go to {STAGES[stageIndex + 1].label} ▶
                  </button>
                </div>
              )}
              {liveSuggestion === 'prev' && stageIndex > 0 && (
                <div className="stage-suggestion stage-suggestion-prev">
                  💡 Try the previous stage to build a stronger base.
                  <button className="stage-suggest-btn" onClick={() => { clearStage(stage.id); goToStage(stageIndex - 1); }}>
                    ◀ Go to {STAGES[stageIndex - 1].label}
                  </button>
                </div>
              )}
            </>
          )}

          {paused && <div className="paused-text">⏸ Paused</div>}

          {!byNote && (
            <div className="order-switcher">
              <button className={`order-chip${byString ? ' order-chip-active' : ''}`} onClick={() => setByString(!byString)}>By String</button>
              <button className={`order-chip${!byString && order === 'fifths' ? ' order-chip-active' : ''}`} onClick={() => { setByString(false); setOrder('fifths'); }}>Fifths</button>
              <button className={`order-chip${!byString && order === 'alphabet' ? ' order-chip-active' : ''}`} onClick={() => { setByString(false); setOrder('alphabet'); }}>Alpha</button>
            </div>
          )}
          <div className="controls">
            {!running && !paused ? (
              <>
                <button className="icon-btn play-btn" onClick={start} title="Start">
                  <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </button>
                {(allHistory[stage.id]?.length ?? 0) > 0 && <button className="clear-btn" onClick={clearStats}>Clear</button>}
              </>
            ) : (
              <>
                {!paused
                  ? <button className="icon-btn pause-btn" onClick={pause} title="Pause">
                      <svg viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                    </button>
                  : <button className="icon-btn play-btn" onClick={() => resume(byNote, currentFret, guitarString)} title="Continue">
                      <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                    </button>
                }
                <button className="icon-btn stop-btn-icon" onClick={stop} title="Stop">
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
          />
        )}
      </div>

      <div className="stage-description">
        <span className="stage-desc-filter">
          {stage.dotsOnly ? '🎯 Dots Only' : stage.wholeToneOnly ? '🎵 Natural Notes' : '🎸 Full Chromatic'}
        </span>
        {' · '}
        {descExpanded ? stage.description : stage.shortDesc}
        {' '}
        <button className="desc-toggle-btn" onClick={() => setDescExpanded(v => !v)}>
          {descExpanded ? 'less ▲' : 'more ▼'}
        </button>
      </div>

      <div className="build-info">{__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}</div>
    </div>
  );
}
