import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import { notes, getCofNotes, displayNote, notesMatch, getCorrectCofNote, getValidFrets } from './utils/music';
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

  // Persist settings
  useEffect(() => { saveSetting('guitarString', guitarString); }, [guitarString]);
  useEffect(() => { saveSetting('time', time); }, [time]);
  useEffect(() => { saveSetting('fretFrom', fretFrom); }, [fretFrom]);
  useEffect(() => { saveSetting('fretTo', fretTo); }, [fretTo]);
  useEffect(() => { saveSetting('accidental', accidental); }, [accidental]);
  useEffect(() => { saveSetting('order', order); }, [order]);
  useEffect(() => { saveSetting('wholeToneOnly', wholeToneOnly); }, [wholeToneOnly]);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(0);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctCofNote, setCorrectCofNote] = useState<string | null>(null);
  const [wrongCofNote, setWrongCofNote] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [preloaded, setPreloaded] = useState(false);

  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const questionStartRef = useRef(0);
  const runningRef = useRef(false);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const lastNoteRef = useRef<string | null>(null);
  const pausedTimeRef = useRef(0);

  const cofList = getCofNotes(accidental, order, wholeToneOnly);

  const activeNotes = useMemo(() => {
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly);
    const noteSet = new Set<string>();
    validFrets.forEach(f => noteSet.add(notes[guitarString - 1][f]));
    return noteSet;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly]);

  // Fret dots (standard guitar markers)
  const fretDots = useMemo(() => {
    const dotFrets = [3, 5, 7, 9, 12, 15, 17];
    const result: Record<string, number[]> = {};
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly);
    validFrets.forEach(f => {
      if (dotFrets.includes(f)) {
        const note = notes[guitarString - 1][f];
        if (!result[note]) result[note] = [];
        result[note].push(f);
      }
    });
    return result;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // Smart fret selection: weight towards notes user struggles with
  const pickSmartFret = useCallback((validFrets: number[]) => {
    if (history.length < 5 || validFrets.length <= 1) {
      // Not enough data, pick random (avoiding repeat)
      const filtered = validFrets.filter(f => notes[guitarString - 1][f] !== lastNoteRef.current);
      return filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : validFrets[0];
    }

    // Build weights: notes with lower correct rate get higher weight
    const byNote: Record<string, { correct: number; total: number }> = {};
    history.forEach(h => {
      if (!byNote[h.note]) byNote[h.note] = { correct: 0, total: 0 };
      byNote[h.note].total++;
      if (h.correct === true) byNote[h.note].correct++;
    });

    const weights = validFrets
      .filter(f => notes[guitarString - 1][f] !== lastNoteRef.current)
      .map(f => {
        const note = notes[guitarString - 1][f];
        const stat = byNote[note];
        if (!stat || stat.total === 0) return { fret: f, weight: 3 }; // unseen = high priority
        const rate = stat.correct / stat.total;
        // Lower rate = higher weight (1 to 4)
        return { fret: f, weight: 1 + (1 - rate) * 3 };
      });

    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const w of weights) {
      rand -= w.weight;
      if (rand <= 0) return w.fret;
    }
    return weights[weights.length - 1].fret;
  }, [guitarString, history]);

  const next = useCallback(() => {
    if (!runningRef.current || countRef.current >= 60) {
      setRunning(false);
      runningRef.current = false;
      return;
    }

    const newCount = countRef.current + 1;
    countRef.current = newCount;
    setCount(newCount);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);

    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly);
    const fret = pickSmartFret(validFrets);
    lastNoteRef.current = notes[guitarString - 1][fret];
    setCurrentFret(fret);
    setRemaining(time);
    questionStartRef.current = Date.now();

    playNote(guitarString, fret);

    let rem = time;
    countdownRef.current = window.setInterval(() => {
      rem--;
      setRemaining(rem);
      if (rem <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);

    timerRef.current = window.setTimeout(() => {
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
    }, time * 1000);
  }, [guitarString, fretFrom, fretTo, time, accidental, order, wholeToneOnly, pickSmartFret]);

  const start = () => {
    if (!preloaded) {
      preloadAllSamples().then(() => setPreloaded(true));
      setPreloaded(true);
    }
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    countRef.current = 0;
    setCount(0);
    setHistory([]);
    setFeedback('');
    setCurrentFret(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setShowSettings(false);
    lastNoteRef.current = null;
    setTimeout(next, 100);
  };

  const stop = () => {
    clearTimers();
    setRunning(false);
    setPaused(false);
    runningRef.current = false;
    setCurrentFret(null);
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
      // Was between questions, just go next
      setTimeout(next, 100);
      return;
    }

    // Resume countdown from where it left off
    const rem = pausedTimeRef.current;
    setRemaining(rem);
    questionStartRef.current = Date.now() - (time - rem) * 1000;

    if (currentFret !== null) playNote(guitarString, currentFret);

    let r = rem;
    countdownRef.current = window.setInterval(() => {
      r--;
      setRemaining(r);
      if (r <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);

    timerRef.current = window.setTimeout(() => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const correctNote = notes[guitarString - 1][currentFret!];
      const cof = getCofNotes(accidental, order, wholeToneOnly);
      setCorrectCofNote(getCorrectCofNote(correctNote, cof));
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      setHistory(prev => [...prev, { note: correctNote, fret: currentFret!, string: guitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null }]);
      setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${currentFret!})`);
      setTimeout(() => { if (runningRef.current) next(); }, 1500);
    }, rem * 1000);
  };

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
      if (isSoundPlaying()) {
        setTimeout(waitForSound, 100);
      } else {
        setTimeout(() => { if (runningRef.current) next(); }, 400);
      }
    };
    setTimeout(waitForSound, 800);
  };

  const clearStats = () => setHistory([]);

  useEffect(() => () => clearTimers(), []);

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
          wholeToneOnly={wholeToneOnly} setWholeToneOnly={setWholeToneOnly}
        />
      )}

      <div className="game-row">
        {(running || paused) ? (
          <div className="question-col">
            <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
            {!paused && <div className="countdown">{remaining > 0 ? remaining : ''}</div>}
            {paused && <div className="countdown paused-text">⏸ Paused</div>}
            <div className="info">Q {count} — String {guitarString}</div>
            <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
              {feedback}
            </div>
            <div className="controls">
              {!paused
                ? <button className="pause-btn" onClick={pause}>⏸ Pause</button>
                : <button className="start-btn" onClick={resume}>▶ Continue</button>
              }
              <button className="stop-btn" onClick={stop}>⏹ Stop</button>
            </div>
          </div>
        ) : (
          <div className="question-col">
            {history.length > 0 ? (
              <StatsPanel history={history} maxTime={time} />
            ) : (
              <div className="fret-display">—</div>
            )}
            <div className="controls">
              <button className="start-btn" onClick={start}>▶ Start</button>
              {history.length > 0 && (
                <button className="clear-btn" onClick={clearStats}>Clear Stats</button>
              )}
            </div>
          </div>
        )}
        <NoteCircle
          notes={cofList}
          activeNotes={activeNotes}
          active={running && !paused && !answered}
          correctNote={correctCofNote}
          wrongNote={wrongCofNote}
          onSelect={selectAnswer}
          guitarString={guitarString}
          fretDots={fretDots}
        />
      </div>
    </div>
  );
}
