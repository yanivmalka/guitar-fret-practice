import { useEffect, useRef, useState } from 'react';

interface Props {
  remaining: number;  // seconds left (integer countdown), for the text label
  total: number;      // exact time limit for this question (seconds)
  startAt: number;    // wall-clock (ms) the question's countdown started at
  answered: boolean;  // freeze bar when answered
  paused?: boolean;   // freeze bar in place while paused
}

// The parent remounts this component (via a per-question `key`) for every
// question and every "where else?" sub-round, so there is no cross-question
// state to reset here: `startAt`/`total` are captured fresh at mount and the
// bar spans exactly `total` seconds from exactly `startAt`. On resume the
// engine starts a brand-new question, which remounts this too.
export default function SpeedBar({ remaining, total, startAt, answered, paused = false }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(startAt);

  useEffect(() => {
    if (answered || paused) return; // frozen — stop animating, keep last position
    const tick = () => {
      const secs = (Date.now() - startRef.current) / 1000;
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
