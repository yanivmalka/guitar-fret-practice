import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechEngine,
  speechLangForNotation,
  vocabularyFor,
  type SpeechEngine,
  type SpeechEngineError,
} from '../utils/speech';
import { parseSpokenFret, parseSpokenNote, type SpeechNotation } from '../utils/speechVocab';

// ── useVoiceAnswer ──────────────────────────────────────────────────────
//
// WP-3 of the voice-recognition feature. Bridges the speech engine
// (`utils/speech.ts`) to the game engine: while a question is on screen and
// voice input is enabled, it listens, turns the transcript into a note or
// fret via `speechVocab.ts`, and calls back so `useGameEngine` can score it
// exactly as if the user had tapped.
//
// Per the repo's timer conventions, values read inside async speech
// callbacks are kept in refs; React state exists only for what the UI
// renders (status text, partial transcript, error).

export type VoiceStatus = 'idle' | 'listening' | 'heard' | 'error';
export type MicPermission = 'unknown' | 'granted' | 'denied';

export interface UseVoiceAnswerParams {
  /** Master switch — the user's "voice input" preference. */
  enabled: boolean;
  running: boolean;
  paused: boolean;
  answered: boolean;
  byNote: boolean;
  /** Bumped once per question / "where else?" sub-round by useGameEngine. */
  questionSeq: number;
  /** True while a question is actually on screen (fret shown, or note shown). */
  hasActiveQuestion: boolean;
  notation: SpeechNotation;
  /** BCP-47 override, e.g. "he-IL" for spoken Hebrew solfège. */
  langOverride?: string;
  /** Called with a recognised note name ("C", "F#") — wire to selectAnswer. */
  onNote: (note: string) => void;
  /** Called with a recognised fret number — wire to selectFret. */
  onFret: (fret: number) => void;
}

export interface UseVoiceAnswerResult {
  supported: boolean;
  status: VoiceStatus;
  /** Most recent (possibly interim) transcript, for display. */
  partial: string;
  error: SpeechEngineError | null;
  permission: MicPermission;
  /** Prompt for microphone access; resolves to whether it is now granted. */
  ensurePermission: () => Promise<boolean>;
  /** Manually restart listening for the current question. */
  retry: () => void;
}

const MAX_AUTO_RETRIES = 1;

export function useVoiceAnswer(params: UseVoiceAnswerParams): UseVoiceAnswerResult {
  const [engine] = useState<SpeechEngine | null>(() =>
    typeof window === 'undefined' ? null : getSpeechEngine(),
  );
  const supported = !!engine && engine.kind !== 'none';

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<SpeechEngineError | null>(null);
  const [permission, setPermission] = useState<MicPermission>('unknown');

  // Refs so async speech callbacks never read a stale closure.
  const pRef = useRef(params);
  const permissionRef = useRef<MicPermission>('unknown');
  const handledRef = useRef(false);
  const retriesRef = useRef(0);
  const listeningRef = useRef(false);
  const listenRef = useRef<() => void>(() => {});

  useEffect(() => { pRef.current = params; });
  useEffect(() => { permissionRef.current = permission; }, [permission]);

  const stopListening = useCallback(() => {
    const wasListening = listeningRef.current;
    listeningRef.current = false;
    engine?.stop();
    // The web engine reports an 'aborted' error that resets status; the
    // native/null engines do not, so settle it here too.
    if (wasListening) setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, [engine]);

  const tryParse = useCallback((transcript: string): boolean => {
    const p = pRef.current;
    if (p.byNote) {
      const fret = parseSpokenFret(transcript);
      if (fret === null) return false;
      handledRef.current = true;
      stopListening();
      setStatus('heard');
      p.onFret(fret);
      return true;
    }
    const note = parseSpokenNote(transcript, p.notation);
    if (note === null) return false;
    handledRef.current = true;
    stopListening();
    setStatus('heard');
    p.onNote(note);
    return true;
  }, [stopListening]);

  const listen = useCallback(() => {
    const p = pRef.current;
    if (!engine || engine.kind === 'none') return;
    if (permissionRef.current === 'denied') return;

    handledRef.current = false;
    listeningRef.current = true;
    setError(null);
    setPartial('');
    setStatus('listening');

    void engine.start({
      lang: speechLangForNotation(p.notation, p.langOverride),
      vocabulary: vocabularyFor(p.notation),
      onResult: (r) => {
        if (handledRef.current) return;
        setPartial(r.transcript);
        tryParse(r.transcript);
      },
      onError: (e) => {
        if (handledRef.current) return;
        listeningRef.current = false;
        if (e === 'no-permission') {
          setPermission('denied');
          permissionRef.current = 'denied';
        }
        if (e === 'no-speech' && retriesRef.current < MAX_AUTO_RETRIES) {
          retriesRef.current++;
          listenRef.current();
          return;
        }
        if (e === 'aborted') {
          // We stopped it deliberately (answer submitted / question changed).
          setStatus((s) => (s === 'heard' ? s : 'idle'));
          return;
        }
        setError(e);
        setStatus('error');
      },
      onEnd: () => {
        if (!listeningRef.current) return;
        listeningRef.current = false;
        setStatus((s) => (s === 'heard' ? s : 'idle'));
      },
    });
  }, [engine, tryParse]);

  useEffect(() => { listenRef.current = listen; }, [listen]);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (!engine || engine.kind === 'none') return false;
    const granted = await engine.requestPermission();
    const next: MicPermission = granted ? 'granted' : 'denied';
    setPermission(next);
    permissionRef.current = next;
    return granted;
  }, [engine]);

  const retry = useCallback(() => {
    retriesRef.current = 0;
    setError(null);
    listen();
  }, [listen]);

  // Drive listening from game state. A change in questionSeq means a fresh
  // question, so retries reset and a new listen turn begins.
  const {
    enabled, running, paused, answered, hasActiveQuestion, questionSeq,
  } = params;

  useEffect(() => {
    const active =
      enabled && supported && running && !paused && !answered && hasActiveQuestion;

    if (active) {
      retriesRef.current = 0;
      listen();
    } else {
      // Just stop; the engine's abort/end callback settles `status` back to
      // 'idle'. Stale `partial` text is cleared by the next listen() and the
      // UI only shows it while status === 'listening'.
      stopListening();
    }

    return () => { stopListening(); };
  }, [enabled, supported, running, paused, answered, hasActiveQuestion, questionSeq, listen, stopListening]);

  // Tear the engine down on unmount.
  useEffect(() => () => { engine?.destroy(); }, [engine]);

  return { supported, status, partial, error, permission, ensurePermission, retry };
}
