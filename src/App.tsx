import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import { notes, getCofNotes, getStringStartIndex, displayNote, notesMatch, getCorrectCofNote, getValidFrets } from './utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from './utils/music';
import { playNote, stopPlayback, beep, isSoundPlaying, preloadAllSamples } from './utils/audio';

function loadSetting<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveSetting(key: string, value: unknown) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export default function App() {
  const [guitarString, setGuitarString] = useState(() => loadSetting('guitarString', 1));
  const [time, setTime] = useState(() => loadSetting('time', 5));
  const [fretFrom, setFretFrom] = useState(() => loadSetting('fretFrom', 0));
  const [fretTo, setFretTo] = useState(() => loadSetting('fretTo', 18));
  const [accidental, setAccidental] = useState<AccidentalMode>(() => loadSetting('accidental', 'sharps'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('order', 'fifths'));
  const [wholeToneOnly, setWholeToneOnly] = useState(() => loadSetting('wholeToneOnly', false));
  const [dotsOnly, setDotsOnly] = useState(() => loadSetting('dotsOnly', false));
  const [byString, setByString] = useState(() => loadSetting('byString', false));
  const [byNote, setByNote] = useState(() => loadSetting('byNote', false));

  useEffect(() => { saveSetting('guitarString', guitarString); }, [guitarString]);
  useEffect(() => { saveSetting('time', time); }, [time]);
  useEffect(() => { saveSetting('fretFrom', fretFrom); }, [fretFrom]);
  useEffect(() => { saveSetting('fretTo', fretTo); }, [fretTo]);
  useEffect(() => { saveSetting('accidental', accidental); }, [accidental]);
  useEffect(() => { saveSetting('order', order); }, [order]);
  useEffect(() => { saveSetting('wholeToneOnly', wholeToneOnly); }, [wholeToneOnly]);
  useEffect(() => { saveSetting('dotsOnly', dotsOnly); }, [dotsOnly]);
  useEffect(() => { saveSetting('byString', byString); }, [byString]);
  useEffect(() => { saveSetting('byNote', byNote); }, [byNote]);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(0);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null); // for byNote mode
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctCofNote, setCorrectCofNote] = useState<string | null>(null);
  const [wrongCofNote, setWrongCofNote] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [preloaded, setPreloaded] = useState(false);

  // byNote mode state
  const [remainingFrets, setRemainingFrets] = useState<number[]>([]); // frets still to find
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

  const cofList = getCofNotes(accidental, order, wholeToneOnly);
  const startIndex = byString ? getStringStartIndex(accidental, order, wholeToneOnly, guitarString - 1) : 0;

  const activeNotes = useMemo(() => {
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const noteSet = new Set<string>();
    validFrets.forEach(f => noteSet.add(notes[guitarString - 1][f]));
    return noteSet;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  const fretDots = useMemo(() => {
    const dotFrets = [3, 5, 7, 9, 12, 15, 17];
    const result: Record<string, number[]> = {};
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    validFrets.forEach(f => {
      if (dotFrets.includes(f)) {
        const note = notes[guitarString - 1][f];
        if (!result[note]) result[note] = [];
        result[note].push(f);
      }
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

  // All valid frets per note — for multi-fret sound playback and dot coloring
  const noteFrets = useMemo(() => {
    const result: Record<string, number[]> = {};
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    validFrets.forEach(f => {
      const note = notes[guitarString - 1][f];
      if (!result[note]) result[note] = [];
      result[note].push(f);
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly]);

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

  const pickSmartFret = useCallback((validFrets: number[]) => {
    if (history.length < 5 || validFrets.length <= 1) {
      const filtered = validFrets.filter(f => notes[guitarString - 1][f] !== lastNoteRef.current);
      return filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : validFrets[0];
    }
    const byNoteStats: Record<string, { correct: number; total: number }> = {};
    history.forEach(h => {
      if (!byNoteStats[h.note]) byNoteStats[h.note] = { correct: 0, total: 0 };
      byNoteStats[h.note].total++;
      if (h.correct === true) byNoteStats[h.note].correct++;
    });
    const weights = validFrets
      .filter(f => notes[guitarString - 1][f] !== lastNoteRef.current)
      .map(f => {
        const note = notes[guitarString - 1][f];
        const stat = byNoteStats[note];
        if (!stat || stat.total === 0) return { fret: f, weight: 3 };
        return { fret: f, weight: 1 + (1 - stat.correct / stat.total) * 3 };
      });
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const w of weights) { rand -= w.weight; if (rand <= 0) return w.fret; }
    return weights[weights.length - 1].fret;
  }, [guitarString, history]);

  // ── BY NOTE MODE ──────────────────────────────────────────────
  const nextByNote = useCallback(() => {
    if (!runningRef.current || countRef.current >= 60) {
      setRunning(false); runningRef.current = false; return;
    }
    countRef.current++;
    setCount(countRef.current);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setWrongFret(null);
    setFoundFrets([]);

    // Pick a note (unique from last)
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets);
    const note = notes[guitarString - 1][fret];
    lastNoteRef.current = note;

    // Find ALL frets in range that have this note
    const allFretsForNote = validFrets.filter(f => notesMatch(notes[guitarString - 1][f], note));
    setRemainingFrets(allFretsForNote);
    remainingFretsRef.current = allFretsForNote;
    setCurrentNote(note);
    setCurrentFret(null);

    // Play the note
    playNote(guitarString, fret);
    questionStartRef.current = Date.now();

    startCountdown(time, () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      setHistory(prev => [...prev, { note, fret: remainingFretsRef.current[0] ?? fret, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null }]);
      setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
      setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
    });
  }, [guitarString, fretFrom, fretTo, time, wholeToneOnly, dotsOnly, pickSmartFret]);

  const selectFret = (selectedFret: number) => {
    if (!running || paused || answered) return;
    const rem = remainingFretsRef.current;
    const isCorrect = rem.includes(selectedFret);

    if (isCorrect) {
      const newRem = rem.filter(f => f !== selectedFret);
      remainingFretsRef.current = newRem;
      setRemainingFrets(newRem);
      setFoundFrets(prev => [...prev, selectedFret]);
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      setHistory(prev => [...prev, { note: currentNote!, fret: selectedFret, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: true }]);

      if (newRem.length === 0) {
        // All found!
        clearTimers();
        answeredRef.current = true;
        setAnswered(true);
        setFeedback('✓ All found!');
        setTimeout(() => { if (runningRef.current) nextByNote(); }, 1200);
      } else {
        // More to find — reset timer for next fret
        clearTimers();
        setFeedback(`✓ Where else? (${newRem.length} more)`);
        questionStartRef.current = Date.now();
        startCountdown(time, () => {
          if (answeredRef.current) return;
          answeredRef.current = true;
          setAnswered(true);
          beep();
          const elapsed2 = (Date.now() - questionStartRef.current) / 1000;
          setHistory(prev => [...prev, { note: currentNote!, fret: remainingFretsRef.current[0], string: guitarString, seconds: Math.round(elapsed2 * 10) / 10, skipped: true, correct: null }]);
          setFeedback(`⏱ Also on: ${remainingFretsRef.current.join(', ')}`);
          setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
        });
      }
    } else {
      // Wrong
      clearTimers();
      answeredRef.current = true;
      setAnswered(true);
      setWrongFret(selectedFret);
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      setHistory(prev => [...prev, { note: currentNote!, fret: selectedFret, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: false }]);
      setFeedback(`✗ Correct: ${rem.join(', ')}`);
      setTimeout(() => { if (runningRef.current) nextByNote(); }, 1800);
    }
  };

  // ── BY FRET MODE ──────────────────────────────────────────────
  const next = useCallback(() => {
    if (!runningRef.current || countRef.current >= 60) {
      setRunning(false); runningRef.current = false; return;
    }
    countRef.current++;
    setCount(countRef.current);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);

    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets);
    lastNoteRef.current = notes[guitarString - 1][fret];
    setCurrentFret(fret);
    setCurrentNote(null);
    questionStartRef.current = Date.now();
    playNote(guitarString, fret);

    startCountdown(time, () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const correctNote = notes[guitarString - 1][fret];
      const cof = getCofNotes(accidental, order, wholeToneOnly);
      setCorrectCofNote(getCorrectCofNote(correctNote, cof));
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      setHistory(prev => [...prev, { note: correctNote, fret, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null }]);
      setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${fret})`);
      setTimeout(() => { if (runningRef.current) next(); }, 1500);
    });
  }, [guitarString, fretFrom, fretTo, time, accidental, order, wholeToneOnly, dotsOnly, pickSmartFret]);

  const selectAnswer = (selectedNote: string) => {
    if (!running || paused || answeredRef.current || currentFret === null) return;
    answeredRef.current = true;
    setAnswered(true);
    clearTimers();
    stopPlayback();
    const correctNote = notes[guitarString - 1][currentFret];
    const cof = getCofNotes(accidental, order, wholeToneOnly);
    const isCorrect = notesMatch(selectedNote, correctNote);
    setCorrectCofNote(getCorrectCofNote(correctNote, cof));
    if (!isCorrect) setWrongCofNote(selectedNote);
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    setHistory(prev => [...prev, { note: correctNote, fret: currentFret!, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: isCorrect }]);
    setFeedback(isCorrect ? '✓ Correct!' : `✗ It was ${displayNote(correctNote, accidental)}`);
    const waitForSound = () => {
      if (isSoundPlaying()) { setTimeout(waitForSound, 100); }
      else { setTimeout(() => { if (runningRef.current) next(); }, 400); }
    };
    setTimeout(waitForSound, 800);
  };

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
        setHistory(prev => [...prev, { note: correctNote, fret: currentFret!, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null }]);
        setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${currentFret!})`);
        setTimeout(() => { if (runningRef.current) next(); }, 1500);
      }
    }, rem * 1000);
  };

  const clearStats = () => setHistory([]);
  useEffect(() => () => clearTimers(), []);

  const isPlaying = running && !paused;

  return (
    <div className="app">
      <h1>🎸 Guitar Fret Practice</h1>

      <button className="toggle-btn" onClick={() => setShowSettings(!showSettings)}>
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
        />
      )}

      <div className="game-row">
        <div className="question-col">
          {isPlaying && (
            <>
              {byNote
                ? <div className="note-display">{currentNote ? displayNote(currentNote, accidental) : '—'}</div>
                : <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
              }
              <div className="countdown">{remaining > 0 ? remaining : ''}</div>
              <div className="info">Q {count} — String {guitarString}</div>
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}
              </div>
            </>
          )}

          {!isPlaying && history.length > 0 && <StatsPanel history={history} maxTime={time} accidental={accidental} />}
          {!running && !paused && history.length === 0 && <div className="fret-display">—</div>}
          {paused && <div className="paused-text">⏸ Paused</div>}

          <div className="controls">
            {!running && !paused ? (
              <>
                <button className="icon-btn play-btn" onClick={start} title="Start">
                  <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </button>
                {history.length > 0 && <button className="clear-btn" onClick={clearStats}>Clear</button>}
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
            activeNotes={activeNotes}
            active={isPlaying && !answered}
            correctNote={correctCofNote}
            wrongNote={wrongCofNote}
            onSelect={selectAnswer}
            guitarString={guitarString}
            fretDots={fretDots}
            noteFrets={noteFrets}
            byString={byString}
            startIndex={startIndex}
          />
        )}
      </div>
    </div>
  );
}
