import { useState, useRef, useCallback } from 'react';
import { notes, getCofNotes, getCorrectCofNote, getValidFrets, notesMatch, displayNote } from '../utils/music';
import type { AccidentalMode, OrderMode, HistoryEntry } from '../utils/music';
import type { ScoreResult } from './useScoring';
import { playNote, playNoteSingle, stopPlayback, beep, isSoundPlaying, pauseAudioContext, resumeAudioContext } from '../utils/audio';
import { haptic, playCorrectChime, correctChimeRemainingMs, celebrateTier1, celebrateTier2 } from '../utils/feedback';
import { vlog } from '../utils/debugLog';

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

interface ScoreOps {
  onCorrect: (elapsedSeconds: number, timeLimit: number) => ScoreResult;
  onWrong: () => void;
  onTimeout: () => void;
  // Time limit (seconds) for the question about to be asked, given the current
  // continuous-run progression. `baseTime` is the current difficulty's base.
  getQuestionTime: (baseTime: number) => number;
}

interface EngineCallbacks {
  // Fired when the run ends because every question was actually answered
  // (the asked-question budget was reached) — never on a manual Stop, and
  // never on a Pause (which discards the current question and keeps the
  // engine running). Lets a caller (e.g. Auto Advance) distinguish a real
  // stage completion from the session simply being stopped.
  onComplete?: () => void;
}

