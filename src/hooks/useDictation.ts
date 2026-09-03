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
// timing rules. Here the goal is ordinary speech-to-text.
//
// One tap captures one phrase. Android (and Samsung Internet) end the
// recogniser after every utterance no matter what `continuous` asks for, and
// the system plays its recognition chime on each start, so transparently
// restarting to fake a continuous mic turned every thinking pause into a
// stream of beeps. Stopping at the end of the phrase instead means exactly
// one chime in and one out; the caller keeps the text, so a second tap
// carries on where the first left off.
//
// Per the repo convention, values read inside the async speech callbacks are
// kept in refs so a stale closure never fires.

export interface UseDictationOptions {
  /** BCP-47 tag. Defaults to Hebrew — the feedback board is written in Hebrew. */
  lang?: string;
  /**
   * Called on every recognised result with the full text of the phrase spoken
   * since the mic was switched on. Replace the dictated span of your draft
   * with it.
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
  // The phrase's text is never accumulated word by word — it is replaced
  // wholesale from the recogniser's current view of the turn (see `onResult`),
  // because the result list is re-partitioned as it listens.
  const turnFinalRef = useRef('');
  const turnInterimRef = useRef('');
  // Last text handed to the consumer, so identical repeats are dropped.
  const lastEmittedRef = useRef<string | null>(null);

  const halt = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
  }, []);

  const emit = useCallback(() => {
    const text = joinText(turnFinalRef.current, turnInterimRef.current);
    // One browser event can carry several results, and the engine reports each
    // one separately with the same turn snapshot attached. Emitting per result
    // would hand the consumer identical text two or three times over; only a
    // real change is worth reporting.
    if (text === lastEmittedRef.current) return;
    lastEmittedRef.current = text;
    vlog('[voice] dict emit', {
      turnFinal: turnFinalRef.current,
      turnInterim: turnInterimRef.current,
      text,
    });
    optsRef.current.onSession(text);
  }, []);

  const beginTurn = useCallback(() => {
    if (!engine || engine.kind === 'none') return;
    listeningRef.current = true;
    setListening(true);
    vlog('[voice] dict turn', {});
    void engine.start({
      lang: optsRef.current.lang || 'he-IL',
      // One phrase per tap — see the note at the top of the file.
      continuous: false,
      onResult: (r) => {
        if (!listeningRef.current) return;
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
        halt();
        // A pause in speech surfaces as 'no-speech' (Chrome) or a bare
        // 'aborted'. The mic is closing either way; saying nothing into it is
        // not a failure worth showing an error for.
        if (e !== 'no-speech' && e !== 'aborted') setError(e);
      },
      onEnd: () => {
        vlog('[voice] dict end', { listening: listeningRef.current });
        if (!listeningRef.current) return;
        // The turn's results are frozen now — including any interim that never
        // got a final — so hand over the final text and close the mic.
        emit();
        halt();
      },
    });
  }, [engine, emit, halt]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    engine?.stop();
    setListening(false);
  }, [engine]);

  const start = useCallback(() => {
    if (!engine || engine.kind === 'none' || listeningRef.current) return;
    setError(null);
    turnFinalRef.current = '';
    turnInterimRef.current = '';
    lastEmittedRef.current = null;
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
