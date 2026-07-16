import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import StageNav from './components/StageNav';
import { notes, getCofNotes, getStringStartIndex, displayNote, notesMatch, getCorrectCofNote, getValidFrets } from './utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from './utils/music';
import { playNote, playNoteSingle, stopPlayback, beep, isSoundPlaying, preloadAllSamples } from './utils/audio';
import { STAGES } from './utils/stages';

function loadSetting<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveSetting(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

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
  const [stageIndex, setStageIndex] = useState(() => loadSetting('stageIndex', 0));
  const stage = STAGES[stageIndex];

  const [guitarString, setGuitarString] = useState(stage.string);
  const [time, setTime] = useState(stage.time);
  const [fretFrom, setFretFrom] = useState(stage.fretFrom);
  const [fretTo, setFretTo] = useState(stage.fretTo);
  const [accidental, setAccidental] = useState<AccidentalMode>(stage.accidental);
  const [order, setOrder] = useState<OrderMode>(stage.order);
  const [wholeToneOnly, setWholeToneOnly] = useState(stage.wholeToneOnly);
  const [dotsOnly, setDotsOnly] = useState(stage.dotsOnly);
  const [byString, setByString] = useState(true);
  const [byNote, setByNote] = useState(stage.byNote);
  const [multiStrings, setMultiStrings] = useState<number[]>(stage.multiStrings);

  useEffect(() => { saveSetting('stageIndex', stageIndex); }, [stageIndex]);

  const applyStage = useCallback((idx: number) => {
    const s = STAGES[idx];
    setGuitarString(s.string);
    setTime(s.time);
    setFretFrom(s.fretFrom);
    setFretTo(s.fretTo);
    setAccidental(s.accidental);
    setOrder(s.order);
    setWholeToneOnly(s.wholeToneOnly);
    setDotsOnly(s.dotsOnly);
    setByNote(s.byNote);
    setMultiStrings(s.multiStrings);
    setByString(true);
  }, []);

  const goToStage = useCallback((idx: number) => {
    if (idx < 0 || idx >= STAGES.length) return;
    setStageIndex(idx);
    applyStage(idx);
  }, [applyStage]);

  // Ref so game-loop callbacks always read the current `time` value
  const timeRef = useRef(time);
  useEffect(() => { timeRef.current = time; }, [time]);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [, setCount] = useState(0);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctCofNote, setCorrectCofNote] = useState<string | null>(null);
  const [wrongCofNote, setWrongCofNote] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Per-stage history retained across stage switches, keyed by stage id
  const [allHistory, setAllHistory] = useState<Record<number, HistoryEntry[]>>({});

  // Append an entry to current session history AND persist it into allHistory
  const stageIdRef = useRef(stage.id);
  useEffect(() => { stageIdRef.current = stage.id; }, [stage.id]);
  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
    setAllHistory(prev => {
      const sid = stageIdRef.current;
      return { ...prev, [sid]: [...(prev[sid] ?? []), entry] };
    });
  }, []);
  const [answered, setAnswered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const [remainingFrets, setRemainingFrets] = useState<number[]>([]);
  const [foundFrets, setFoundFrets] = useState<number[]>([]);
  const [wrongFret, setWrongFret] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const questionStartRef = useRef(0);
  const runningRef = useRef(false);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const lastNoteRef = useRef<string | null>(null);
  const pausedTimeRef = useRef(0);
  const remainingFretsRef = useRef<number[]>([]);
  const askedFretRef = useRef<number>(0);
  const currentQuestionStringRef = useRef<number>(guitarString);

  const isMulti = multiStrings.length > 0;
  const activeStrings = isMulti ? multiStrings : [guitarString];

  const cofList = getCofNotes(accidental, order, wholeToneOnly);
  const startIndex = byString ? getStringStartIndex(accidental, order, wholeToneOnly, guitarString - 1) : 0;

  const activeNotes = useMemo(() => {
    const noteSet = new Set<string>();
    activeStrings.forEach(s => {
      getValidFrets(s - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[s - 1][f]));
    });
    return noteSet;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStrings.join(','), fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const questionActiveNotes = useMemo(() => {
    const noteSet = new Set<string>();
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => noteSet.add(notes[guitarString - 1][f]));
    return noteSet;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const fretDots = useMemo(() => {
    const dotFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    const result: Record<string, number[]> = {};
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      if (dotFrets.includes(f)) {
        const note = notes[guitarString - 1][f];
        if (!result[note]) result[note] = [];
        result[note].push(f);
      }
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const noteFrets = useMemo(() => {
    const result: Record<string, number[]> = {};
    getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly).forEach(f => {
      const note = notes[guitarString - 1][f];
      if (!result[note]) result[note] = [];
      result[note].push(f);
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const suggestion = useMemo(() => computeSuggestion(allHistory[stage.id] ?? []), [allHistory, stage.id]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startCountdown = (seconds: number, onTimeout: () => void) => {
    setRemaining(seconds);
    let rem = seconds;
    countdownRef.current = window.setInterval(() => {
      rem--;
      setRemaining(rem);
      if (rem <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);
    timerRef.current = window.setTimeout(onTimeout, seconds * 1000);
  };

  const pickSmartFret = useCallback((validFrets: number[], strIdx: number) => {
    if (history.length < 5 || validFrets.length <= 1) {
      const filtered = validFrets.filter(f => notes[strIdx][f] !== lastNoteRef.current);
      return filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : validFrets[0];
    }
    const byNoteStats: Record<string, { correct: number; total: number }> = {};
    history.forEach(h => {
      if (!byNoteStats[h.note]) byNoteStats[h.note] = { correct: 0, total: 0 };
      byNoteStats[h.note].total++;
      if (h.correct === true) byNoteStats[h.note].correct++;
    });
    const weights = validFrets
      .filter(f => notes[strIdx][f] !== lastNoteRef.current)
      .map(f => {
        const note = notes[strIdx][f];
        const stat = byNoteStats[note];
        if (!stat || stat.total === 0) return { fret: f, weight: 3 };
        return { fret: f, weight: 1 + (1 - stat.correct / stat.total) * 3 };
      });
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const w of weights) { rand -= w.weight; if (rand <= 0) return w.fret; }
    return weights[weights.length - 1].fret;
  }, [history]);

  // ── BY NOTE MODE ──────────────────────────────────────────────
  const nextByNote = useCallback(() => {
    if (!runningRef.current || countRef.current >= maxQuestionsRef.current) {
      setRunning(false); runningRef.current = false; return;
    }
    countRef.current++;
    setCount(countRef.current);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setWrongFret(null);
    setFoundFrets([]);

    const qString = isMulti ? activeStrings[Math.floor(Math.random() * activeStrings.length)] : guitarString;
    currentQuestionStringRef.current = qString;
    setGuitarString(qString);

    const validFrets = getValidFrets(qString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets, qString - 1);
    const note = notes[qString - 1][fret];
    lastNoteRef.current = note;
    askedFretRef.current = fret;

    const allFretsForNote = validFrets.filter(f => notesMatch(notes[qString - 1][f], note));
    setRemainingFrets(allFretsForNote);
    remainingFretsRef.current = allFretsForNote;
    setCurrentNote(note);
    setCurrentFret(null);

    playNote(qString, fret);
    questionStartRef.current = Date.now();

    startCountdown(time, () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: askedFretRef.current, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
      playNoteSingle(qString, askedFretRef.current);
      setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, time, wholeToneOnly, dotsOnly, pickSmartFret]);

  const selectFret = (selectedFret: number) => {
    if (!running || paused || answered) return;
    const qString = currentQuestionStringRef.current;
    const rem = remainingFretsRef.current;
    const isCorrect = rem.includes(selectedFret);

    if (isCorrect) {
      const newRem = rem.filter(f => f !== selectedFret);
      remainingFretsRef.current = newRem;
      setRemainingFrets(newRem);
      setFoundFrets(prev => [...prev, selectedFret]);
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note: currentNote!, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: true });

      if (newRem.length === 0) {
        clearTimers();
        answeredRef.current = true;
        setAnswered(true);
        setFeedback('✓ All found!');
        setTimeout(() => { if (runningRef.current) nextByNote(); }, 1200);
      } else {
        clearTimers();
        setFeedback(`✓ Where else? (${newRem.length} more)`);
        questionStartRef.current = Date.now();
        startCountdown(time, () => {
          if (answeredRef.current) return;
          answeredRef.current = true;
          setAnswered(true);
          beep();
          const elapsed2 = (Date.now() - questionStartRef.current) / 1000;
          addEntry({ note: currentNote!, fret: remainingFretsRef.current[0], string: qString, seconds: Math.round(elapsed2 * 10) / 10, skipped: true, correct: null });
          setFeedback(`⏱ Also on: ${remainingFretsRef.current.join(', ')}`);
          playNoteSingle(qString, remainingFretsRef.current[0]);
          setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
        });
      }
    } else {
      clearTimers();
      answeredRef.current = true;
      setAnswered(true);
      setWrongFret(selectedFret);
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note: currentNote!, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: false });
      setFeedback(`✗ Correct: ${rem.join(', ')}`);
      setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
    }
  };

  // ── BY FRET MODE ──────────────────────────────────────────────
  const next = useCallback(() => {
    if (!runningRef.current || countRef.current >= maxQuestionsRef.current) {
      setRunning(false); runningRef.current = false; return;
    }
    countRef.current++;
    setCount(countRef.current);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);

    const qString = isMulti ? activeStrings[Math.floor(Math.random() * activeStrings.length)] : guitarString;
    currentQuestionStringRef.current = qString;
    setGuitarString(qString);

    const validFrets = getValidFrets(qString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets, qString - 1);
    lastNoteRef.current = notes[qString - 1][fret];
    setCurrentFret(fret);
    setCurrentNote(null);
    questionStartRef.current = Date.now();
    playNote(qString, fret);

    startCountdown(time, () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const correctNote = notes[qString - 1][fret];
      const cof = getCofNotes(accidental, order, wholeToneOnly);
      setCorrectCofNote(getCorrectCofNote(correctNote, cof));
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note: correctNote, fret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${fret})`);
      setTimeout(() => { if (runningRef.current) next(); }, 1500);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, time, accidental, order, wholeToneOnly, dotsOnly, pickSmartFret]);

  const selectAnswer = (selectedNote: string) => {
    if (!running || paused || answeredRef.current || currentFret === null) return;
    answeredRef.current = true;
    setAnswered(true);
    clearTimers();
    stopPlayback();
    const qString = currentQuestionStringRef.current;
    const correctNote = notes[qString - 1][currentFret];
    const cof = getCofNotes(accidental, order, wholeToneOnly);
    const isCorrect = notesMatch(selectedNote, correctNote);
    setCorrectCofNote(getCorrectCofNote(correctNote, cof));
    if (!isCorrect) setWrongCofNote(selectedNote);
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    addEntry({ note: correctNote, fret: currentFret!, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: isCorrect });
    setFeedback(isCorrect ? '✓ Correct!' : `✗ It was ${displayNote(correctNote, accidental)}`);
    const waitForSound = () => {
      if (isSoundPlaying()) { setTimeout(waitForSound, 100); }
      else { setTimeout(() => { if (runningRef.current) next(); }, 400); }
    };
    setTimeout(waitForSound, 800);
  };

  // switchStage: keep playing, preserve allHistory, load existing history for new stage
  const switchStage = useCallback((idx: number) => {
    if (idx < 0 || idx >= STAGES.length) return;
    clearTimers();
    stopPlayback();
    const s = STAGES[idx];
    maxQuestionsRef.current = s.maxQuestions;
    countRef.current = 0;
    lastNoteRef.current = null;
    answeredRef.current = false;
    setStageIndex(idx);
    saveSetting('stageIndex', idx);
    // Load existing history for the new stage (don't wipe allHistory)
    setHistory(prev => {
      void prev; // suppress unused warning
      return [];
    });
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    setAnswered(false);
    setGuitarString(s.string);
    setTime(s.time);
    setFretFrom(s.fretFrom);
    setFretTo(s.fretTo);
    setAccidental(s.accidental);
    setOrder(s.order);
    setWholeToneOnly(s.wholeToneOnly);
    setDotsOnly(s.dotsOnly);
    setByNote(s.byNote);
    setMultiStrings(s.multiStrings);
    setByString(true);
    setTimeout(() => { if (runningRef.current) { s.byNote ? nextByNote() : next(); } }, 150);
  }, [nextByNote, next]);

  // ── CONTROLS ──────────────────────────────────────────────────
  const start = () => {
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    countRef.current = 0;
    setCount(0);
    setHistory([]);
    setFeedback('');
    setCurrentFret(null);
    setCurrentNote(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    setShowSettings(false);
    lastNoteRef.current = null;
    setTimeout(byNote ? nextByNote : next, 100);
  };

  const stop = () => {
    clearTimers();
    setRunning(false);
    setPaused(false);
    runningRef.current = false;
    setCurrentFret(null);
    setCurrentNote(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    stopPlayback();
  };

  const pause = () => {
    clearTimers();
    setPaused(true);
    runningRef.current = false;
    pausedTimeRef.current = remaining;
    stopPlayback();
  };

  const resume = () => {
    setPaused(false);
    runningRef.current = true;
    if (answered) {
      setTimeout(byNote ? nextByNote : next, 100);
      return;
    }
    const rem = pausedTimeRef.current;
    setRemaining(rem);
    questionStartRef.current = Date.now() - (time - rem) * 1000;
    if (currentFret !== null) playNote(guitarString, currentFret);
    let r = rem;
    countdownRef.current = window.setInterval(() => { r--; setRemaining(r); if (r <= 0 && countdownRef.current) clearInterval(countdownRef.current); }, 1000);
    timerRef.current = window.setTimeout(() => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      if (byNote) {
        setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
        setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
      } else {
        const correctNote = notes[guitarString - 1][currentFret!];
        const cof = getCofNotes(accidental, order, wholeToneOnly);
        setCorrectCofNote(getCorrectCofNote(correctNote, cof));
        const elapsed = (Date.now() - questionStartRef.current) / 1000;
        addEntry({ note: correctNote, fret: currentFret!, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
        setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${currentFret!})`);
        setTimeout(() => { if (runningRef.current) next(); }, 1500);
      }
    }, rem * 1000);
  };

  const clearStats = () => {
    setHistory([]);
    setAllHistory(prev => { const updated = { ...prev }; delete updated[stage.id]; return updated; });
  };
  useEffect(() => () => clearTimers(), []);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;
  const [descExpanded, setDescExpanded] = useState(false);
  const liveSuggestion = (allHistory[stage.id]?.length ?? 0) >= 10 ? suggestion : null;

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
              <StatsPanel history={allHistory[stage.id] ?? []} maxTime={time} accidental={accidental} />
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
                  <button className="stage-suggest-btn" onClick={() => goToStage(stageIndex - 1)}>
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
                  : <button className="icon-btn play-btn" onClick={resume} title="Continue">
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
