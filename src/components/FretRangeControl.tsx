import { playClickSound, haptic } from '../utils/feedback';
import { useTranslation } from '../i18n/useTranslation';
import { MIN_FRET_WINDOW } from '../hooks/useSelector';

interface Props {
  maxFret: number;
  lo: number;
  hi: number;
  /** Called with a clamped, min-width-safe pair whenever a handle moves. */
  onChange: (lo: number, hi: number) => void;
  disabled?: boolean;
}

// A two-handle fret window: "from fret N to fret M". Built from two overlaid
// native range inputs sharing one track, so keyboard support and RTL come for
// free. The handles can't cross closer than MIN_FRET_WINDOW.
export default function FretRangeControl({ maxFret, lo, hi, onChange, disabled }: Props) {
  const { t } = useTranslation();

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

  const pct = (f: number) => `${(f / maxFret) * 100}%`;

  return (
    <div className={`fret-range-control${disabled ? ' fret-range-control-disabled' : ''}`}>
      <div className="fret-range-readout">
        <span className="fret-range-readout-k">{t('frets')}</span>
        <strong className="fret-range-readout-v">{lo}&ndash;{hi}</strong>
      </div>
      <div className="fret-range-slot">
        <div className="fret-range-rail" aria-hidden="true" />
        <div
          className="fret-range-sel"
          aria-hidden="true"
          style={{ insetInlineStart: pct(lo), insetInlineEnd: `${100 - (hi / maxFret) * 100}%` }}
        />
        <input
          type="range"
          className="fret-range-input fret-range-input-lo"
          min={0}
          max={maxFret}
          step={1}
          value={lo}
          disabled={disabled}
          aria-label={t('Lowest fret')}
          onChange={(e) => commit(Number(e.target.value), hi)}
        />
        <input
          type="range"
          className="fret-range-input fret-range-input-hi"
          min={0}
          max={maxFret}
          step={1}
          value={hi}
          disabled={disabled}
          aria-label={t('Highest fret')}
          onChange={(e) => commit(lo, Number(e.target.value))}
        />
      </div>
    </div>
  );
}
