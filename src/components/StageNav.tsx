import { useEffect, useRef } from 'react';
import type { Stage } from '../utils/stages';
import { TOTAL_STAGES } from '../utils/stages';

interface Props {
  stage: Stage;
  stageIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  suggestion: 'next' | 'prev' | null;
}

export default function StageNav({ stage, stageIndex, onPrev, onNext, isPlaying, suggestion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 40) return;
      if (dx < 0) onNext();
      else onPrev();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onPrev, onNext]);

  const isFirst = stageIndex === 0;
  const isLast = stageIndex === TOTAL_STAGES - 1;
  const prevSuggested = suggestion === 'prev' && !isFirst;
  const nextSuggested = suggestion === 'next' && !isLast;

  return (
    <div className="stage-nav" ref={containerRef}>
      <button
        className={`stage-arrow ${prevSuggested ? 'stage-arrow-blinking' : ''}`}
        onClick={onPrev}
        disabled={isFirst}
        title={isPlaying ? 'Switch to easier stage' : 'Previous stage'}
        aria-label="Previous stage"
      >
        {prevSuggested
          ? <span className="stage-arrow-suggest">◀<br/><span className="stage-arrow-hint">easier?</span></span>
          : '◀'}
      </button>

      <div className="stage-info">
        <div className="stage-label">{stage.label}</div>
        <div className="stage-title">{stage.title}</div>
        <div className="stage-progress-dots">
          {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
            <span
              key={i}
              className={`stage-dot ${i === stageIndex ? 'stage-dot-active' : i < stageIndex ? 'stage-dot-done' : ''}`}
            />
          ))}
        </div>
      </div>

      <button
        className={`stage-arrow ${nextSuggested ? 'stage-arrow-blinking' : ''}`}
        onClick={onNext}
        disabled={isLast}
        title={isPlaying ? 'Switch to harder stage' : 'Next stage'}
        aria-label="Next stage"
      >
        {nextSuggested
          ? <span className="stage-arrow-suggest"><br/><span className="stage-arrow-hint">harder?</span>▶</span>
          : '▶'}
      </button>
    </div>
  );
}
