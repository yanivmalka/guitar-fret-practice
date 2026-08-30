import type { SelectorState, Difficulty } from '../hooks/useSelector';
import type { OrderMode, NotationMode } from '../utils/music';
import { playClickSound, playToggleOnSound, playToggleOffSound } from '../utils/feedback';

interface SelectorPanelProps {
  selector: SelectorState;
  onStringSelect: (stringNum: number) => void;
  onMultiToggle: () => void;
  onModeSelect: (mode: 'byNote' | 'byFret') => void;
  onFretRangeToggle: (half: 'lower' | 'upper') => void;
  onDifficultySelect: (diff: Difficulty) => void;
  onAutoAdvanceToggle?: () => void;
  isPlaying: boolean;
  activeString?: number;
  activeFret?: number | null;
  byString?: boolean;
  order?: OrderMode;
  onByStringToggle?: () => void;
  onOrderChange?: (o: OrderMode) => void;
  notation?: NotationMode;
  onNotationChange?: (n: NotationMode) => void;
  showStats?: boolean;
  onStatsToggle?: () => void;
  hasHistory?: boolean;
}

const SCALE_FACTOR = 17.817;
function computeFretPositions(): number[] {
  const positions: number[] = [0];
  let remaining = 1.0;
  for (let i = 1; i <= 21; i++) {
    const fretDist = remaining / SCALE_FACTOR;
    remaining -= fretDist;
    positions.push(1.0 - remaining);
  }
  return positions;
}

const FRET_POSITIONS = computeFretPositions();

// Layout: nut at right (fret 0), fret 21 near left edge.
// Scale NECK_WIDTH so fret 21 lands at FB_LEFT_MARGIN, eliminating empty space.
const NECK_RIGHT = 370;
const FB_LEFT_MARGIN = 28;
const NECK_WIDTH = (NECK_RIGHT - FB_LEFT_MARGIN) / FRET_POSITIONS[21];

const FB_TOP = 5;
const FB_HEIGHT = 40;
const FB_BOTTOM = FB_TOP + FB_HEIGHT;

function fretX(fretNum: number): number {
  return NECK_RIGHT - FRET_POSITIONS[fretNum] * NECK_WIDTH;
}

const DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

