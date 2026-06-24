import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import NoteCircle from './components/NoteCircle';
import Settings from './components/Settings';
import StatsPanel from './components/StatsPanel';
import { notes, getCofNotes, displayNote, notesMatch, getCorrectCofNote, getValidFrets } from './utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from './utils/music';
import { playNote, stopPlayback, beep, isSoundPlaying, preloadAllSamples } from './utils/audio';

export default function App() {
  const [guitarString, setGuitarString] = useState(1);
  const [time, setTime] = useState(5);
  const [fretFrom, setFretFrom] = useState(0);
  const [fretTo, setFretTo] = useState(18);
  const [accidental, setAccidental] = useState<AccidentalMode>('sharps');
  const [order, setOrder] = useState<OrderMode>('fifths');
  const [wholeToneOnly, setWholeToneOnly] = useState(false);

  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctCofNote, setCorrectCofNote] = useState<string | null>(null);
  const [wrongCofNote, setWrongCofNote] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const questionStartRef = useRef(0);
  const runningRef = useRef(false);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const lastNoteRef = useRef<string | null>(null);

  const [preloaded, setPreloaded] = useState(false);

  const cofList = getCofNotes(accidental, order, wholeToneOnly);

  const activeNotes = useMemo(() => {
    const validFrets = getValidFrets(guitarString - 1, fretFrom, fretTo, wholeToneOnly);
    const noteSet = new Set<string>();
    validFrets.forEach(f => noteSet.add(notes[guitarString - 1][f]));
    return noteSet;
  }, [guitarString, fretFrom, fretTo, wholeToneOnly]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

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
    let fret: number;
    if (validFrets.length > 1) {
      const filtered = validFrets.filter(f => notes[guitarString - 1][f] !== lastNoteRef.current);
      fret = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
      fret = validFrets[0];
    }
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
  }, [guitarString, fretFrom, fretTo, time, accidental, order, wholeToneOnly]);

  const start = () => {
    if (!preloaded) {
      preloadAllSamples().then(() => setPreloaded(true));
      setPreloaded(true);
    }
    setRunning(true);
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
    runningRef.current = false;
    setCurrentFret(null);
    stopPlayback();
  };

  const selectAnswer = (selectedNote: string) => {
    if (!running || answeredRef.current || currentFret === null) return;
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
        {running ? (
          <div className="question-col">
            <div className="fret-display">{currentFret !== null ? currentFret : '—'}</div>
            <div className="countdown">{remaining > 0 ? remaining : ''}</div>
            <div className="info">Q {count} — String {guitarString}</div>
            <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
              {feedback}
            </div>
            <div className="controls">
              <button className="stop-btn" onClick={stop}>Stop</button>
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
              <button className="start-btn" onClick={start}>Start</button>
              {history.length > 0 && (
                <button className="clear-btn" onClick={clearStats}>Clear Stats</button>
              )}
            </div>
          </div>
        )}
        <NoteCircle
          notes={cofList}
          activeNotes={activeNotes}
          active={running && !answered}
          correctNote={correctCofNote}
          wrongNote={wrongCofNote}
          onSelect={selectAnswer}
          guitarString={guitarString}
        />
      </div>
    </div>
  );
}
