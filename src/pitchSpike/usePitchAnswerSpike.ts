import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch } from '../tuner/pitchDetect';
import { frequencyToNote } from '../tuner/noteUtils';
import { GUITAR } from './guitarPool';

export type MicStatus = 'idle' | 'requesting' | 'listening' | 'denied' | 'error';
export type QuestionOutcome = 'correct' | 'timeout';

export interface Question {
  stringIdx: number; // 0 = high E
  fret: number;
  midi: number;
  noteName: string;
}

export interface LiveReading {
  frequency: number;
  noteName: string;
  clarity: number;
}

export interface LogEntry {
  at: string; // ISO timestamp, for correlating with a written go/no-go note
  targetNote: string;
  targetString: number; // 1-based, matches the app's stringLabels convention
  targetFret: number;
  outcome: QuestionOutcome;
  detectedNote: string | null;
  cents: number | null;
  correctOctave: boolean | null;
  clarity: number | null;
  latencyMs: number | null;
  noisyRoom: boolean;
}

// How long a detected pitch class must stay stable before it counts as an
// answer, so a sliding fretting hand or a brushed adjacent string isn't
// scored as a wrong note — a crude stand-in for real attack detection (see
// premium-product-plan.md §7, item 3).
const REQUIRED_STABLE_TICKS = 2;
const TICK_MS = 120;
const TIMEOUT_MS = 6000;
const FFT_SIZE = 8192;

function randomQuestion(previous: Question | null): Question {
  let next: Question;
  do {
    const stringIdx = Math.floor(Math.random() * GUITAR.stringCount);
    const fret = Math.floor(Math.random() * 13); // frets 0-12, matches Free "Dots" difficulty range
    const midi = GUITAR.openMidi[stringIdx] + fret;
    const noteName = GUITAR.notes[stringIdx][fret];
    next = { stringIdx, fret, midi, noteName };
  } while (previous && next.stringIdx === previous.stringIdx && next.fret === previous.fret);
  return next;
}

/**
 * Throwaway measurement tool for the guitar-audio spike described in
 * premium-product-plan.md §7 — NOT the real "play the note" answer
 * modality. It exists only to gather real latency/accuracy/octave-error
 * numbers on a real device (ideally in a real noisy room) so that spike can
 * reach a written go/no-go before any of this becomes a committed feature.
 */
export function usePitchAnswerSpike() {
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [liveReading, setLiveReading] = useState<LiveReading | null>(null);
  const [lastResult, setLastResult] = useState<LogEntry | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [noisyRoom, setNoisyRoom] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(FFT_SIZE));
  const lastTickAtRef = useRef(0);

  const questionRef = useRef<Question | null>(null);
  const questionStartedAtRef = useRef<number | null>(null);
  const awaitingNextRef = useRef(false); // true once a question is resolved, until "Next" is pressed
  const stableStreakRef = useRef({ midi: -1, ticks: 0 });
  const noisyRoomRef = useRef(false);

  useEffect(() => {
    noisyRoomRef.current = noisyRoom;
  }, [noisyRoom]);

  const recordResult = useCallback((entry: LogEntry) => {
    setLastResult(entry);
    setLog((prev) => [entry, ...prev].slice(0, 200));
    awaitingNextRef.current = true;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicStatus('idle');
    setLiveReading(null);
  }, []);

  const start = useCallback(async () => {
    setMicStatus('requesting');
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(analyser);
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);

      setMicStatus('listening');
      lastTickAtRef.current = 0;
      stableStreakRef.current = { midi: -1, ticks: 0 };

      const loop = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;
        currentAnalyser.getFloatTimeDomainData(bufferRef.current);
        const result = detectPitch(bufferRef.current, audioContext.sampleRate);
        const now = performance.now();

        if (result) {
          const note = frequencyToNote(result.frequency);
          if (now - lastTickAtRef.current >= TICK_MS) {
            lastTickAtRef.current = now;
            setLiveReading({ frequency: result.frequency, noteName: `${note.name}${note.octave}`, clarity: result.clarity });

            const q = questionRef.current;
            if (q && !awaitingNextRef.current) {
              const streak = stableStreakRef.current;
              if (streak.midi === note.midi) {
                streak.ticks += 1;
              } else {
                stableStreakRef.current = { midi: note.midi, ticks: 1 };
              }

              const pitchClassMatch = ((note.midi - q.midi) % 12 + 12) % 12 === 0;
              if (pitchClassMatch && stableStreakRef.current.ticks >= REQUIRED_STABLE_TICKS) {
                const startedAt = questionStartedAtRef.current ?? now;
                recordResult({
                  at: new Date().toISOString(),
                  targetNote: q.noteName,
                  targetString: q.stringIdx + 1,
                  targetFret: q.fret,
                  outcome: 'correct',
                  detectedNote: `${note.name}${note.octave}`,
                  cents: note.cents,
                  correctOctave: note.midi === q.midi,
                  clarity: result.clarity,
                  latencyMs: Math.round(now - startedAt),
                  noisyRoom: noisyRoomRef.current,
                });
              }
            }
          }
        }

        const q = questionRef.current;
        const startedAt = questionStartedAtRef.current;
        if (q && startedAt !== null && !awaitingNextRef.current && now - startedAt > TIMEOUT_MS) {
          recordResult({
            at: new Date().toISOString(),
            targetNote: q.noteName,
            targetString: q.stringIdx + 1,
            targetFret: q.fret,
            outcome: 'timeout',
            detectedNote: null,
            cents: null,
            correctOctave: null,
            clarity: null,
            latencyMs: null,
            noisyRoom: noisyRoomRef.current,
          });
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setMicStatus(isDenied ? 'denied' : 'error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [recordResult]);

  const nextQuestion = useCallback(() => {
    const next = randomQuestion(questionRef.current);
    questionRef.current = next;
    questionStartedAtRef.current = performance.now();
    awaitingNextRef.current = false;
    stableStreakRef.current = { midi: -1, ticks: 0 };
    setQuestion(next);
    setLastResult(null);
    setLiveReading(null);
  }, []);

  useEffect(() => stop, [stop]);

  const clearLog = useCallback(() => setLog([]), []);

  return {
    micStatus,
    errorMessage,
    start,
    stop,
    question,
    liveReading,
    lastResult,
    log,
    noisyRoom,
    setNoisyRoom,
    nextQuestion,
    clearLog,
  };
}
