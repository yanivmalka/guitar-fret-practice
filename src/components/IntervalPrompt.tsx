// ── IntervalPrompt — the on-screen question for an interval drill (P4) ───
//
// Rendered in the question area in place of the plain note-name / fret-number
// display whenever `useGameEngine` has an interval question on screen.
//
//   on-neck  → "Major 6th above" (the reference dot is on the fret board)
//   by-name  → "Perfect 5th above G" (answer on the NoteCircle)
//
// All copy through `t()`; the phrase order is handled by the layout direction.

import type { AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { intervalBySemitones } from '../utils/intervals';
import type { IntervalPromptState } from '../hooks/useGameEngine';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  prompt: IntervalPromptState;
  accidental: AccidentalMode;
  notation: NotationMode;
}

export default function IntervalPrompt({ prompt, accidental, notation }: Props) {
  const { t, lang } = useTranslation();
  const def = intervalBySemitones(prompt.semitones);
  const name = def ? t(def.nameKey) : `+${prompt.semitones}`;
  const root = displayNote(prompt.rootNote, accidental, notation);

  return (
    <div className="interval-prompt" dir={lang === 'he' ? 'rtl' : undefined}>
      <span className="interval-prompt-name">{name}</span>
      <span className="interval-prompt-rel">
        {t('above')}
        {prompt.form === 'byName' && <strong className="interval-prompt-root"> {root}</strong>}
      </span>
    </div>
  );
}
