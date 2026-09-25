// ── StaffProgressBoard — the Staff reading "Progress" tab ─────────────────
//
// staff-reading-spec.md §12. Read-only. Every note of the chosen range,
// written on the staff in rising order and coloured by the same three-state
// language as the Scales / Intervals boards (not started / learning /
// mastered), so the learner sees *which part of the staff* they already
// read — the thing a list of names could not show. The notes are broken
// into short staves so the board fits a phone.

import type { StaffBoardItem, StaffStatus } from '../learning/staffMastery';
import {
  keySignaturePositions, passageSigns, pitchClassName, spellPitch, staffPosition,
  type KeyId, type StaffSpec,
} from '../utils/staff';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import StaffNotation from './StaffNotation';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  items: readonly StaffBoardItem[];
  spec: StaffSpec;
  keyId: KeyId;
  /** How black keys are spelled (the key's direction, or the app setting in C). */
  spelling: AccidentalMode;
  notation: NotationMode;
}

const PER_STAFF = 6;

// English literal = i18n key (app convention) — same keys the other boards use.
const STATUS_LABEL: Record<StaffStatus, string> = {
  notStarted: 'not started',
  learning: 'learning',
  mastered: 'mastered',
};

export default function StaffProgressBoard({ items, spec, keyId, spelling, notation }: Props) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const placed = items.map((it) => {
    const written = it.midi + spec.writtenShift;
    const p = spellPitch(written, spelling);
    const position = staffPosition(written, spec.clef, spelling);
    return {
      it,
      position,
      sign: passageSigns([{ position, accidental: p.accidental, letter: p.letter }], keyId)[0],
    };
  });
  const span = {
    min: Math.min(...placed.map((p) => p.position)),
    max: Math.max(...placed.map((p) => p.position)),
  };
  const keySignature = keySignaturePositions(keyId, spec.clef);
  const count = (s: StaffStatus) => items.filter((i) => i.status === s).length;

  const staves: (typeof placed)[] = [];
  for (let i = 0; i < placed.length; i += PER_STAFF) staves.push(placed.slice(i, i + PER_STAFF));

  return (
    <div className="staff-board">
      <p className="set-card-help">
        {t('Notes mastered')}: {count('mastered')}/{items.length}
      </p>
      <div className="staff-board-legend">
        {(['mastered', 'learning', 'notStarted'] as const).map((s) => (
          <span key={s} className={`staff-board-key staff-board-key-${s}`}>
            {t(STATUS_LABEL[s])} · {count(s)}
          </span>
        ))}
      </div>
      {staves.map((row, i) => (
        <StaffNotation
          key={i}
          clef={spec.clef}
          octaveMark={spec.octaveMark}
          keySignature={keySignature}
          span={span}
          notes={row.map((p) => ({
            position: p.position,
            sign: p.sign,
            state: p.it.status,
            label: displayNote(pitchClassName(p.it.midi), spelling, notation),
          }))}
          label={t('Your progress on the staff')}
        />
      ))}
    </div>
  );
}
