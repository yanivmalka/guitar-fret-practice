import { useEffect, useRef, useState } from 'react';

interface Props {
  remaining: number;  // seconds left (integer countdown)
  total: number;      // total seconds for this question
  answered: boolean;  // freeze bar when answered
  paused?: boolean;   // freeze bar in place while paused
}

export default function SpeedBar({ remaining, total, answered, paused = false }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const frozenRef = useRef(false);
  const pausedAtRef = useRef(0);

  // Reset on new question (remaining resets to total)
  useEffect(() => {
    if (remaining === total && !answered) {
      startRef.current = Date.now();
      frozenRef.current = false;
      setElapsed(0);
    }
  }, [remaining, total, answered]);

  // Freeze on answer
  useEffect(() => {
    if (answered) {
      frozenRef.current = true;
    }
  }, [answered]);

  // Freeze in place on pause; on resume, shift the start time forward by the
  // paused duration so the bar continues from the exact same visual position
  // instead of jumping ahead by the time spent paused.
  useEffect(() => {
    if (paused) {
      frozenRef.current = true;
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current) {
      const pauseDuration = Date.now() - pausedAtRef.current;
      startRef.current += pauseDuration;
      pausedAtRef.current = 0;
      if (!answered) frozenRef.current = false;
    }
  }, [paused, answered]);

  // Animate the bar smoothly — restarts when answered resets to false
  useEffect(() => {
    if (answered || paused) return; // don't animate while frozen
    frozenRef.current = false;
    const tick = () => {
      if (frozenRef.current) return;
      const now = Date.now();
      const secs = (now - startRef.current) / 1000;
      setElapsed(Math.min(secs, total));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [total, answered, paused]);

  const pct = Math.min((elapsed / total) * 100, 100);

  // Color: green → yellow → red based on elapsed percentage
  // hue goes from 120 (green) at 0% to 0 (red) at 100%
  const hue = Math.round(120 - (pct / 100) * 120);
  const color = `hsl(${hue}, 80%, 45%)`;

  return (
    <div className="speed-bar-container">
      <div
        className={`speed-bar-fill ${answered ? 'speed-bar-frozen' : ''}`}
        style={{ width: `${pct}%`, background: color }}
      />
      <span className="speed-bar-time">{remaining > 0 ? remaining : ''}</span>
    </div>
  );
}