export default function SelectorPanel({
  selector, onStringSelect, onMultiToggle, onModeSelect,
  onFretRangeToggle, onDifficultySelect, onAutoAdvanceToggle, isPlaying, activeString, activeFret,
  byString, order, onByStringToggle, onOrderChange, notation, onNotationChange,
  showStats, onStatsToggle, hasHistory,
}: SelectorPanelProps) {
  const strings: { label: string; num: number }[] = [
    { label: 'E', num: 6 }, { label: 'A', num: 5 }, { label: 'D', num: 4 },
    { label: 'G', num: 3 }, { label: 'B', num: 2 }, { label: 'E', num: 1 },
  ];

  const splitX = fretX(12);
  const fbLeft = FB_LEFT_MARGIN - 3;

  // During gameplay: show minimized panel with just info + fret neck
  if (isPlaying) {
    const strLabels = selector.selectedStrings.map(n => strings.find(s => s.num === n)?.label ?? '').join(' ');
    const fretLabel = selector.lowerActive && selector.upperActive ? '0-21' : selector.lowerActive ? '0-12' : '12-21';
    const modeLabel = selector.mode === 'byFret' ? 'N→F' : 'F→N';
    const diffLabel = selector.difficulty === 'dots' ? '●' : selector.difficulty === 'naturals' ? '♮' : '♯♭';
    return (
      <div className="selector-panel selector-panel-mini">
        <div className="selector-mini">
          <span className="selector-mini-item">{strLabels}</span>
          <span className="selector-mini-sep">·</span>
          <span className="selector-mini-item">{modeLabel}</span>
          <span className="selector-mini-sep">·</span>
          <span className="selector-mini-item">{fretLabel}</span>
          <span className="selector-mini-sep">·</span>
          <span className="selector-mini-item">{diffLabel}</span>
        </div>
        <div className="fret-neck">
          <svg viewBox={`${fbLeft - 5} ${FB_TOP - 3} ${NECK_RIGHT - fbLeft + 12} ${FB_HEIGHT + 16}`} aria-label="Guitar neck">
            <rect x={fbLeft} y={FB_TOP} width={NECK_RIGHT - fbLeft} height={FB_HEIGHT} rx="2" fill="#3d2b1f" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const y = FB_TOP + 5 + i * (FB_HEIGHT - 10) / 5;
              const thickness = 0.9 - i * 0.1;
              return <line key={`str${i}`} x1={fbLeft} y1={y} x2={NECK_RIGHT} y2={y} stroke="#cba" strokeWidth={thickness} opacity="0.5" />;
            })}
            {activeString != null && (
              <line key={activeString} className="mini-neck-active-string" x1={fbLeft} y1={FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5} x2={NECK_RIGHT} y2={FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5} stroke="#0ff" strokeWidth="1.8" opacity="0.9" />
            )}
            {Array.from({ length: 21 }, (_, i) => i + 1).map((f) => (
              <line key={f} x1={fretX(f)} y1={FB_TOP} x2={fretX(f)} y2={FB_BOTTOM} stroke="#999" strokeWidth="1" />
            ))}
            {DOT_FRETS.map((f) => {
              const cx = (fretX(f - 1) + fretX(f)) / 2;
              const midY = FB_TOP + FB_HEIGHT / 2;
              if (f === 12) return <g key={f}><circle cx={cx} cy={midY - 7} r="2.5" fill="#ddd" opacity="0.8" /><circle cx={cx} cy={midY + 7} r="2.5" fill="#ddd" opacity="0.8" /></g>;
              return <circle key={f} cx={cx} cy={midY} r="2.5" fill="#ddd" opacity="0.8" />;
            })}
            {activeFret != null && activeFret >= 0 && activeFret <= 21 && (
              <circle cx={activeFret === 0 ? NECK_RIGHT + 1 : (fretX(activeFret - 1) + fretX(activeFret)) / 2} cy={activeString ? FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5 : FB_TOP + FB_HEIGHT / 2} r="4" fill="#0ff" opacity="0.85" />
            )}
            <line x1={NECK_RIGHT} y1={FB_TOP} x2={NECK_RIGHT} y2={FB_BOTTOM} stroke="#f5f0e8" strokeWidth="3.5" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="selector-panel">
      {/* ── StringRow ─────────────────────────────────────── */}
      <div className="selector-strings">
        {strings.map(({ label, num }) => (
          <button key={num} className={`string-pill ${selector.selectedStrings.includes(num) ? 'active' : ''}`} onClick={() => onStringSelect(num)}>{label}</button>
        ))}
        <button className={`string-pill ${selector.multiMode ? 'active' : ''}`} onClick={() => { selector.multiMode ? playToggleOffSound() : playToggleOnSound(); onMultiToggle(); }}>Multi</button>
      </div>

      {/* ── ModeToggle with order options between cards ── */}
      <div className="mode-cards">
        <button className={`mode-card ${selector.mode === 'byFret' ? 'active' : ''}`} onClick={() => onModeSelect('byFret')}>
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const bx = 20 + 14 * Math.cos(angle);
              const by = 20 + 14 * Math.sin(angle);
              const enabled = [0, 3, 5, 7, 9].includes(i);
              return <circle key={i} cx={bx} cy={by} r="3" fill="currentColor" opacity={enabled ? 1 : 0.2} />;
            })}
          </svg>
          <span>Note by Fret</span>
        </button>

        {/* Order options — stacked vertically between the two mode cards, visible only for byFret */}
        <div className={`mode-order-col ${selector.mode === 'byFret' ? 'mode-order-show' : 'mode-order-hide'}`}>
          {onOrderChange && <button className={`order-chip${order === 'alphabet' ? ' order-chip-active' : ''}`} onClick={() => onOrderChange('alphabet')}>Alpha</button>}
          {onOrderChange && <button className={`order-chip${order === 'fifths' ? ' order-chip-active' : ''}`} onClick={() => onOrderChange('fifths')}>Fifths</button>}
          {onByStringToggle && <button className={`order-chip chip-toggle${byString ? ' chip-toggle-active' : ''}`} onClick={onByStringToggle}>By String</button>}
        </div>

        <button className={`mode-card ${selector.mode === 'byNote' ? 'active' : ''}`} onClick={() => onModeSelect('byNote')}>
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            {[
              { x: 2, y: 2, op: 1 }, { x: 12, y: 2, op: 0.2 }, { x: 22, y: 2, op: 0.2 }, { x: 32, y: 2, op: 1 },
              { x: 2, y: 15, op: 0.2 }, { x: 12, y: 15, op: 1 }, { x: 22, y: 15, op: 0.2 }, { x: 32, y: 15, op: 1 },
              { x: 2, y: 28, op: 0.2 }, { x: 12, y: 28, op: 1 },
            ].map(({ x, y, op }, i) => (
              <rect key={i} x={x} y={y} width="8" height="10" rx="2" fill="currentColor" opacity={op} />
            ))}
          </svg>
          <span>Fret by Note</span>
        </button>
      </div>

      {/* ── FretRangeNeck SVG ─────────────────────────────── */}
      <div className="fret-neck">
        <svg viewBox={`${fbLeft - 5} ${FB_TOP - 3} ${NECK_RIGHT - fbLeft + 12} ${FB_HEIGHT + 16}`} aria-label="Guitar neck fret range selector">
          {/* Fretboard — only covers where frets actually are */}
          <rect x={fbLeft} y={FB_TOP} width={NECK_RIGHT - fbLeft} height={FB_HEIGHT} rx="2" fill="#3d2b1f" />

          {/* 6 strings — low E (thickest) at top, high E (thinnest) at bottom */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const y = FB_TOP + 5 + i * (FB_HEIGHT - 10) / 5;
            const thickness = 0.9 - i * 0.1;
            return <line key={`str${i}`} x1={fbLeft} y1={y} x2={NECK_RIGHT} y2={y} stroke="#cba" strokeWidth={thickness} opacity="0.5" />;
          })}

          {/* Highlight active string during play */}
          {activeString != null && (
            <line
              x1={fbLeft}
              y1={FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5}
              x2={NECK_RIGHT}
              y2={FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5}
              stroke="#0ff" strokeWidth="1.8" opacity="0.9"
            />
          )}

          {/* Fret lines */}
          {Array.from({ length: 21 }, (_, i) => i + 1).map((f) => (
            <line key={f} x1={fretX(f)} y1={FB_TOP} x2={fretX(f)} y2={FB_BOTTOM} stroke="#999" strokeWidth="1" />
          ))}

          {/* Dot markers */}
          {DOT_FRETS.map((f) => {
            const cx = (fretX(f - 1) + fretX(f)) / 2;
            const midY = FB_TOP + FB_HEIGHT / 2;
            if (f === 12) return <g key={f}><circle cx={cx} cy={midY - 7} r="2.5" fill="#ddd" opacity="0.8" /><circle cx={cx} cy={midY + 7} r="2.5" fill="#ddd" opacity="0.8" /></g>;
            return <circle key={f} cx={cx} cy={midY} r="2.5" fill="#ddd" opacity="0.8" />;
          })}

          {/* Highlight active fret */}
          {activeFret != null && activeFret >= 0 && activeFret <= 21 && (
            <circle
              cx={activeFret === 0 ? NECK_RIGHT + 1 : (fretX(activeFret - 1) + fretX(activeFret)) / 2}
              cy={activeString ? FB_TOP + 5 + (6 - activeString) * (FB_HEIGHT - 10) / 5 : FB_TOP + FB_HEIGHT / 2}
              r="4" fill="#0ff" opacity="0.85"
            />
          )}

          {/* Nut (right edge) */}
          <line x1={NECK_RIGHT} y1={FB_TOP} x2={NECK_RIGHT} y2={FB_BOTTOM} stroke="#f5f0e8" strokeWidth="3.5" />

          {/* Dim inactive halves */}
          {!selector.lowerActive && (
            <rect x={fretX(11)} y={FB_TOP} width={NECK_RIGHT - fretX(11)} height={FB_HEIGHT} fill="rgba(0,0,0,0.6)" rx="2" />
          )}
          {!selector.upperActive && (
            <rect x={fbLeft} y={FB_TOP} width={splitX - fbLeft} height={FB_HEIGHT} fill="rgba(0,0,0,0.6)" rx="2" />
          )}

          {/* Tap targets — no sound if tapping the only active half (no-op) */}
          <rect x={splitX} y={FB_TOP} width={NECK_RIGHT - splitX} height={FB_HEIGHT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => {
            playClickSound(); onFretRangeToggle('lower');
          }} />
          <rect x={fbLeft} y={FB_TOP} width={splitX - fbLeft} height={FB_HEIGHT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => {
            playClickSound(); onFretRangeToggle('upper');
          }} />

          {/* Labels — highlighted when active */}
          <text x={(splitX + NECK_RIGHT) / 2} y={FB_BOTTOM + 11} textAnchor="middle" fontSize="8" fill={selector.lowerActive ? '#0ff' : '#555'} fontWeight={selector.lowerActive ? 'bold' : 'normal'}>0–12</text>
          <text x={(fbLeft + splitX) / 2} y={FB_BOTTOM + 11} textAnchor="middle" fontSize="8" fill={selector.upperActive ? '#0ff' : '#555'} fontWeight={selector.upperActive ? 'bold' : 'normal'}>12–21</text>
        </svg>
      </div>

      {/* ── DifficultyRoad ────────────────────────────────── */}
      <div className="difficulty-road">
        <button className={`diff-btn ${selector.difficulty === 'dots' ? 'active' : ''}`} onClick={() => onDifficultySelect('dots')}><span className="diff-icon">●</span><span className="diff-label">Dots</span></button>
        <span className="diff-arrow">→</span>
        <button className={`diff-btn ${selector.difficulty === 'naturals' ? 'active' : ''}`} onClick={() => onDifficultySelect('naturals')}><span className="diff-icon">♮</span><span className="diff-label">Naturals</span></button>
        <span className="diff-arrow">→</span>
        <button className={`diff-btn ${selector.difficulty === 'full' ? 'active' : ''}`} onClick={() => onDifficultySelect('full')}><span className="diff-icon">♯♭</span><span className="diff-label">Full</span></button>
        {/* Auto Advance: continue straight into the next difficulty when the current one is completed */}
        {onAutoAdvanceToggle && (
          <button
            className={`stats-icon-btn ${selector.autoAdvance ? 'stats-icon-on' : ''}`}
            onClick={onAutoAdvanceToggle}
            title="Auto Advance to next difficulty"
            aria-label="Auto Advance to next difficulty"
            aria-pressed={selector.autoAdvance}
          >
            <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="3,3 10,10 3,17" fill="currentColor"/><polygon points="10,3 17,10 10,17" fill="currentColor"/></svg>
          </button>
        )}
        {/* Stats dashboard icon */}
        {hasHistory && onStatsToggle && (
          <button className={`stats-icon-btn ${showStats ? 'stats-icon-on' : ''}`} onClick={onStatsToggle} title="Statistics">
            <svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="10" width="4" height="8" rx="1" fill="currentColor"/><rect x="8" y="6" width="4" height="12" rx="1" fill="currentColor"/><rect x="14" y="2" width="4" height="16" rx="1" fill="currentColor"/></svg>
          </button>
        )}
      </div>

      {/* ── Note names (A-B-C / solfège) ──────────────────── */}
      {onNotationChange && (
        <div className="notation-row">
          <span className="notation-label">Notes</span>
          <button
            className={`order-chip${notation === 'alpha' ? ' order-chip-active' : ''}`}
            onClick={() => onNotationChange('alpha')}
          >A B C</button>
          <button
            className={`order-chip${notation === 'solfege' ? ' order-chip-active' : ''}`}
            onClick={() => onNotationChange('solfege')}
          >Do Re Mi</button>
        </div>
      )}
    </div>
  );
}
