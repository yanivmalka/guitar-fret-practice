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
const MAX_KEEPALIVE = 120;

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

  const emit = useCallback(() => {
    const finals = finalsRef.current;
    const interim = interimRef.current;
    const sep = finals && interim ? ' ' : '';
    optsRef.current.onSession(finals + sep + interim);
  }, []);

  const beginTurn = useCallback(() => {
    if (!engine || engine.kind === 'none') return;
    listeningRef.current = true;
    setListening(true);
    void engine.start({
      lang: optsRef.current.lang || 'he-IL',
      onResult: (r) => {
        if (!listeningRef.current) return;
        keepAliveRef.current = 0;
        const text = r.transcript.trim();
        if (r.isFinal) {
          if (text) {
            finalsRef.current += (finalsRef.current ? ' ' : '') + text;
          }
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
          if (keepAliveRef.current < MAX_KEEPALIVE) {
            keepAliveRef.current++;
            startRef.current();
          } else {
            listeningRef.current = false;
            setListening(false);
          }
          return;
        }
        listeningRef.current = false;
        setListening(false);
        setError(e);
      },
      onEnd: () => {
        if (!listeningRef.current) return;
        // Fold any trailing interim into the finalised text so it isn't lost
        // when the turn ends without a final result.
        if (interimRef.current) {
          finalsRef.current += (finalsRef.current ? ' ' : '') + interimRef.current;
          interimRef.current = '';
          emit();
        }
        if (keepAliveRef.current < MAX_KEEPALIVE) {
          keepAliveRef.current++;
          startRef.current();
        } else {
          listeningRef.current = false;
          setListening(false);
        }
      },
    });
  }, [engine, emit]);

  useEffect(() => { startRef.current = beginTurn; }, [beginTurn]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    keepAliveRef.current = 0;
    engine?.stop();
    setListening(false);
  }, [engine]);

  const start = useCallback(() => {
    if (!engine || engine.kind === 'none' || listeningRef.current) return;
    setError(null);
    keepAliveRef.current = 0;
    finalsRef.current = '';
    interimRef.current = '';
    void (async () => {
      const granted = await engine.requestPermission();
      if (!granted) { setError('no-permission'); return; }
      beginTurn();
    })();
  }, [engine, beginTurn]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  // Tear the engine down on unmount.
  useEffect(() => () => { engine?.destroy(); }, [engine]);

  return { supported, listening, error, start, stop, toggle };
}