export function useGameEngine(
  settings: GameSettings,
  setters: GameSetters,
  historyOps: HistoryOps,
  scoreOps: ScoreOps,
  callbacks: EngineCallbacks = {},
) {
  const { guitarString, fretFrom, fretTo, wholeToneOnly, dotsOnly, byNote,
          isMulti, activeStrings, time, accidental, order } = settings;
  const { onComplete } = callbacks;
  const { addEntry, markPlayed, resetSession } = historyOps;
  const { onCorrect, onWrong, onTimeout, getQuestionTime } = scoreOps;

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
  // Single source of truth for the SpeedBar. `questionTime` is the exact limit
  // the current countdown runs on (matches questionTimeRef); `questionStart` is
  // the wall-clock the countdown started at (matches questionStartRef);
  // `questionSeq` increments once per countdown so the bar remounts cleanly for
  // every question and every "where else?" sub-round.
  const [questionTime, setQuestionTime] = useState(time);
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [questionSeq, setQuestionSeq] = useState(0);
  // Per-stage question number (1-based) for the progress display. Mirrors
  // countRef, which is reset for every stage in start(); unlike the
  // continuous-run counters in useScoring it goes back to 0 at each Auto
  // Advance boundary.
  const [questionNumber, setQuestionNumber] = useState(0);

  // Refs that game-loop callbacks read directly (avoid stale closures)
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const countRef = useRef(0);
  const answeredRef = useRef(false);
  const lastNoteRef = useRef<string | null>(null);
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
  const milestonePauseRef = useRef(false);
  // baseTimeRef: the difficulty's own base time (unaffected by streak).
  // questionTimeRef: that base scaled down by the current streak tier —
  // the value actually used for the countdown and passed to scoring.
  const baseTimeRef = useRef(time);
  baseTimeRef.current = time;
  const questionTimeRef = useRef(time);
  // Note playback speed scales proportionally with how far the continuous
  // timing ramp has compressed the current question: rate = base / current.
  // At the original/base question time this is 1×. This only affects audio
  // playback rate — timing, scoring, streaks and Auto Advance are untouched.
  const questionPlaybackRate = () =>
    questionTimeRef.current > 0 ? baseTimeRef.current / questionTimeRef.current : 1;
  const timeoutCallbackRef = useRef<(() => void) | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const advanceMetaRef = useRef<{ fn: () => void; start: number; delay: number } | null>(null);

  const scheduleAdvance = useCallback((fn: () => void, delay: number) => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceMetaRef.current = { fn, start: Date.now(), delay };
    advanceTimeoutRef.current = window.setTimeout(() => {
      advanceTimeoutRef.current = null;
      advanceMetaRef.current = null;
      fn();
    }, delay);
  }, []);

  const scoreCorrect = useCallback((elapsedSeconds: number): ScoreResult => {
    const result = onCorrect(elapsedSeconds, questionTimeRef.current);
    playCorrectChime();

    const scoreEl = document.getElementById('live-score');
    if (scoreEl) celebrateTier1(scoreEl, `+${result.points}`);

    if (result.milestone) {
      haptic.milestone();
      celebrateTier2(`${result.streak} STREAK!`);
    } else {
      haptic.correct();
    }

    return result;
  }, [onCorrect]);

  // After a correct answer the success chime is still ringing. Defer the next
  // question (and its note) until the chime's actual end time so the two never
  // overlap — no fixed padding delay. Routed through scheduleAdvance so pause
  // cancels it like any other pending advance.
  const advanceAfterChime = useCallback((fn: () => void) => {
    scheduleAdvance(fn, correctChimeRemainingMs());
  }, [scheduleAdvance]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startCountdown = (seconds: number, onTimeout: () => void) => {
    timeoutCallbackRef.current = onTimeout;
    setRemaining(seconds);
    let rem = seconds;
    countdownRef.current = window.setInterval(() => {
      rem--;
      setRemaining(rem);
      if (rem <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);
    timerRef.current = window.setTimeout(onTimeout, seconds * 1000);
  };

  // Start a countdown AND publish its timing to the render layer in the same
  // step, so the SpeedBar always spans exactly `seconds` from exactly the
  // moment questionStartRef was stamped. Bumping questionSeq remounts the bar.
  const beginCountdown = (seconds: number, onTimeout: () => void) => {
    setQuestionTime(seconds);
    setQuestionStart(questionStartRef.current);
    setQuestionSeq(s => s + 1);
    startCountdown(seconds, onTimeout);
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
      const completedNaturally = runningRef.current && countRef.current >= maxQuestionsRef.current;
      setRunning(false); runningRef.current = false;
      if (completedNaturally) onComplete?.();
      return;
    }
    const mySession = sessionRef.current;
    countRef.current++;
    setQuestionNumber(countRef.current);
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

    questionStartRef.current = Date.now();

    // BUG FIX 1: use timeRef.current so countdown uses the correct time after switchStage
    questionTimeRef.current = getQuestionTime(baseTimeRef.current);
    playNote(qString, fret, questionPlaybackRate());
    beginCountdown(questionTimeRef.current, () => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      onTimeout();
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: askedFretRef.current, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ Frets: ${remainingFretsRef.current.join(', ')}`);
      playNoteSingle(qString, askedFretRef.current, questionPlaybackRate());
      scheduleAdvance(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, wholeToneOnly, dotsOnly, pickSmartFret, addEntry, setters, onTimeout, scheduleAdvance, onComplete, getQuestionTime]);

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
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const scoreResult = scoreCorrect(elapsed);
      const newRem = rem.filter(f => f !== selectedFret);
      remainingFretsRef.current = newRem;
      setRemainingFrets(newRem);
      setFoundFrets(prev => [...prev, selectedFret]);
      addEntry({ note, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: true });

      if (newRem.length === 0) {
        clearTimers();
        answeredRef.current = true;
        setAnswered(true);
        setFeedback('✓ All found!');
        // Visual celebration (floating text, rings/banner) plays independently
        // on its own overlay, but the success chime must finish before the next
        // question note so they don't overlap.
        advanceAfterChime(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); });
      } else {
        clearTimers();
        setFeedback(`✓ Where else? (${newRem.length} more)`);

        const resumeRemaining = () => {
          if (!runningRef.current || sessionRef.current !== mySession) return;
          milestonePauseRef.current = false;
          answeredRef.current = false;
          setAnswered(false);
          questionStartRef.current = Date.now();
          beginCountdown(questionTimeRef.current, () => {
            if (answeredRef.current || sessionRef.current !== mySession) return;
            answeredRef.current = true;
            setAnswered(true);
            beep();
            onTimeout();
            const elapsed2 = (Date.now() - questionStartRef.current) / 1000;
            addEntry({ note, fret: remainingFretsRef.current[0], string: qString, seconds: Math.round(elapsed2 * 10) / 10, skipped: true, correct: null });
            setFeedback(`⏱ Also on: ${remainingFretsRef.current.join(', ')}`);
            playNoteSingle(qString, remainingFretsRef.current[0], questionPlaybackRate());
            scheduleAdvance(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
          });
        };

        if (scoreResult.milestone) {
          milestonePauseRef.current = true;
          answeredRef.current = true;
          setAnswered(true);
          scheduleAdvance(resumeRemaining, 1500);
        } else {
          resumeRemaining();
        }
      }
    } else {
      onWrong();
      haptic.wrong();
      clearTimers();
      answeredRef.current = true;
      setAnswered(true);
      setWrongFret(selectedFret);
      failedFretsRef.current.add(selectedFret); // re-queue for coverage
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note, fret: selectedFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: false });
      setFeedback(`✗ Correct: ${rem.join(', ')}`);
      scheduleAdvance(() => { if (runningRef.current && sessionRef.current === mySession) nextByNote(); }, 1800);
    }
  }, [paused, addEntry, nextByNote, onTimeout, onWrong, scoreCorrect, scheduleAdvance, advanceAfterChime]);

  // ── BY FRET MODE ──────────────────────────────────────────────
  const next = useCallback(() => {
    if (!runningRef.current || countRef.current >= maxQuestionsRef.current) {
      const completedNaturally = runningRef.current && countRef.current >= maxQuestionsRef.current;
      setRunning(false); runningRef.current = false;
      if (completedNaturally) onComplete?.();
      return;
    }
    const mySession = sessionRef.current;
    countRef.current++;
    setQuestionNumber(countRef.current);
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

    questionTimeRef.current = getQuestionTime(baseTimeRef.current);
    playNote(qString, fret, questionPlaybackRate());
    beginCountdown(questionTimeRef.current, () => {
      if (answeredRef.current || sessionRef.current !== mySession) return;
      answeredRef.current = true;
      setAnswered(true);
      beep();
      onTimeout();
      const correctNote = notes[qString - 1][fret];
      const cof = getCofNotes(accidental, order, false);
      setCorrectCofNote(getCorrectCofNote(correctNote, cof));
      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      addEntry({ note: correctNote, fret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: true, correct: null });
      setFeedback(`⏱ ${displayNote(correctNote, accidental)} (Fret ${fret})`);
      scheduleAdvance(() => { if (runningRef.current && sessionRef.current === mySession) next(); }, 1500);
    });
  }, [guitarString, isMulti, activeStrings, fretFrom, fretTo, accidental, order, wholeToneOnly, dotsOnly, pickSmartFret, addEntry, setters, onTimeout, scheduleAdvance, onComplete, getQuestionTime]);

  const selectAnswer = useCallback((selectedNote: string) => {
    vlog('[voice] selectAnswer', { selectedNote, running: runningRef.current, paused, answered: answeredRef.current, currentFret });
    if (!runningRef.current || paused || answeredRef.current || currentFret === null) return undefined;
    const mySession = sessionRef.current;
    answeredRef.current = true;
    setAnswered(true);
    clearTimers();
    stopPlayback();
    const qString = currentQuestionStringRef.current;
    const correctNote = notes[qString - 1][currentFret];
    const cof = getCofNotes(accidental, order, false);
    const isCorrect = notesMatch(selectedNote, correctNote);
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    if (isCorrect) {
      scoreCorrect(elapsed);
    } else {
      onWrong();
      haptic.wrong();
    }
    setCorrectCofNote(getCorrectCofNote(correctNote, cof));
    if (!isCorrect) setWrongCofNote(selectedNote);
    addEntry({ note: correctNote, fret: currentFret, string: qString, seconds: Math.round(elapsed * 10) / 10, skipped: false, correct: isCorrect });
    setFeedback(isCorrect ? '✓ Correct!' : `✗ It was ${displayNote(correctNote, accidental)}`);

    if (isCorrect) {
      // Wait for the success chime to finish before advancing so its tail does
      // not overlap the next question note (visible esp. during Auto Advance).
      advanceAfterChime(() => { if (runningRef.current && sessionRef.current === mySession) next(); });
      return true;
    }

    const waitForSound = () => {
      if (isSoundPlaying()) {
        scheduleAdvance(waitForSound, 100);
      } else {
        scheduleAdvance(() => { if (runningRef.current && sessionRef.current === mySession) next(); }, 400);
      }
    };
    scheduleAdvance(waitForSound, 800);
    return false;
  }, [paused, currentFret, accidental, order, wholeToneOnly, addEntry, next, onWrong, scoreCorrect, scheduleAdvance, advanceAfterChime]);

  // ── CONTROLS ─────────────────────────────────────────────────
  const start = useCallback((maxQ: number, currentTime: number, isByNote: boolean) => {
    sessionRef.current++;
    maxQuestionsRef.current = maxQ;
    baseTimeRef.current = currentTime;
    questionTimeRef.current = currentTime;
    setQuestionTime(currentTime);
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    pausedRef.current = false;
    countRef.current = 0;
    setQuestionNumber(0);
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
    milestonePauseRef.current = false;
    markPlayed();
    setTimeout(isByNote ? nextByNote : next, 100);
  }, [nextByNote, next, resetSession, markPlayed]);

  const stop = useCallback(() => {
    clearTimers();
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null; }
    advanceMetaRef.current = null;
    runningRef.current = false;
    pausedRef.current = false;
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
    milestonePauseRef.current = false;
    stopPlayback();
  }, []);

  // Discard the in-progress question entirely, as if it were never asked:
  // cancel its countdown/scheduled-advance so no timeout/answer callback can
  // fire for it, and give back its slot in the asked-question budget. No
  // score/history entry is ever written for a question that was neither
  // answered nor timed out, so nothing there needs undoing.
  const pause = useCallback(() => {
    // Idempotent: repeated calls while already paused (e.g. several
    // visibilitychange/pagehide/appStateChange firings before the user
    // resumes) must not discard more than the one in-flight question.
    if (pausedRef.current) return;
    pausedRef.current = true;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null; }
    advanceMetaRef.current = null;
    if (countRef.current > 0) countRef.current--;
    setQuestionNumber(countRef.current);
    runningRef.current = false;
    answeredRef.current = true;
    setPaused(true);
    setFeedback('');
    setCurrentFret(null);
    setCurrentNote(null);
    setAskedFret(null);
    setCorrectCofNote(null);
    setWrongCofNote(null);
    setFoundFrets([]);
    setWrongFret(null);
    setRemainingFrets([]);
    milestonePauseRef.current = false;
    stopPlayback();
    pauseAudioContext();
  }, []);

  // Resume the session with a brand-new question, not the discarded one.
  const resume = useCallback(() => {
    runningRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    resumeAudioContext();
    if (byNote) nextByNote(); else next();
  }, [byNote, nextByNote, next]);

  return {
    // state
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    questionTime, questionStart, questionSeq, questionNumber,
    // actions
    start, stop, pause, resume, selectFret, selectAnswer,
  };
}
