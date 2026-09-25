// The body of a scale's "?" bubble: the plain-language blurb, then the scale's
// own numbers spelled out as real notes (degree over note name), so the
// learner sees exactly which notes the numbers stand for in THIS scale.

import { SCALE_BLURBS } from '../utils/scaleBlurbs';
import { scaleTypeById } from '../utils/scales';
import { noteNameAtSemitones } from '../utils/intervals';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { useTranslation } from '../i18n/useTranslation';

/** The example key the notes are spelled in. */
const EXAMPLE_ROOT = 'C';

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
  const type = scaleTypeById(scaleTypeId);
  const blurb = SCALE_BLURBS[scaleTypeId];
  if (!type || !blurb) return null;

  const cells = [
    { label: '1', semitones: 0 },
    ...type.degreeLabels.map((label, i) => ({ label, semitones: type.degrees[i] })),
  ].map((c) => ({
    ...c,
    note: displayNote(noteNameAtSemitones(EXAMPLE_ROOT, c.semitones), accidental, notation),
  }));
  const hasAltered = type.degreeLabels.some(isAltered);

  return (
    <>
      <span className="mode-card-info-summary">{t(blurb)}</span>
      <span className="scale-info-caption">
        {t("Each number is a note's place in the scale, counted from the starting note (1).")}
      </span>
      <span className="scale-info-caption">
        {t('Example, starting on the note')} <strong>{cells[0].note}</strong>
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
