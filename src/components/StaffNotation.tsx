// ── StaffNotation — one note written on a five-line staff ────────────────
//
// staff-reading-spec.md §9. A small self-contained SVG: the five lines, the
// clef (drawn as paths, so it never depends on a music font being installed
// — Android WebViews often lack the U+1D11E glyph), the note head with its
// stem, any ledger lines, and a ♯/♭ sign. Positions come from
// `utils/staff.ts` (0 = the bottom line, one step per line or space).
//
// Staff notation always reads left to right: the SVG is pinned to LTR
// and is NOT mirrored by the left-handed setting — that setting mirrors the
// instrument, and a staff is not part of the instrument.

import { ledgerLines, type Clef } from '../utils/staff';

interface Props {
  clef: Clef;
  /** Draw the small "8" under the treble clef (guitar / banjo). */
  octaveMark: boolean;
  /** Staff position of the note, 0 = bottom line. */
  position: number;
  accidental: '' | '#' | 'b';
  /** Colours the note after the answer. */
  state?: 'live' | 'correct' | 'wrong';
  /** Accessible description, e.g. "A note on the staff". */
  label: string;
}

const LINE_GAP = 10;
/** y of the bottom staff line. Leaves room for ±4 ledger lines. */
const BOTTOM_Y = 95;
const TOP_Y = BOTTOM_Y - 4 * LINE_GAP;
const NOTE_X = 140;

const yOf = (position: number) => BOTTOM_Y - position * (LINE_GAP / 2);

function TrebleClef({ octaveMark }: { octaveMark: boolean }) {
  return (
    <g transform={`translate(10 ${TOP_Y})`} className="staff-clef">
      <path
        d="M 16 31 C 11 31 10 25 15 23 C 21 21 26 26 25 32 C 24 39 16 42 10 39 C 3 35 2 25 9 18 C 14 13 21 8 22 -1 C 23 -8 20 -15 17 -12 C 13 -8 12 0 13 10 L 18 56 C 19 64 11 66 8 61"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="59.5" r="3.4" fill="currentColor" />
      {octaveMark && (
        <text x="17" y="79" fontSize="11" fontWeight="700" textAnchor="middle" fill="currentColor">8</text>
      )}
    </g>
  );
}

function BassClef() {
  return (
    <g transform={`translate(10 ${TOP_Y})`} className="staff-clef">
      <circle cx="6" cy="10" r="3.8" fill="currentColor" />
      <path
        d="M 3 10 C 3 2 11 -1 17 1 C 25 4 26 14 22 22 C 18 30 10 36 2 41"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="31" cy="5" r="2.1" fill="currentColor" />
      <circle cx="31" cy="15" r="2.1" fill="currentColor" />
    </g>
  );
}

export default function StaffNotation({ clef, octaveMark, position, accidental, state = 'live', label }: Props) {
  const y = yOf(position);
  const stemUp = position < 4;
  return (
    <svg
      className={`staff-svg staff-note-${state}`}
      viewBox="0 0 220 150"
      role="img"
      aria-label={label}
      // `direction` flips SVG text-anchor, so pin it against a Hebrew page.
      style={{ direction: 'ltr' }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="4" x2="216"
          y1={BOTTOM_Y - i * LINE_GAP} y2={BOTTOM_Y - i * LINE_GAP}
          className="staff-line"
        />
      ))}
      {clef === 'treble' ? <TrebleClef octaveMark={octaveMark} /> : <BassClef />}
      <g className="staff-note">
        {ledgerLines(position).map((p) => (
          <line key={p} x1={NOTE_X - 12} x2={NOTE_X + 12} y1={yOf(p)} y2={yOf(p)} className="staff-ledger" />
        ))}
        {accidental && (
          <text x={NOTE_X - 11} y={y + 6} fontSize="18" textAnchor="end" fill="currentColor">
            {accidental === '#' ? '♯' : '♭'}
          </text>
        )}
        <ellipse
          cx={NOTE_X} cy={y} rx="6.6" ry="4.6"
          transform={`rotate(-20 ${NOTE_X} ${y})`}
          fill="currentColor"
        />
        <line
          x1={stemUp ? NOTE_X + 6 : NOTE_X - 6}
          x2={stemUp ? NOTE_X + 6 : NOTE_X - 6}
          y1={stemUp ? y - 1.5 : y + 1.5}
          y2={stemUp ? y - 35 : y + 35}
          className="staff-stem"
        />
      </g>
    </svg>
  );
}
