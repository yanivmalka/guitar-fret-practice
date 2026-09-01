import { useEffect, useRef, useState } from 'react';

// ── useMicLevel ────────────────────────────────────────────────────────
//
// Live microphone input level (0..1, roughly perceptual) for the small
// on-screen meter shown in Voice answer mode so the user can see whether they
// are speaking loudly enough.
//
// It opens its *own* getUserMedia stream + AnalyserNode while `active`. Chrome
// and Firefox grant this happily alongside the separate stream the
// SpeechRecognition engine uses, so it does not disturb recognition. Every bit
// of setup is guarded: if the platform refuses a second stream, has no
// AudioContext, or permission is missing, the hook just keeps reporting 0 and
// `ready: false`, and the meter stays hidden.
//
// The rAF loop writes `level` on every frame, so this hook must live in a small
// leaf component (`VoiceLevelMeter`), never in a big one — otherwise the whole
// tree re-renders at 60fps.
export function useMicLevel(active: boolean): { level: number; peak: number; ready: boolean } {
  const [level, setLevel] = useState(0);
  // Peak-hold with slow decay: reflects the loudest point of the last spoken
  // phrase so a "too quiet / good" hint built on it does not flicker in the
  // gaps between words.
  const [peak, setPeak] = useState(0);
  const [ready, setReady] = useState(false);
  // Keep the running values across frames without forcing a render.
  const smoothedRef = useRef(0);
  const peakRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        const AC: typeof AudioContext | undefined =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;

        ctx = new AC();
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch { /* stays suspended — meter reads 0 */ }
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);
        smoothedRef.current = 0;
        peakRef.current = 0;
        if (!cancelled) setReady(true);

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          // Speech RMS sits around 0.02–0.2; map to 0..1 with a gentle curve so
          // normal talking lands mid-meter and a whisper is visibly low.
          const norm = Math.min(1, Math.pow(rms * 3.2, 0.7));
          // Fast attack, slow release — the bar jumps up with the voice and
          // eases back down so it reads as a level, not a flicker.
          const prev = smoothedRef.current;
          smoothedRef.current = norm > prev ? norm : prev * 0.85 + norm * 0.15;
          setLevel(smoothedRef.current);
          peakRef.current = Math.max(smoothedRef.current, peakRef.current * 0.97);
          setPeak(peakRef.current);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        /* no second stream / permission denied — leave meter hidden */
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => { /* already closed */ });
      setReady(false);
      setLevel(0);
      setPeak(0);
    };
  }, [active]);

  return { level, peak, ready };
}
