import { useState, useRef, useCallback } from 'react';
import { notes, getCofNotes, getCorrectCofNote, getValidFrets, notesMatch, displayNote } from '../utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from '../utils/music';
import { playNote, playNoteSingle, stopPlayback, beep, isSoundPlaying } from '../utils/audio';
import { haptic, playCorrectChime, celebrateTier1, celebrateTier2 } from '../utils/feedback';

interface GameSettings {
  guitarString: number;
  fretFrom: number;
  fretTo: number;
  wholeToneOnly: boolean;
  dotsOnly: boolean;
  byNote: boolean;
  isMulti: boolean;
  activeStrings: number[];
  time: number;
  accidental: AccidentalMode;
  order: OrderMode;
}

interface GameSetters {
  setGuitarString: (v: number) => void;
  setTime: (v: number) => void;
  setFretFrom: (v: number) => void;
  setFretTo: (v: number) => void;
  setAccidental: (v: AccidentalMode) => void;
  setOrder: (v: OrderMode) => void;
  setWholeToneOnly: (v: boolean) => void;
  setDotsOnly: (v: boolean) => void;
  setByNote: (v: boolean) => void;
  setMultiStrings: (v: number[]) => void;
  setByString: (v: boolean) => void;
  setStageIndex: (v: number) => void;
}

interface HistoryOps {
  addEntry: (entry: HistoryEntry) => void;
  markPlayed: () => void;
  resetSession: () => void;
  history: HistoryEntry[];
}

