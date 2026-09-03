import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDictationEngine,
  type SpeechEngine,
  type SpeechEngineError,
} from '../utils/speech';
import { vlog } from '../utils/debugLog';

// ── useDictation ───────────────────────────────────────────────────────
//
// Free-text voice dictation for a plain text field (the feedback board's
// compose box). This is deliberately separate from `useVoiceAnswer`, which
// is bound to the game's twelve-word note/fret grammar and its per-question
// timing rules. Here the goal is ordinary speech-to-text: hold the mic open
// while `listening`, stream interim words for a live preview, and hand each
// finalised phrase back so the caller can append it to its draft.
//
// Per the repo convention, values read inside the async speech callbacks are
// kept in refs so a stale closure never fires.

export interface UseDictationOptions {
  /** BCP-47 tag. Defaults to Hebrew — the feedback board is written in Hebrew. */
  lang?: string;
  /**
   * Called on every recognised result with the full text spoken since the
   * current listen session started (finalised phrases joined by spaces, plus
   * the in-progress phrase). Replace the dictated span of your draft with it.
   */
  onSession: (text: string) => void;
}

export interface UseDictationResult {
  /** Whether any recogniser is available on this platform. */
  supported: boolean;
  listening: boolean;
  error: SpeechEngineError | null;
  /** Start listening (prompts for mic permission the first time). */
  start: () => void;
  /** Stop listening (safe to call when idle). */
  stop: () => void;
  /** Start if idle, stop if listening. */
  toggle: () => void;
}

// The web recogniser ends its own turn on a pause in speech. While the user
// still has the mic on we transparently resume, up to this many times, so it
// doesn't go dead mid-thought.
const MAX_KEEPALIVE = 40;

// The browser recogniser can fire `onerror` ('no-speech'/'aborted') *and*
// `onend` for the same pause. Starting a fresh SpeechRecognition for each
// leaves two instances briefly overlapping, and each transcribes the audio
// across the seam — which is what duplicated the first word of a phrase.
// Every resume path is funnelled through one timer, so a burst of callbacks
// yields a single restart, and the delay is long enough for the outgoing
// recogniser to release the microphone before the next one claims it.
const RESUME_DEBOUNCE_MS = 400;

// Chrome plays its own start/stop chime on every recognition session, so
// resuming forever turns a thinking pause into a stream of beeps. After this
// many consecutive turns that heard nothing at all, switch the mic off and
// let the user tap it again.
const MAX_SILENT_TURNS = 3;

/** Collapse runs of whitespace and trim — transcripts arrive space-padded. */
function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Join non-empty parts with single spaces. */
function joinText(...parts: string[]): string {
  return parts.map(tidy).filter(Boolean).join(' ');
}

