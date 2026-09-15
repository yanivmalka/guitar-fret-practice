import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch } from './pitchDetect';
import { frequencyToNote, type NoteMatch } from './noteUtils';

export type TunerStatus = 'idle' | 'requesting' | 'listening' | 'denied' | 'error';

export interface TunerReading {
  frequency: number;
  note: NoteMatch;
}

interface TunerState {
  status: TunerStatus;
  reading: TunerReading | null;
  errorMessage: string | null;
}

// Large enough buffer that a bass low E (41.2 Hz, period ~1070 samples @
// 44.1kHz) gets several full periods to correlate against, with headroom.
// (Analyser fftSize must be a power of two.)
const FFT_SIZE = 8192;

// The detection loop runs once per animation frame (~60Hz), but pushing every
// single frame straight into React state made the displayed Hz/cents flicker
// too fast to read — each frame is an independent measurement with its own
// small jitter. Instead, samples collected within one UPDATE_INTERVAL_MS
// window are combined with a median (robust to the occasional outlier) and
// the display only updates that often (~8x/sec — still feels live, actually
// readable).
const UPDATE_INTERVAL_MS = 120;
// A single missed frame (a noisy zero-crossing, a pick attack) shouldn't
// blank the display; only clear the reading after a real gap in detection.
// A plucked string keeps ringing (and staying in tune) for a couple of
// seconds after it's played, so the display should hold the last reading
// through that decay instead of blanking the moment the signal dips below
// the detection threshold.
const SILENCE_TIMEOUT_MS = 2500;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Owns the mic stream + Web Audio analyser and runs the pitch-detection loop.
 * Deliberately independent of the rest of the app's audio module
 * (src/utils/audio.ts) — this is a standalone prototype (see
 * src/tuner/README.md) until it's wired into the real app.
 */
export function useTuner() {
  const [state, setState] = useState<TunerState>({ status: 'idle', reading: null, errorMessage: null });

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(FFT_SIZE));
  const recentFrequenciesRef = useRef<number[]>([]);
  const lastUpdateAtRef = useRef(0);
  const lastDetectionAtRef = useRef(0);

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
    setState({ status: 'idle', reading: null, errorMessage: null });
  }, []);

  const start = useCallback(async () => {
    setState({ status: 'requesting', reading: null, errorMessage: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
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

      setState({ status: 'listening', reading: null, errorMessage: null });
      recentFrequenciesRef.current = [];
      lastUpdateAtRef.current = 0;
      lastDetectionAtRef.current = 0;

      const loop = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;
        currentAnalyser.getFloatTimeDomainData(bufferRef.current);
        const result = detectPitch(bufferRef.current, audioContext.sampleRate);
        const now = performance.now();
        if (result) {
          recentFrequenciesRef.current.push(result.frequency);
          lastDetectionAtRef.current = now;
        }

        if (now - lastUpdateAtRef.current >= UPDATE_INTERVAL_MS) {
          lastUpdateAtRef.current = now;
          if (recentFrequenciesRef.current.length > 0) {
            const smoothedFrequency = median(recentFrequenciesRef.current);
            recentFrequenciesRef.current = [];
            const note = frequencyToNote(smoothedFrequency);
            setState((prev) => ({ ...prev, status: 'listening', reading: { frequency: smoothedFrequency, note } }));
          } else if (now - lastDetectionAtRef.current > SILENCE_TIMEOUT_MS) {
            setState((prev) => (prev.reading === null ? prev : { ...prev, reading: null }));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setState({
        status: isDenied ? 'denied' : 'error',
        reading: null,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Stop the mic/audio graph on unmount so a page navigation doesn't leave
  // the mic indicator on.
  useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}
