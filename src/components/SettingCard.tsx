import type { ReactNode } from 'react';
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

export function SettingCard({
  label, help, children,
}: {
  label: string;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="set-card">
      <span className="set-card-k">{label}</span>
      {children}
      {help && <p className="set-card-help">{help}</p>}
    </div>
  );
}
