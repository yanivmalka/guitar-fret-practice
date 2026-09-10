import type { CSSProperties, ReactNode } from 'react';
import { playClickSound, haptic } from '../utils/feedback';

/**
 * The two presentational primitives the hamburger settings sub-pages are built
 * from, styled to match the Stats & progress screen (`sp2`): a card surface
 * that carries a micro-label, its control, and a helper line, plus the cyan
 * segmented pill that replaces the old loose `.order-chip` rows.
 */

interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function SegmentedControl<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: ReadonlyArray<SegOption<T>>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="set-seg" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`set-seg-btn${o.value === value ? ' set-seg-on' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value === value) return;
            playClickSound();
            haptic.tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Same API as `SegmentedControl`, but rendered as the discrete button row the
 * "Playing" card pickers (Instruments, Notes) use — a row of equal-width tiles
 * instead of one joined pill. Used for the multi-value Settings controls
 * (Language, answer mode, voice engine); the plain on/off toggles stay on
 * `SegmentedControl`.
 */
export function PickRow<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: ReadonlyArray<SegOption<T>>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="pick-row" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`pick-btn${o.value === value ? ' pick-btn-on' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value === value) return;
            playClickSound();
            haptic.tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A continuous control for a numeric setting: a draggable track flanked by a
 * `−` and a `+` button (each snaps by one `step`), with the current value
 * shown at the end. Buttons carry the same click sound + haptic as the other
 * settings controls; dragging the track does not (it would fire constantly).
 */
export function StepperMeter({
  value, min, max, step, onChange, ariaLabel, formatValue,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
  formatValue?: (v: number) => string;
}) {
  const snap = (v: number) => {
    const stepped = Math.round((v - min) / step) * step + min;
    return Math.min(max, Math.max(min, Math.round(stepped * 1000) / 1000));
  };
  const nudge = (dir: 1 | -1) => {
    const next = snap(value + dir * step);
    if (next === value) return;
    playClickSound();
    haptic.tap();
    onChange(next);
  };
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="stepper-meter" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${ariaLabel ?? ''} −`.trim()}
        onClick={() => nudge(-1)}
        disabled={value <= min}
      >−</button>
      <input
        type="range"
        className="stepper-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(snap(Number(e.target.value)))}
        style={{ '--meter-pct': `${pct}%` } as CSSProperties}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${ariaLabel ?? ''} +`.trim()}
        onClick={() => nudge(1)}
        disabled={value >= max}
      >+</button>
      {formatValue && <span className="stepper-val">{formatValue(value)}</span>}
    </div>
  );
}

export function SettingCard({
  label, help, children, pin,
}: {
  label: string;
  help?: ReactNode;
  children: ReactNode;
  /** Optional affordance pinned to the physical top-right corner of the card
   *  (the Quick Access pushpin on the seven pinnable settings). */
  pin?: ReactNode;
}) {
  return (
    <div className="set-card">
      {pin && <div className="set-card-pin">{pin}</div>}
      <span className="set-card-k">{label}</span>
      {children}
      {help && <p className="set-card-help">{help}</p>}
    </div>
  );
}
