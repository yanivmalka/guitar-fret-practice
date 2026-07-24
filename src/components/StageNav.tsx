import { useEffect, useRef } from 'react';
import type { Stage } from '../utils/stages';
import { STAGES, TOTAL_STAGES, getStageLevels } from '../utils/stages';
import type { HistoryEntry } from '../utils/music';

interface Props {
  stage: Stage;
  stageIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  suggestion: 'next' | 'prev' | null;
  allHistory: Record<number, HistoryEntry[]>;
}

const LEVELS = getStageLevels();

function levelColor(stageIndices: number[], allHistory: Record<number, HistoryEntry[]>): string {
  let correct = 0, total = 0;
  stageIndices.forEach(idx => {
    const h = allHistory[STAGES[idx].id] ?? [];
    h.forEach(e => { total++; if (e.correct === true) correct++; });
  });
  if (total === 0) return '#333';
  const rate = correct / total;
  if (rate >= 0.75) return '#0f0';
  if (rate >= 0.45) return '#7bf';
  return '#f90';
}

export default function StageNav({ stage, stageIndex, onPrev, onNext, isPlaying, suggestion, allHistory }: Props) {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

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

  const currentLevelIdx = LEVELS.findIndex(lv => lv.stageIndices.includes(stageIndex));
  const currentLevel = LEVELS[currentLevelIdx];

  return (
    <div className="stage-nav">
      <button
        className={`stage-arrow ${prevSuggested ? 'stage-arrow-blinking' : ''}`}
        onClick={onPrev} disabled={isFirst}
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

        {/* 19 level dashes — all visible, current glows */}
        <div className="stage-levels-row">
          {LEVELS.map((lv, li) => {
            const isCurrent = li === currentLevelIdx;
            const color = levelColor(lv.stageIndices, allHistory);
            return (
              <span
                key={li}
                className={`stage-level-dash ${isCurrent ? 'stage-level-dash-active' : ''}`}
                style={{ background: color }}
                title={lv.label}
              />
            );
          })}
        </div>

        {/* Dots for current level's stages only */}
        <div className="stage-dots-row">
          {currentLevel?.stageIndices.map(idx => (
            <span
              key={idx}
              className={`stage-dot ${idx === stageIndex ? 'stage-dot-active' : idx < stageIndex ? 'stage-dot-done' : ''}`}
            />
          ))}
        </div>

        <div className="stage-group-label">{currentLevel?.label ?? ''}</div>
      </div>

      <button
        className={`stage-arrow ${nextSuggested ? 'stage-arrow-blinking' : ''}`}
        onClick={onNext} disabled={isLast}
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
