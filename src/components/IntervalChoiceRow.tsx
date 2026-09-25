// ── IntervalChoiceRow — the chip-row answer surface for interval drills ──
//
// Both MVP interval exercises answer by picking from a small row of chips
// (intervals-learning-spec §8): the *interval* variant lists interval sizes
// (m2 … M7) for "which interval did you hear?", the *note* variant lists note
// names for "M3 above G". The NoteCircle / FretGrid are never used for
// intervals. Chips reuse the app's `.note-btn` tap behaviour; the row layout
// and the correct/wrong tinting live in `styles/22-teacher.css`
// (`.interval-choice-row` / `.interval-choice-btn`).
//
// Reused as-is (not duplicated) for Scales Exercises B/C
// (scales-learning-spec.md §8.2/§8.3, ScalePracticeScreen.tsx): the *scale*
// variant lists scale names for "which scale did you hear?", and *note* is
// reused unchanged for "name the degree" — the component takes no
// domain-specific data, only opaque value/label pairs.
//
// All labels are provided by the caller already formatted / translated; this
// component adds no copy of its own.

import { playClickSound, haptic } from '../utils/feedback';

export interface IntervalChoice {
  /** Opaque value handed back to `onSelect` (a semitone string, or a
   *  sharp-spelled note name). */
  value: string;
  /** What the chip shows. */
  label: string;
}

interface Props {
  variant: 'interval' | 'note' | 'scale';
  options: IntervalChoice[];
  onSelect: (value: string) => void;
  /** After the answer: the value to flag correct / the value the learner got
   *  wrong. Both null while the question is live. */
  correct?: string | null;
  wrong?: string | null;
  /** A pick made but not yet judged (an answer given in two parts, like a
   *  chord's root and quality). Neutral, never green or red. */
  selected?: string | null;
  disabled?: boolean;
  dir?: 'rtl';
}

export default function IntervalChoiceRow({
  variant, options, onSelect, correct, wrong, selected, disabled, dir,
}: Props) {
  return (
    <div
      className={`interval-choice-row interval-choice-${variant}`}
      role="group"
      dir={dir}
    >
      {options.map((o) => {
        const state =
          correct === o.value ? ' is-correct'
          : wrong === o.value ? ' is-wrong'
          : selected === o.value ? ' is-selected'
          : '';
        return (
          <button
            key={o.value}
            type="button"
            className={`note-btn interval-choice-btn${state}`}
            disabled={disabled}
            onClick={() => { playClickSound(); haptic.tap(); onSelect(o.value); }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
