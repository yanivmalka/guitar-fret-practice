import type { InstrumentConfig } from '../utils/instruments';
import { useTranslation } from '../i18n/useTranslation';
import {
  fretXFor, NECK_RIGHT, FB_LEFT_MARGIN, FB_TOP, FB_HEIGHT, FB_BOTTOM,
} from '../utils/neckGeometry';

interface Props {
  instrument: InstrumentConfig;
  lo: number;
  hi: number;
  /** When off, the whole neck is faded — the window isn't driving the round. */
  disabled?: boolean;
}

// A read-only neck picture for Settings → Playing. It mirrors the half-picker
// neck in SelectorPanel, but instead of two tap-to-toggle halves it just shades
// the frets outside [lo, hi] so the dark silhouette moves with the slider
// handles below it.
export default function FretRangeNeck({ instrument, lo, hi, disabled }: Props) {
  const { t } = useTranslation();
  const maxFret = instrument.maxFret;
  const stringCount = instrument.stringCount;
  const dotFrets = instrument.dotFrets;

  const fretX = fretXFor(maxFret);
  const fbLeft = FB_LEFT_MARGIN - 3;

  const clampFret = (f: number) => Math.max(0, Math.min(f, maxFret));
  const stringY = (i: number) =>
    FB_TOP + 5 + i * (FB_HEIGHT - 10) / (stringCount - 1);

  const winLeft = fretX(clampFret(hi));   // high fret sits near the left edge
  const winRight = fretX(clampFret(lo));  // low fret sits near the nut (right)

  return (
    <div className={`fret-neck${disabled ? ' fret-neck-disabled' : ''}`}>
      <svg
        viewBox={`${fbLeft - 5} ${FB_TOP - 3} ${NECK_RIGHT - fbLeft + 12} ${FB_HEIGHT + 16}`}
        aria-label={`${t(instrument.label)} ${t('neck fret range selector')}`}
      >
        <rect x={fbLeft} y={FB_TOP} width={NECK_RIGHT - fbLeft} height={FB_HEIGHT} rx="2" fill="#3d2b1f" />

        {/* Strings — lowest (thickest) at top, highest (thinnest) at bottom */}
        {Array.from({ length: stringCount }, (_, i) => (
          <line
            key={`str${i}`}
            x1={fbLeft} y1={stringY(i)} x2={NECK_RIGHT} y2={stringY(i)}
            stroke="#cba" strokeWidth={0.9 - i * 0.1} opacity="0.5"
          />
        ))}

        {/* Fret lines */}
        {Array.from({ length: maxFret }, (_, i) => i + 1).map((f) => (
          <line key={f} x1={fretX(f)} y1={FB_TOP} x2={fretX(f)} y2={FB_BOTTOM} stroke="var(--text-3)" strokeWidth="1" />
        ))}

        {/* Dot markers */}
        {dotFrets.map((f) => {
          const cx = (fretX(f - 1) + fretX(f)) / 2;
          const midY = FB_TOP + FB_HEIGHT / 2;
          if (f === 12) {
            return (
              <g key={f}>
                <circle cx={cx} cy={midY - 7} r="2.5" fill="#ddd" opacity="0.8" />
                <circle cx={cx} cy={midY + 7} r="2.5" fill="#ddd" opacity="0.8" />
              </g>
            );
          }
          return <circle key={f} cx={cx} cy={midY} r="2.5" fill="#ddd" opacity="0.8" />;
        })}

        {/* Nut (right edge) */}
        <line x1={NECK_RIGHT} y1={FB_TOP} x2={NECK_RIGHT} y2={FB_BOTTOM} stroke="#f5f0e8" strokeWidth="3.5" />

        {/* Silhouette — shade everything outside the [lo, hi] window */}
        <rect
          x={fbLeft} y={FB_TOP}
          width={Math.max(0, winLeft - fbLeft)} height={FB_HEIGHT}
          fill="rgba(0,0,0,0.6)" rx="2"
        />
        <rect
          x={winRight} y={FB_TOP}
          width={Math.max(0, NECK_RIGHT - winRight)} height={FB_HEIGHT}
          fill="rgba(0,0,0,0.6)" rx="2"
        />

        {/* Window edge markers */}
        <line x1={winLeft} y1={FB_TOP} x2={winLeft} y2={FB_BOTTOM} stroke="var(--accent)" strokeWidth="1.5" />
        <line x1={winRight} y1={FB_TOP} x2={winRight} y2={FB_BOTTOM} stroke="var(--accent)" strokeWidth="1.5" />

        {/* Fret-number readout under each edge */}
        <text x={winLeft} y={FB_BOTTOM + 11} textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="bold">{clampFret(hi)}</text>
        <text x={winRight} y={FB_BOTTOM + 11} textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="bold">{clampFret(lo)}</text>
      </svg>
    </div>
  );
}