export function useGameEngine(
  settings: GameSettings,
  setters: GameSetters,
  historyOps: HistoryOps,
) {
  const { guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly,
          isMulti, activeStrings, time, accidental, order } = settings;
  const { addEntry, markPlayed, resetSession } = historyOps;

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [askedFret, setAskedFret] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctCofNote, setCorrectCofNote] = useState<string | null>(null);
  const [wrongCofNote, setWrongCofNote] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [remainingFrets, setRemainingFrets] = useState<number[]>([]);
  const [foundFrets, setFoundFrets] = useState<number[]>([]);
  const [wrongFret, setWrongFret] = useState<number | null>(null);

  // Refs that game-loop callbacks read directly (avoid stale closures)
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const lastNoteRef = useRef<string | null>(null);
  const pausedTimeRef = useRef(0);
  const remainingFretsRef = useRef<number[]>([]);
  const askedFretRef = useRef<number>(0);
  const currentNoteRef = useRef<string | null>(null);
  const currentQuestionStringRef = useRef<number>(guitarString);
  const questionStartRef = useRef(0);
  // Live refs for values used inside timer callbacks
  const maxQuestionsRef = useRef(20);
  const sessionRef = useRef(0); // incremented on start/switchStage to cancel stale callbacks
  // Coverage pool: ensures every valid fret is asked before repeats
  const coveragePoolRef = useRef<number[]>([]);
  const failedFretsRef = useRef<Set<number>>(new Set());
  // Streak tracking for celebrations
  const currentStreakRef = useRef(0);

  // Keep timeRef in sync
  const timeRefUpdater = useRef(time);
  timeRefUpdater.current = time;

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

  const pickSmartFret = useCallback((validFrets: number[], _strIdx: number): number => {
    if (validFrets.length === 0) return 0;

    // Shuffle-bag approach: drain the pool in random order, then reshuffle
    // Keep only frets that are still valid
    coveragePoolRef.current = coveragePoolRef.current.filter(f => validFrets.includes(f));

    // Refill and shuffle when empty
    if (coveragePoolRef.current.length === 0) {
      // Fisher-Yates shuffle
      const bag = [...validFrets];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      coveragePoolRef.current = bag;
    }

    // Avoid immediate repeat of last fret — swap it to the end if it's first
    const lastFret = lastNoteRef.current !== null
      ? validFrets.find(f => notes[_strIdx]?.[f] === lastNoteRef.current) ?? -1
      : -1;

    if (coveragePoolRef.current[0] === lastFret && coveragePoolRef.current.length > 1) {
      // Move it to the back so it's asked later
      coveragePoolRef.current.push(coveragePoolRef.current.shift()!);
    }

    // Take the first item from the pool
    const pick = coveragePoolRef.current.shift()!;
    return pick ?? validFrets[0];
  }, []);

  // ── BY NOTE MODE ──────────────────────────────────────────────
  const nextByNote = useCallback(() => {
    if (!runningRef.current || countRef.current >= maxQuestionsRef.current) {
      setRunning(false); runningRef.current = false; return;
    }
    const mySession = sessionRef.current;
    countRef.current++;
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setWrongFret(null);
    setFoundFrets([]);

    const qString = isMulti
      ? activeStrings[Math.floor(Math.random() * activeStrings.length)]
      : guitarString;
    currentQuestionStringRef.current = qString;
    setters.setGuitarString(qString);

    const validFrets = getValidFrets(qString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets, qString - 1);
    const note = notes[qString - 1][fret];
    lastNoteRef.current = note;
    askedFretRef.current = fret;
    currentNoteRef.current = note;

    const allFretsForNote = validFrets.filter(f => notesMatch(notes[qString - 1][f], note));
    setRemainingFrets(allFretsForNote);
    remainingFretsRef.current = allFretsForNote;
    setCurrentNote(note);
    setCurrentFret(null);
    setAskedFret(fret);

    playNote(qString, fret);
    questionStartRef.current = Date.now();

    // BUG FIX 1: use timeRef.current so countdown uses the correct time after switchStage
    startCountdown(timeRefUpdater.current, () => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: askedFretRef.current, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
      playNoteSingle(qString, askedFretRef.current);
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, wholeToneOnly, dotsOnly, pickSmartFret, addEntry, setters]);

  // ── SELECT FRET (by note mode) ────────────────────────────────
  const selectFret = useCallback((selectedFret: number) => {
    if (!runningRef.current || paused || answeredRef.current) return;
    stopPlayback(); // stop question sound immediately on user input
    const mySession = sessionRef.current;
    const qString = currentQuestionStringRef.current;
    const rem = remainingFretsRef.current;
    const note = currentNoteRef.current!;
    const isCorrect = rem.includes(selectedFret);

    if (isCorrect) {
      const newStreak = currentStreakRef.current + 1;
      currentStreakRef.current = newStreak;
      playCorrectChime();

      // Tier 1: small celebration on every correct answer. The visual target
      // is optional so audio/streak feedback still works if the DOM changes.
      const scoreEl = document.getElementById('live-score');
      if (scoreEl) celebrateTier1(scoreEl);

      // Tier 2: milestone celebration on streak 3, 5, 10
      if ([3, 5, 10].includes(newStreak)) {
        celebrateTier2(newStreak >= 10 ? 'PERFECT!' : newStreak >= 5 ? 'STREAK!' : 'GO!');
      }
      
      const newRem = rem.filter(f => f !== selectedFret);
      remainingFretsRef.current = newRem;
      setRemainingFrets(newRem);
      setFoundFrets(prev => [...prev, selectedFret]);
      haptic.correct();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: true });

      if (newRem.length === 0) {
        clearTimers();
        answeredRef.current = true;
        setAnswered(true);
        setFeedback('✓ All found!');
        setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1200);
      } else {
        // BUG FIX 3: don't set answeredRef=true here — more frets remain, keep question open
        clearTimers();
        setFeedback(`✓ Where else? (${newRem.length} more)`);
        questionStartRef.current = Date.now();
        startCountdown(timeRefUpdater.current, () => {
          if (answeredRef.current || sessionRef.current !== mySession) return;
          answeredRef.current = true;
          setAnswered(true);
          beep();
          const elapsed2 = (Date.now() - questionStartRef.current) / 1000;
          addEntry({ note, fret: remainingFretsRef.current[0], string: qString, seconds: Math.round(elapsed2 * 10) / 10, skipped: true, correct: null });
          setFeedback(`⏱ Also on: ${remainingFretsRef.current.join(', ')}`);
          playNoteSingle(qString, remainingFretsRef.current[0]);
          setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
        });
      }
    } else {
      // Reset streak on wrong
      currentStreakRef.current = 0;
      clearTimers();
      answeredRef.current = true;
      setAnswered(true);
      setWrongFret(selectedFret);
      haptic.wrong();
      failedFretsRef.current.add(selectedFret); // re-queue for coverage
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: false });
      setFeedback(`✗ Correct: ${rem.join(', ')}`);
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
    }
  }, [paused, addEntry, nextByNote]);

  // ── BY FRET MODE ──────────────────────────────────────────────
  const next = useCallback(() => {
    if (!runningRef.current || countRef.current >= maxQuestionsRef.current) {
      setRunning(false); runningRef.current = false; return;
    }
    const mySession = sessionRef.current;
    countRef.current++;
    setAnswered(false);
    answeredRef.current = false;
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);

    const qString = isMulti
      ? activeStrings[Math.floor(Math.random() * activeStrings.length)]
      : guitarString;
    currentQuestionStringRef.current = qString;
    setters.setGuitarString(qString);

    const validFrets = getValidFrets(qString - 1, fretFrom, fretTo, wholeToneOnly, dotsOnly);
    const fret = pickSmartFret(validFrets, qString - 1);
    lastNoteRef.current = notes[qString - 1][fret];
    setCurrentFret(fret);
    setCurrentNote(null);
    setAskedFret(fret);
    currentNoteRef.current = null;
    questionStartRef.current = Date.now();
    playNote(qString, fret);

    startCountdown(timeRefUpdater.current, () => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      const correctNote = notes[qString - 1][fret];
      const cof = getCofNotes(accidental, order, false);
      setCorrectCofNote(getCorrectCofNote(correctNote, cof));
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note: correctNote, fret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${fret})`);
      setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) next(); }, 1500);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, accidental, order, wholeToneOnly, dotsOnly, pickSmartFret, addEntry, setters]);

  const selectAnswer = useCallback((selectedNote: string) => {
    if (!runningRef.current || paused || answeredRef.current || currentFret === null) return;
    const mySession = sessionRef.current;
    answeredRef.current = true;
    setAnswered(true);
    clearTimers();
    stopPlayback();
    const qString = currentQuestionStringRef.current;
    const correctNote = notes[qString - 1][currentFret];
    const cof = getCofNotes(accidental, order, false);
    const isCorrect = notesMatch(selectedNote, correctNote);
    if (isCorrect) {
      const newStreak = currentStreakRef.current + 1;
      currentStreakRef.current = newStreak;
      playCorrectChime();

      // Tier 1: small celebration on every correct answer. The visual target
      // is optional so audio/streak feedback still works if the DOM changes.
      const scoreEl = document.getElementById('live-score');
      if (scoreEl) celebrateTier1(scoreEl);

      // Tier 2: milestone celebration on streak 3, 5, 10
      if ([3, 5, 10].includes(newStreak)) {
        celebrateTier2(newStreak >= 10 ? 'PERFECT!' : newStreak >= 5 ? 'STREAK!' : 'GO!');
      }
      haptic.correct();
    } else {
      // Reset streak on wrong
      currentStreakRef.current = 0;
      haptic.wrong();
    }
    setCorrectCofNote(getCorrectCofNote(correctNote, cof));
    if (!isCorrect) setWrongCofNote(selectedNote);
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    addEntry({ note: correctNote, fret: currentFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: isCorrect });
    setFeedback(isCorrect ? '✓ Correct!' : `✗ It was ${displayNote(correctNote, accidental)}`);
    const waitForSound = () => {
      if (isSoundPlaying()) { setTimeout(waitForSound, 100); }
      else { setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) next(); }, 400); }
    };
    setTimeout(waitForSound, 800);
  }, [paused, currentFret, accidental, order, wholeToneOnly, addEntry, next]);

  // ── CONTROLS ─────────────────────────────────────────────────
  const start = useCallback((maxQ: number, currentTime: number, isByNote: boolean) => {
    sessionRef.current++;
    maxQuestionsRef.current = maxQ;
    timeRefUpdater.current = currentTime;
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    countRef.current = 0;
    coveragePoolRef.current = [];
    failedFretsRef.current = new Set();
    resetSession();
    setFeedback('');
    setCurrentFret(null);
    setCurrentNote(null);
    setAskedFret(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    lastNoteRef.current = null;
    currentStreakRef.current = 0; // Reset streak on new game
    markPlayed();
    setTimeout(isByNote ? nextByNote : next, 100);
  }, [nextByNote, next, resetSession, markPlayed]);

  const stop = useCallback(() => {
    clearTimers();
    runningRef.current = false;
    answeredRef.current = true; // prevent any pending callbacks
    setRunning(false);
    setPaused(false);
    setCurrentFret(null);
    setCurrentNote(null);
    setAskedFret(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    stopPlayback();
  }, []);

  const pause = useCallback(() => {
    clearTimers();
    setPaused(true);
    runningRef.current = false;
    pausedTimeRef.current = remaining;
    stopPlayback();
  }, [remaining]);

  const resume = useCallback((isByNote: boolean, _curFret: number | null, _curGuitarString: number) => {
    setPaused(false);
    runningRef.current = true;
    // Always start a fresh question on resume — ignore the paused question
    answeredRef.current = false;
    setAnswered(false);
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    setTimeout(isByNote ? nextByNote : next, 100);
  }, [nextByNote, next]);

  return {
    // state
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    // actions
    start, stop, pause, resume, selectFret, selectAnswer,
  };
}
