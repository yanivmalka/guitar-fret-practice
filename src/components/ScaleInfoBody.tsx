// The body of a scale's "?" bubble: the plain-language blurb, then the scale's
// own numbers spelled out as real notes (degree over note name), so the
// learner sees exactly which notes the numbers stand for in THIS scale.

import { useState } from 'react';
import { SCALE_BLURBS } from '../utils/scaleBlurbs';
import { scaleTypeById } from '../utils/scales';
import { noteNameAtSemitones } from '../utils/intervals';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { CHROMATIC } from '../utils/instruments';
import { loadSetting, saveSetting } from '../utils/settings';
import { playClickSound, haptic } from '../utils/feedback';
import { useTranslation } from '../i18n/useTranslation';

/** The starting note the learner last looked at; kept across bubbles and sessions. */
const ROOT_KEY = 'ssel_info_root';

/** A degree label that is not a plain number (`b3`, `#4`) differs from the
 *  major scale's degree of that number. */
const isAltered = (label: string) => label.startsWith('b') || label.startsWith('#');

interface Props {
  scaleTypeId: string;
  accidental: AccidentalMode;
  notation: NotationMode;
}

export default function ScaleInfoBody({ scaleTypeId, accidental, notation }: Props) {
  const { t } = useTranslation();
  const [root, setRootState] = useState<string>(() => {
    const raw = loadSetting<string>(ROOT_KEY, 'C');
    return CHROMATIC.includes(raw) ? raw : 'C';
  });
  const type = scaleTypeById(scaleTypeId);
  const blurb = SCALE_BLURBS[scaleTypeId];
  if (!type || !blurb) return null;

  const cells = [
    { label: '1', semitones: 0 },
    ...type.degreeLabels.map((label, i) => ({ label, semitones: type.degrees[i] })),
  ].map((c) => ({
    ...c,
    note: displayNote(noteNameAtSemitones(root, c.semitones), accidental, notation),
  }));
  const hasAltered = type.degreeLabels.some(isAltered);

  return (
    <>
      <span className="mode-card-info-summary">{t(blurb)}</span>
      <span className="scale-info-caption">
        {t("Each number is a note's place in the scale, counted from the starting note (1).")}
      </span>
      <span className="scale-info-caption">{t('Pick a starting note to see the scale on it:')}</span>
      <span className="scale-info-roots" dir="ltr">
        {CHROMATIC.map((r) => (
          <button
            key={r}
            type="button"
            className={`scale-info-root${r === root ? ' scale-info-root-active' : ''}`}
            aria-pressed={r === root}
            onClick={() => { playClickSound(); haptic.tap(); setRootState(r); saveSetting(ROOT_KEY, r); }}
          >
            {displayNote(r, accidental, notation)}
          </button>
        ))}
      </span>
      <span className="scale-info-grid" dir="ltr">
        {cells.map((c) => (
          <span key={c.label + c.semitones} className={`scale-info-cell${isAltered(c.label) ? ' scale-info-cell-altered' : ''}`}>
            <span className="scale-info-degree">{c.label}</span>
            <span className="scale-info-note">{c.note}</span>
          </span>
        ))}
      </span>
      {hasAltered && (
        <span className="scale-info-caption">
          {t('Highlighted numbers differ from the major scale: b means one fret lower, # means one fret higher.')}
        </span>
      )}
    </>
  );
}