export function useDictation(opts: UseDictationOptions): UseDictationResult {
  // The engine is picked once, on mount, and kept for the hook's lifetime.
  const [engine] = useState<SpeechEngine | null>(() =>
    typeof window === 'undefined' ? null : createDictationEngine(),
  );
  const supported = !!engine && engine.kind !== 'none';

  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechEngineError | null>(null);

  // Refs for the async callbacks.
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const listeningRef = useRef(false);
  const keepAliveRef = useRef(0);
  // Text committed by turns that have already ended. A turn's own text is not
  // accumulated word by word — it is replaced wholesale from the recogniser's
  // current view of the turn (see `onResult`) — and only folded in here once
  // that turn is over and its results can no longer change.
  const committedRef = useRef('');
  const turnFinalRef = useRef('');
  const turnInterimRef = useRef('');
  // Last text handed to the consumer, so identical repeats are dropped.
  const lastEmittedRef = useRef<string | null>(null);
  const startRef = useRef<() => void>(() => {});
  // Set while a coalesced restart is pending, so overlapping onerror/onend
  // callbacks for the same pause don't each spawn a recogniser.
  const resumeTimerRef = useRef<number | null>(null);
  // Whether the turn now ending produced any transcript, and how many turns
  // in a row have produced none.
  const heardThisTurnRef = useRef(false);
  const silentTurnsRef = useRef(0);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const halt = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
  }, []);

  // Single-flight restart: schedule at most one `beginTurn()` per quiet gap.
  // The `resumeTimerRef` guard also makes the per-turn bookkeeping below run
  // once per gap even though onerror and onend both land here.
  const resume = useCallback(() => {
    vlog('[voice] dict resume?', {
      listening: listeningRef.current,
      pending: resumeTimerRef.current !== null,
      heard: heardThisTurnRef.current,
      silentTurns: silentTurnsRef.current,
      keepAlive: keepAliveRef.current,
    });
    if (!listeningRef.current || resumeTimerRef.current !== null) return;

    if (heardThisTurnRef.current) {
      silentTurnsRef.current = 0;
    } else if (++silentTurnsRef.current >= MAX_SILENT_TURNS) {
      // Nothing heard for several turns running — the user is quiet (or the
      // recogniser cannot start at all). Stop rather than beep indefinitely.
      halt();
      return;
    }

    if (keepAliveRef.current >= MAX_KEEPALIVE) {
      halt();
      return;
    }
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      if (!listeningRef.current) return;
      keepAliveRef.current++;
      startRef.current();
    }, RESUME_DEBOUNCE_MS);
  }, [halt]);

  const emit = useCallback((force = false) => {
    const text = joinText(
      committedRef.current, turnFinalRef.current, turnInterimRef.current,
    );
    // One browser event can carry several results, and the engine reports each
    // one separately with the same turn snapshot attached. Emitting per result
    // would hand the consumer identical text two or three times over; only a
    // real change is worth reporting.
    if (!force && text === lastEmittedRef.current) return;
    lastEmittedRef.current = text;
    vlog('[voice] dict emit', {
      committed: committedRef.current,
      turnFinal: turnFinalRef.current,
      turnInterim: turnInterimRef.current,
      text,
    });
    optsRef.current.onSession(text);
  }, []);

  /**
   * Move the finished turn's text into the committed prefix. Called when a
   * turn ends, at which point its results are frozen and it is safe to treat
   * them as history.
   */
  const commitTurn = useCallback(() => {
    const turnText = joinText(turnFinalRef.current, turnInterimRef.current);
    if (turnText) committedRef.current = joinText(committedRef.current, turnText);
    turnFinalRef.current = '';
    turnInterimRef.current = '';
    vlog('[voice] dict commit', { turnText, committed: committedRef.current });
  }, []);

  const beginTurn = useCallback(() => {
    if (!engine || engine.kind === 'none') return;
    listeningRef.current = true;
    heardThisTurnRef.current = false;
    setListening(true);
    vlog('[voice] dict turn', {
      keepAlive: keepAliveRef.current,
      silentTurns: silentTurnsRef.current,
      committed: committedRef.current,
    });
    void engine.start({
      lang: optsRef.current.lang || 'he-IL',
      onResult: (r) => {
        if (!listeningRef.current) return;
        heardThisTurnRef.current = true;
        keepAliveRef.current = 0;
        // Replace this turn's text with the recogniser's current view of it.
        // Never append: the result list is re-partitioned as it listens, so
        // appending both repeats and drops words.
        if (r.turnFinal !== undefined || r.turnInterim !== undefined) {
          turnFinalRef.current = r.turnFinal ?? '';
          turnInterimRef.current = r.turnInterim ?? '';
        } else if (r.isFinal) {
          // An engine with no turn snapshot (fixed-vocabulary template
          // engines) hands over one whole utterance at a time.
          turnFinalRef.current = joinText(turnFinalRef.current, r.transcript);
          turnInterimRef.current = '';
        } else {
          turnInterimRef.current = r.transcript;
        }
        emit();
      },
      onError: (e) => {
        vlog('[voice] dict error', { e, listening: listeningRef.current });
        if (!listeningRef.current) return;
        // A pause in speech surfaces as 'no-speech' (Chrome) or a bare
        // 'aborted' — keep the mic alive rather than treating it as failure.
        if (e === 'no-speech' || e === 'aborted') {
          resume();
          return;
        }
        clearResumeTimer();
        halt();
        setError(e);
      },
      onEnd: () => {
        vlog('[voice] dict end', {
          heard: heardThisTurnRef.current, listening: listeningRef.current,
        });
        if (!listeningRef.current) return;
        // The turn's results are frozen now — including any interim that never
        // got a final — so bank them before the next turn starts fresh.
        commitTurn();
        emit();
        resume();
      },
    });
  }, [engine, emit, resume, clearResumeTimer, halt, commitTurn]);

  useEffect(() => { startRef.current = beginTurn; }, [beginTurn]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    keepAliveRef.current = 0;
    silentTurnsRef.current = 0;
    clearResumeTimer();
    engine?.stop();
    setListening(false);
  }, [engine, clearResumeTimer]);

  const start = useCallback(() => {
    if (!engine || engine.kind === 'none' || listeningRef.current) return;
    setError(null);
    clearResumeTimer();
    keepAliveRef.current = 0;
    silentTurnsRef.current = 0;
    committedRef.current = '';
    turnFinalRef.current = '';
    turnInterimRef.current = '';
    lastEmittedRef.current = null;
    void (async () => {
      const granted = await engine.requestPermission();
      if (!granted) { setError('no-permission'); return; }
      beginTurn();
    })();
  }, [engine, beginTurn, clearResumeTimer]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  // Tear the engine down on unmount.
  useEffect(() => () => { clearResumeTimer(); engine?.destroy(); }, [engine, clearResumeTimer]);

  return { supported, listening, error, start, stop, toggle };
}
