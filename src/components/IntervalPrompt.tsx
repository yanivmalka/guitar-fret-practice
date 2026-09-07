// ── IntervalPrompt — the on-screen question for an interval drill ───────
//
// Rendered in the question area in place of the plain note-name / fret-number
// display whenever `useGameEngine` has an interval question on screen.
//
//   identifyInterval → "Which interval did you hear?" + a "🔊 hear it again"
//                      control (the two notes are not named until feedback)
//   findTargetNote   → "Major 3rd above G" / "Major 3rd below G", with the same
//                      "🔊 hear it again" control (replays the first note)
//
// All copy through `t()`; the phrase order is handled by the layout direction.

import type { AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { intervalBySemitones } from '../utils/intervals';
import type { IntervalPromptState } from '../hooks/useGameEngine';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  prompt: IntervalPromptState;
  accidental: AccidentalMode;
  notation: NotationMode;
  /** Replay the question's stimulus (the two-note sequence for
   *  *identify the interval*). No scoring effect. */
  onReplay?: () => void;
}

export default function IntervalPrompt({ prompt, accidental, notation, onReplay }: Props) {
  const { t, lang } = useTranslation();
  const def = intervalBySemitones(prompt.semitones);
  const name = def ? t(def.nameKey) : `+${prompt.semitones}`;
  const rtl = lang === 'he';

  // Every control fires the shared click sound + haptic tap, per the app-wide
  // `click()` convention (App.tsx).
  const replay = onReplay
    ? () => { playClickSound(); haptic.tap(); onReplay(); }
    : undefined;

  if (prompt.exercise === 'identifyInterval') {
    return (
      <div className="interval-prompt interval-prompt-identify" dir={rtl ? 'rtl' : undefined}>
        <span className="interval-prompt-question">{t('Which interval did you hear?')}</span>
        {replay && (
          <button
            type="button"
            className="interval-replay-btn"
            onClick={replay}
          >
            🔊 {t('Hear it again')}
          </button>
        )}
      </div>
    );
  }

  const root = displayNote(prompt.rootNote, accidental, notation);
  return (
    <div className="interval-prompt" dir={rtl ? 'rtl' : undefined}>
      <span className="interval-prompt-name">{name}</span>
      <span className="interval-prompt-rel">
        {prompt.dir === 'down' ? t('below') : t('above')}
        <strong className="interval-prompt-root"> {root}</strong>
      </span>
      {replay && (
        <button type="button" className="interval-replay-btn" onClick={replay}>
          🔊 {t('Hear it again')}
        </button>
      )}
    </div>
  );
}
