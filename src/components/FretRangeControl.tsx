import { useRef, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import { playClickSound, haptic } from '../utils/feedback';
import { useTranslation } from '../i18n/useTranslation';
import { MIN_FRET_WINDOW } from '../hooks/useSelector';
import { fretXFor, NECK_RIGHT, FB_LEFT_MARGIN } from '../utils/neckGeometry';

interface Props {
  maxFret: number;
  lo: number;
  hi: number;
  /** Called with a clamped, min-width-safe pair whenever a handle moves. */
  onChange: (lo: number, hi: number) => void;
  disabled?: boolean;
}

// A two-handle "from fret N to fret M" window, drawn on the SAME horizontal
// geometry as the neck above it (nut on the right, 17.817 fret spacing) so a
// handle always sits directly under its fret on the guitar picture. Built as a
// small SVG strip with pointer-drag + arrow-key handles rather than native
// range inputs, because those are linear and can't line up with the neck.
const TRACK_Y = 14;
const STRIP_H = 28;

export default function FretRangeControl({ maxFret, lo, hi, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<'lo' | 'hi' | null>(null);

  const fretX = fretXFor(maxFret);
  const fbLeft = FB_LEFT_MARGIN - 3;
  const clamp = (f: number) => Math.max(0, Math.min(f, maxFret));

  const commit = (nextLo: number, nextHi: number) => {
    let l = Math.round(nextLo);
    let h = Math.round(nextHi);
    if (h - l < MIN_FRET_WINDOW) {
      // Push the handle that didn't move; if lo moved, hold hi and vice-versa.
      if (l !== lo) l = h - MIN_FRET_WINDOW;
      else h = l + MIN_FRET_WINDOW;
    }
    l = Math.max(0, Math.min(l, maxFret - MIN_FRET_WINDOW));
    h = Math.max(l + MIN_FRET_WINDOW, Math.min(h, maxFret));
    if (l === lo && h === hi) return;
    playClickSound();
    haptic.tap();
    onChange(l, h);
  };

  // Map a screen x to the nearest fret number, in the SVG's own coordinates so
  // it stays correct whatever the rendered width or text direction.
  const fretAtClientX = (clientX: number): number => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return lo;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const x = pt.matrixTransform(ctm.inverse()).x;
    let best = 0;
    let bestD = Infinity;
    for (let f = 0; f <= maxFret; f++) {
      const d = Math.abs(fretX(f) - x);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  };

  const onHandleDown = (which: 'lo' | 'hi') => (e: RPointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = which;
  };
  const onMove = (e: RPointerEvent) => {
    if (!dragRef.current) return;
    const f = fretAtClientX(e.clientX);
    if (dragRef.current === 'lo') commit(f, hi);
    else commit(lo, f);
  };
  const endDrag = (e: RPointerEvent) => {
    if (!dragRef.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };

  const onHandleKey = (which: 'lo' | 'hi') => (e: RKeyboardEvent) => {
    if (disabled) return;
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1
      : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    if (which === 'lo') commit(lo + step, hi);
    else commit(lo, hi + step);
  };

  const xLo = fretX(clamp(lo)); // low fret → near the nut (right)
  const xHi = fretX(clamp(hi)); // high fret → near the left edge

  return (
    <div className={`fret-range-control${disabled ? ' fret-range-control-disabled' : ''}`}>
      <div className="fret-range-readout">
        <span className="fret-range-readout-k">{t('frets')}</span>
        <strong className="fret-range-readout-v">{lo}&ndash;{hi}</strong>
      </div>
      <svg
        ref={svgRef}
        className="fret-range-svg"
        viewBox={`${fbLeft - 5} 0 ${NECK_RIGHT - fbLeft + 12} ${STRIP_H}`}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <line x1={fbLeft} y1={TRACK_Y} x2={NECK_RIGHT} y2={TRACK_Y} stroke="#333" strokeWidth="4" strokeLinecap="round" />
        <line x1={xHi} y1={TRACK_Y} x2={xLo} y2={TRACK_Y} stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
        <circle
          className="fret-range-handle"
          cx={xLo} cy={TRACK_Y} r="9"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={t('Lowest fret')}
          aria-valuemin={0}
          aria-valuemax={maxFret}
          aria-valuenow={lo}
          onPointerDown={onHandleDown('lo')}
          onKeyDown={onHandleKey('lo')}
        />
        <circle
          className="fret-range-handle"
          cx={xHi} cy={TRACK_Y} r="9"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={t('Highest fret')}
          aria-valuemin={0}
          aria-valuemax={maxFret}
          aria-valuenow={hi}
          onPointerDown={onHandleDown('hi')}
          onKeyDown={onHandleKey('hi')}
        />
      </svg>
    </div>
  );
}
