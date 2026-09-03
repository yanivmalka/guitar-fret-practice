import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDictationEngine,
  type SpeechEngine,
  type SpeechEngineError,
} from '../utils/speech';

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

/**
 * Append `next` to `prev`, dropping a leading run of words in `next` that
 * merely repeats the tail of `prev`. A restarted recogniser re-hears the end
 * of whatever was being said across the gap, so the first word or two of the
 * new turn can arrive already recorded.
 */
function appendWithoutOverlap(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  const a = prev.split(/\s+/);
  const b = next.split(/\s+/);
  for (let k = Math.min(a.length, b.length); k > 0; k--) {
    let same = true;
    for (let i = 0; i < k; i++) {
      if (a[a.length - k + i].toLowerCase() !== b[i].toLowerCase()) { same = false; break; }
    }
    if (same) return [...a, ...b.slice(k)].join(' ');
  }
  return `${prev} ${next}`;
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
  // Text finalised so far this session, and the in-progress phrase.
  const finalsRef = useRef('');
  const interimRef = useRef('');
  const startRef = useRef<() => void>(() => {});
  // Set while a coalesced restart is pending, so overlapping onerror/onend
  // callbacks for the same pause don't each spawn a recogniser.
  const resumeTimerRef = useRef<number | null>(null);
  // Whether the turn now ending produced any transcript, and how many turns
  // in a row have produced none.
  const heardThisTurnRef = useRef(false);
  const silentTurnsRef = useRef(0);
  // True for the first result of a turn that began as a restart, where the
  // recogniser may re-hear the tail of the previous turn.
  const justResumedRef = useRef(false);

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
      justResumedRef.current = true;
      startRef.current();
    }, RESUME_DEBOUNCE_MS);
  }, [halt]);

  const emit = useCallback(() => {
    const finals = finalsRef.current;
    const interim = interimRef.current;
    const sep = finals && interim ? ' ' : '';
    optsRef.current.onSession(finals + sep + interim);
  }, []);

  // Fold a finished phrase into the session text. Only the first phrase of a
  // restarted turn is overlap-trimmed; mid-turn a genuinely repeated word is
  // the speaker's own and must survive.
  const foldFinal = useCallback((text: string) => {
    if (!text) return;
    finalsRef.current = justResumedRef.current
      ? appendWithoutOverlap(finalsRef.current, text)
      : finalsRef.current + (finalsRef.current ? ' ' : '') + text;
    justResumedRef.current = false;
  }, []);

  const beginTurn = useCallback(() => {
    if (!engine || engine.kind === 'none') return;
    listeningRef.current = true;
    heardThisTurnRef.current = false;
    setListening(true);
    void engine.start({
      lang: optsRef.current.lang || 'he-IL',
      onResult: (r) => {
        if (!listeningRef.current) return;
        heardThisTurnRef.current = true;
        keepAliveRef.current = 0;
        const text = r.transcript.trim();
        if (r.isFinal) {
          foldFinal(text);
          interimRef.current = '';
        } else {
          interimRef.current = text;
        }
        emit();
      },
      onError: (e) => {
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
        if (!listeningRef.current) return;
        // Fold any trailing interim into the finalised text so it isn't lost
        // when the turn ends without a final result.
        if (interimRef.current) {
          foldFinal(interimRef.current);
          interimRef.current = '';
          emit();
        }
        resume();
      },
    });
  }, [engine, emit, resume, clearResumeTimer, halt, foldFinal]);

  useEffect(() => { startRef.current = beginTurn; }, [beginTurn]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    keepAliveRef.current = 0;
    silentTurnsRef.current = 0;
    justResumedRef.current = false;
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
    justResumedRef.current = false;
    finalsRef.current = '';
    interimRef.current = '';
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
