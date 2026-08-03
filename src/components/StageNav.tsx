import { useEffect, useRef } from 'react';
import type { Stage } from '../utils/stages';
import { STAGES, TOTAL_STAGES, getStageLevels, getStageClasses, getStageParts } from '../utils/stages';
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

const LEVELS  = getStageLevels();
const CLASSES = getStageClasses();
const PARTS   = getStageParts();

function successColor(stageIndices: number[], allHistory: Record<number, HistoryEntry[]>): string {
  let correct = 0, total = 0;
  stageIndices.forEach(idx => {
    (allHistory[STAGES[idx].id] ?? []).forEach(e => { total++; if (e.correct === true) correct++; });
  });
  if (total === 0) return '#333';
  const r = correct / total;
  if (r >= 0.75) return '#0f0';
  if (r >= 0.45) return '#7bf';
  return '#f90';
}

export default function StageNav({ stage, stageIndex, onPrev, onNext, isPlaying, suggestion, allHistory }: Props) {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

  // Swipe: horizontal only — US-11 fix: require |dx| > |dy| * 1.5
  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null; startY = null;
      // Ignore if not clearly horizontal
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.6) return;
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
  const isLast  = stageIndex === TOTAL_STAGES - 1;
  const prevSuggested = suggestion === 'prev' && !isFirst;
  const nextSuggested = suggestion === 'next' && !isLast;

  const currentLevelIdx = LEVELS.findIndex(lv => lv.stageIndices.includes(stageIndex));
  const currentLevel    = LEVELS[currentLevelIdx];
  const currentClassIdx = CLASSES.findIndex(cl => cl.levelIndices.includes(currentLevelIdx));
  const currentPartIdx  = PARTS.findIndex(pt => pt.classIndices.includes(currentLevelIdx));

  // Step X of Y within current level
  const stepInLevel = currentLevel ? currentLevel.stageIndices.indexOf(stageIndex) + 1 : 1;
  const stepsInLevel = currentLevel ? currentLevel.stageIndices.length : 1;

  // Suggestion subtitle text
  const suggestionText = prevSuggested ? '← Try easier' : nextSuggested ? 'Ready for harder →' : null;

  return (
    <div className="stage-nav">
      {/* ← chevron — US-05: rectangular, not circular */}
      <button
        className={`stage-chevron ${prevSuggested ? 'stage-chevron-suggest' : ''}`}
        onClick={onPrev}
        disabled={isFirst}
        title={isPlaying ? 'Switch to easier stage' : 'Previous stage'}
        aria-label="Previous stage"
      >
        ‹
      </button>

      <div className="stage-info">
        {/* Progress bar — 3 part segments */}
        <div className="stage-parts-row">
          {PARTS.map((pt, pi) => (
            <span key={pi} className={`stage-part-seg ${pi === currentPartIdx ? 'stage-part-seg-active' : ''}`} title={pt.label} />
          ))}
        </div>

        {/* 7 class dashes colored by success */}
        <div className="stage-levels-row">
          {CLASSES.map((cl, ci) => {
            const allIndices = cl.levelIndices.flatMap(li => LEVELS[li].stageIndices);
            const color = successColor(allIndices, allHistory);
            return (
              <span
                key={ci}
                className={`stage-level-dash ${ci === currentClassIdx ? 'stage-level-dash-active' : ''}`}
                style={{ background: color }}
                title={cl.label}
              />
            );
          })}
        </div>

        {/* Center text: string · focus · step X/Y */}
        <div className="stage-center-text">
          <span className="stage-center-title">{stage.title}</span>
          <span className="stage-center-step">{stepInLevel} / {stepsInLevel}</span>
        </div>

        {/* Dots for current level */}
        <div className="stage-dots-row">
          {currentLevel?.stageIndices.map(idx => (
            <span key={idx} className={`stage-dot ${idx === stageIndex ? 'stage-dot-active' : idx < stageIndex ? 'stage-dot-done' : ''}`} />
          ))}
        </div>

        {/* Suggestion subtitle — replaces blinking text on arrows */}
        {suggestionText && (
          <div className="stage-suggestion-subtitle">{suggestionText}</div>
        )}
      </div>

      {/* › chevron */}
      <button
        className={`stage-chevron ${nextSuggested ? 'stage-chevron-suggest' : ''}`}
        onClick={onNext}
        disabled={isLast}
        title={isPlaying ? 'Switch to harder stage' : 'Next stage'}
        aria-label="Next stage"
      >
        ›
      </button>
    </div>
  );
}
