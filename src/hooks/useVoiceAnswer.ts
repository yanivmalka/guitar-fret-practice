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
// A browser SpeechRecognition instance that was just .stop()'d can still throw
// "already started" if a new one starts too soon — most visible on the Auto
// Advance stage boundary, where the driver effect thrashes stop→start several
// times in a few ms. Coalesce starts behind a short timer, and re-arm a few
// times if the engine still reports it could not begin.
const START_DEBOUNCE_MS = 90;
const MAX_START_RETRIES = 4;
const START_RETRY_MS = 200;
// An interim transcript that already parses ("C") must not be submitted right
// away — the speaker may still be mid-phrase ("C… sharp"). Hold a parseable
// interim this long after the last interim before committing it; a final
// result (speech endpoint detected) commits immediately. Also short-circuited
// when the same answer repeats across interims (see `ingest`).
const INTERIM_COMMIT_MS = 400;
// If two consecutive interims parse to the same answer the speaker has almost
// certainly finished it — commit sooner, but still leave a small gap so a
// trailing "…sharp" after "C" can still land.
const STABLE_COMMIT_MS = 250;
// The browser recogniser can end its turn on its own (silence, transient
// network blip) while the question is still on screen. Silently resume up to
// this many times per question so the mic doesn't just go dead.
const MAX_KEEPALIVE = 30;

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
  const startRetriesRef = useRef(0);
  const keepAliveRef = useRef(0);
  // Signature of the last parseable answer seen on an interim, to detect when
  // the same answer repeats and can be committed early.
  const lastParsedSigRef = useRef<string | null>(null);
  const listeningRef = useRef(false);
  const startTimerRef = useRef<number | null>(null);
  const listenRef = useRef<() => void>(() => {});
  // Latest parseable answer from an interim transcript, awaiting the quiet
  // period before it is submitted.
  const pendingRef = useRef<{ note?: string; fret?: number } | null>(null);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(() => { pRef.current = params; });
  useEffect(() => { permissionRef.current = permission; }, [permission]);

  const stopListening = useCallback(() => {
    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    pendingRef.current = null;
    const wasListening = listeningRef.current;
    listeningRef.current = false;
    engine?.stop();
    // The web engine reports an 'aborted' error that resets status; the
    // native/null engines do not, so settle it here too.
    if (wasListening) setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, [engine]);

  const commitPending = useCallback(() => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    const pend = pendingRef.current;
    if (!pend || handledRef.current) return;
    handledRef.current = true;
    stopListening();
    setStatus('heard');
    if (pend.fret !== undefined) pRef.current.onFret(pend.fret);
    else if (pend.note !== undefined) pRef.current.onNote(pend.note);
  }, [stopListening]);

  // Feed a transcript (interim or final) from the engine. A parseable interim
  // is held as `pendingRef` and only submitted once transcripts go quiet
  // (INTERIM_COMMIT_MS) so "C" has time to grow into "C sharp"; a final result
  // is submitted at once. An unparseable transcript never clears an earlier
  // pending value.
  const ingest = useCallback((transcripts: string[], isFinal: boolean) => {
    if (handledRef.current) return;
    const p = pRef.current;
    // Try each hypothesis in rank order; keep the first that parses.
    let parsed: { note?: string; fret?: number } | null = null;
    for (const t of transcripts) {
      if (p.byNote) {
        const f = parseSpokenFret(t);
        if (f !== null) { parsed = { fret: f }; break; }
      } else {
        const n = parseSpokenNote(t, p.notation);
        if (n !== null) { parsed = { note: n }; break; }
      }
    }

    if (parsed) pendingRef.current = parsed;

    if (isFinal) {
      commitPending();
      return;
    }
    if (!parsed) return;

    const sig = parsed.fret !== undefined ? `f${parsed.fret}` : `n${parsed.note}`;
    const stable = sig === lastParsedSigRef.current;
    lastParsedSigRef.current = sig;

    if (commitTimerRef.current !== null) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(
      commitPending,
      stable ? STABLE_COMMIT_MS : INTERIM_COMMIT_MS,
    );
  }, [commitPending]);

  const startNow = useCallback(() => {
    startTimerRef.current = null;
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
        ingest(r.alternatives?.length ? r.alternatives : [r.transcript], r.isFinal);
      },
      onError: (e) => {
        if (handledRef.current) return;
        listeningRef.current = false;
        if (e === 'no-permission') {
          setPermission('denied');
          permissionRef.current = 'denied';
        }
        // Reaching here with 'aborted' means the engine could not begin
        // (e.g. a previous recognition still winding down after a stage
        // change) — a deliberate stop is swallowed by the engine's own turn
        // guard. Re-arm a few times before giving up.
        if (e === 'aborted' && startRetriesRef.current < MAX_START_RETRIES) {
          startRetriesRef.current++;
          if (startTimerRef.current !== null) clearTimeout(startTimerRef.current);
          startTimerRef.current = window.setTimeout(() => listenRef.current(), START_RETRY_MS);
          return;
        }
        if (e === 'no-speech' && retriesRef.current < MAX_AUTO_RETRIES) {
          retriesRef.current++;
          listenRef.current();
          return;
        }
        if (e === 'aborted') {
          setStatus((s) => (s === 'heard' ? s : 'idle'));
          return;
        }
        setError(e);
        setStatus('error');
      },
      onEnd: () => {
        if (!listeningRef.current) return;
        listeningRef.current = false;
        // The recogniser stopped on its own. If no answer has been committed
        // and the question is still up, transparently resume so the mic keeps
        // listening for the whole question rather than going dead.
        const q = pRef.current;
        const stillActive =
          q.enabled && q.running && !q.paused && !q.answered && q.hasActiveQuestion;
        if (!handledRef.current && stillActive && keepAliveRef.current < MAX_KEEPALIVE) {
          keepAliveRef.current++;
          listenRef.current();
          return;
        }
        setStatus((s) => (s === 'heard' ? s : 'idle'));
      },
    });
  }, [engine, ingest]);

  // Coalesce rapid (re)start requests behind a short timer so a just-stopped
  // browser recogniser has a moment to settle before the next one starts.
  const listen = useCallback(() => {
    if (startTimerRef.current !== null) clearTimeout(startTimerRef.current);
    startTimerRef.current = window.setTimeout(startNow, START_DEBOUNCE_MS);
  }, [startNow]);

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
    startRetriesRef.current = 0;
    keepAliveRef.current = 0;
    lastParsedSigRef.current = null;
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
      startRetriesRef.current = 0;
      keepAliveRef.current = 0;
      lastParsedSigRef.current = null;
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
