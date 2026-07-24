import { useEffect, useRef } from 'react';
import type { Stage } from '../utils/stages';
import { TOTAL_STAGES, getStageGroups } from '../utils/stages';

interface Props {
  stage: Stage;
  stageIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  suggestion: 'next' | 'prev' | null;
}

const GROUPS = getStageGroups();

export default function StageNav({ stage, stageIndex, onPrev, onNext, isPlaying, suggestion }: Props) {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

  // Full-page swipe on document
  useEffect(() => {
    let startX: number | null = null;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < 50) return;
      if (dx < 0) onNextRef.current();
      else onPrevRef.current();
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const isFirst = stageIndex === 0;
  const isLast = stageIndex === TOTAL_STAGES - 1;
  const prevSuggested = suggestion === 'prev' && !isFirst;
  const nextSuggested = suggestion === 'next' && !isLast;

  // Find which group the current stage belongs to
  const currentGroupIdx = GROUPS.findIndex(g => g.indices.includes(stageIndex));
  const currentGroup = GROUPS[currentGroupIdx];

  return (
    <div className="stage-nav">
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

        {/* Group separators + current-group dots */}
        <div className="stage-groups-row">
          {GROUPS.map((g, gi) => {
            const isCurrent = gi === currentGroupIdx;
            return (
              <span key={g.label} className={`stage-group-seg ${isCurrent ? 'stage-group-seg-active' : ''}`}>
                {isCurrent
                  ? g.indices.map(idx => (
                      <span
                        key={idx}
                        className={`stage-dot ${idx === stageIndex ? 'stage-dot-active' : idx < stageIndex ? 'stage-dot-done' : ''}`}
                      />
                    ))
                  : <span className="stage-group-dash" />
                }
              </span>
            );
          })}
        </div>

        {currentGroup && (
          <div className="stage-group-label">{currentGroup.label}</div>
        )}
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
