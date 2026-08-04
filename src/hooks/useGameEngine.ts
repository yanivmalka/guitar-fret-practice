import { useState, useRef, useCallback } from 'react';
import { notes, getCofNotes, getCorrectCofNote, getValidFrets, notesMatch, displayNote } from '../utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from '../utils/music';
import { playNote, playNoteSingle, stopPlayback, beep, isSoundPlaying } from '../utils/audio';
import { haptic } from '../utils/feedback';
import { STAGES } from '../utils/stages';

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
  markPlayed: (id: number) => void;
  resetSession: () => void;
  history: HistoryEntry[];
}

export function useGameEngine(
  settings: GameSettings,
  setters: GameSetters,
  historyOps: HistoryOps,
  saveSetting: (key: string, value: unknown) => void,
) {
  const { guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly,
          isMulti, activeStrings, time, accidental, order } = settings;
  const { addEntry, markPlayed, resetSession } = historyOps;

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentFret, setCurrentFret] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
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
  const maxQuestionsRef = useRef(STAGES[0].maxQuestions);
  const sessionRef = useRef(0); // incremented on start/switchStage to cancel stale callbacks
  // Coverage pool: ensures every valid fret is asked before repeats
  const coveragePoolRef = useRef<number[]>([]);
  const failedFretsRef = useRef<Set<number>>(new Set());

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

    // Find the fret that corresponds to lastNoteRef (avoid immediate repeat)
    const lastFret = lastNoteRef.current !== null
      ? validFrets.find(f => notes[_strIdx]?.[f] === lastNoteRef.current) ?? -1
      : -1;

    // Re-ask recently failed frets — but only once, then remove from failed set
    const failed = [...failedFretsRef.current].filter(f => validFrets.includes(f) && f !== lastFret);
    if (failed.length > 0) {
      const pick = failed[Math.floor(Math.random() * failed.length)];
      failedFretsRef.current.delete(pick); // Remove so it doesn't repeat indefinitely
      return pick;
    }

    // Coverage pool: keep only frets that are still valid
    coveragePoolRef.current = coveragePoolRef.current.filter(f => validFrets.includes(f));

    // Refill when empty
    if (coveragePoolRef.current.length === 0) {
      coveragePoolRef.current = [...validFrets];
    }

    // Pick from pool excluding last fret
    const candidates = coveragePoolRef.current.filter(f => f !== lastFret);
    const pool = candidates.length > 0 ? candidates : coveragePoolRef.current;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    // Remove picked from pool
    coveragePoolRef.current = coveragePoolRef.current.filter(f => f !== pick);
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
    if (isCorrect) haptic.correct(); else haptic.wrong();
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

  // ── STAGE SWITCH (mid-game) ───────────────────────────────────
  const switchStage = useCallback((idx: number) => {
    if (idx < 0 || idx >= STAGES.length) return;
    clearTimers();
    stopPlayback();
    haptic.stageChange();
    sessionRef.current++;                    // BUG FIX 1+3: cancel all stale callbacks
    const s = STAGES[idx];
    maxQuestionsRef.current = s.maxQuestions;
    timeRefUpdater.current = s.time;         // BUG FIX 1: update time ref immediately
    countRef.current = 0;
    lastNoteRef.current = null;
    answeredRef.current = false;
    coveragePoolRef.current = [];
    failedFretsRef.current = new Set();
    resetSession();
    setFeedback('');
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    setAnswered(false);
    setCurrentFret(null);
    setCurrentNote(null);
    setters.setStageIndex(idx);
    saveSetting('stageIndex', idx);
    setters.setGuitarString(s.string);
    setters.setTime(s.time);
    setters.setFretFrom(s.fretFrom);
    setters.setFretTo(s.fretTo);
    setters.setAccidental(s.accidental);
    setters.setOrder(s.order);
    setters.setWholeToneOnly(s.wholeToneOnly);
    setters.setDotsOnly(s.dotsOnly);
    setters.setByNote(s.byNote);
    setters.setMultiStrings(s.multiStrings);
    setters.setByString(true);
    setTimeout(() => { if (runningRef.current) { s.byNote ? nextByNote() : next(); } }, 150);
  }, [nextByNote, next, resetSession, setters, saveSetting]);

  // ── CONTROLS ─────────────────────────────────────────────────
  const start = useCallback((stageId: number, maxQ: number, currentTime: number, isByNote: boolean) => {
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
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    lastNoteRef.current = null;
    markPlayed(stageId);
    setTimeout(isByNote ? nextByNote : next, 100);
  }, [nextByNote, next, resetSession, markPlayed]);

  const stop = useCallback(() => {
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
  }, []);

  const pause = useCallback(() => {
    clearTimers();
    setPaused(true);
    runningRef.current = false;
    pausedTimeRef.current = remaining;
    stopPlayback();
  }, [remaining]);

  const resume = useCallback((isByNote: boolean, curFret: number | null, curGuitarString: number) => {
    setPaused(false);
    runningRef.current = true;
    if (answeredRef.current) {
      setTimeout(isByNote ? nextByNote : next, 100);
      return;
    }
    const rem = pausedTimeRef.current;
    setRemaining(rem);
    questionStartRef.current = Date.now() - (timeRefUpdater.current - rem) * 1000;
    if (curFret !== null) playNote(curGuitarString, curFret);
    let r = rem;
    countdownRef.current = window.setInterval(() => {
      r--;
      setRemaining(r);
      if (r <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);
    const mySession = sessionRef.current;
    timerRef.current = window.setTimeout(() => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      if (isByNote) {
        setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
        setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
      } else {
        if (curFret === null) return;
        const correctNote = notes[curGuitarString - 1][curFret];
        const cof = getCofNotes(accidental, order, false);
        setCorrectCofNote(getCorrectCofNote(correctNote, cof));
        const elapsed = (Date.now() - questionStartRef.current) / 1000;
        addEntry({ note: correctNote, fret: curFret, string: curGuitarString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
        setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${curFret})`);
        setTimeout(() => { if (runningRef.current && sessionRef.current === mySession) next(); }, 1500);
      }
    }, rem * 1000);
  }, [nextByNote, next, accidental, order, wholeToneOnly, addEntry]);

  return {
    // state
    running, paused, currentFret, currentNote, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    // actions
    start, stop, pause, resume, switchStage, selectFret, selectAnswer,
  };
}
