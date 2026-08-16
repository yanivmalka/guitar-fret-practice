import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
}

export default function AnimatedScore({ value }: Props) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(display);
  const targetRef = useRef(value);

  useEffect(() => {
    if (value === display) return;
    startRef.current = display;
    targetRef.current = value;
    const diff = value - display;
    const duration = Math.min(Math.max(Math.abs(diff) * 20, 200), 800);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out: fast start, slow end (slot machine feel)
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(startRef.current + diff * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(targetRef.current);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className="score-live-pts">{display}</span>;
}
