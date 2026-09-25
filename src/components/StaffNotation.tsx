// ── StaffNotation — notes written on a five-line staff ───────────────────
//
// staff-reading-spec.md §9. A small self-contained SVG: the five lines, the
// clef (drawn as paths, so it never depends on a music font being installed
// — Android WebViews often lack the U+1D11E glyph), an optional key
// signature, and one note or a short phrase of them, each with its stem,
// ledger lines and ♯/♭/♮. Positions come from `utils/staff.ts` (0 = the
// bottom line, one step per line or space).
//
// The height follows `span` — the lowest / highest position the whole
// session can ask — so the box never jumps between questions, while the open
// position stays compact and the high range gets room for its ledger lines.
//
// With `onPickPosition` the staff is also an input: a tap reports the
// nearest line or space ("Where is it written?").
//
// Staff notation always reads left to right: the SVG is pinned to LTR
// and is NOT mirrored by the left-handed setting — that setting mirrors the
// instrument, and a staff is not part of the instrument.

import type { PointerEvent } from 'react';
import { ledgerLines, type Clef, type StaffSign } from '../utils/staff';

export type StaffNoteState =
  | 'live' | 'current' | 'correct' | 'wrong' | 'ghost'
  // the progress board's three statuses
  | 'mastered' | 'learning' | 'notStarted';

export interface StaffNote {
  /** Staff position, 0 = bottom line. */
  position: number;
  /** The sign written in front of the head ('' = none). */
  sign: StaffSign;
  state?: StaffNoteState;
  /** Text under the note (its name, once answered). */
  label?: string;
}

interface Props {
  clef: Clef;
  /** Draw the small "8" under the treble clef (guitar / banjo). */
  octaveMark: boolean;
  keySignature?: readonly { position: number; sign: '#' | 'b' }[];
  notes: readonly StaffNote[];
  /** Lowest / highest note position the staff must make room for. */
  span: { min: number; max: number };
  /** Close the passage with a final bar line (a phrase). */
  endBar?: boolean;
  /** Lay the staff out for this many notes even while fewer are drawn, so
   *  the box keeps its size as notes appear. */
  slots?: number;
  /** Accessible description, e.g. "A note on the staff". */
  label: string;
  /** Makes the staff tappable: reports the nearest position. */
  onPickPosition?: (position: number) => void;
}

const STEP = 5; // one line-or-space
const PAD = 4;
const LABEL_ROW = 18;
const CLEF_TOP_POS = 12; // the treble clef's curl reaches just above the top line
const SIGN_GLYPH: Record<Exclude<StaffSign, ''>, string> = { '#': '♯', b: '♭', n: '♮' };

function TrebleClef({ y8, octaveMark }: { y8: number; octaveMark: boolean }) {
  return (
    <g transform={`translate(10 ${y8})`} className="staff-clef">
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

function BassClef({ y8 }: { y8: number }) {
  return (
    <g transform={`translate(10 ${y8})`} className="staff-clef">
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

export default function StaffNotation({
  clef, octaveMark, keySignature = [], notes, span, endBar = false, slots = 1, label, onPickPosition,
}: Props) {
  const topPos = Math.max(span.max + 2, CLEF_TOP_POS);
  const bottomPos = Math.min(span.min - 2, octaveMark ? -9 : -6);
  const hasLabels = notes.some((n) => n.label != null);
  const staffHeight = PAD * 2 + (topPos - bottomPos) * STEP;
  const height = staffHeight + (hasLabels ? LABEL_ROW : 0);
  const yOf = (p: number) => PAD + (topPos - p) * STEP;

  const keyStart = 48;
  const noteStart = keyStart + keySignature.length * 9 + 26;
  const slotCount = Math.max(slots, notes.length, 1);
  const single = slotCount === 1;
  const xs = single
    ? [Math.max(140, noteStart + 8)]
    : Array.from({ length: slotCount }, (_, i) => noteStart + 12 + i * 44);
  const width = single ? Math.max(220, xs[0] + 80) : xs[xs.length - 1] + 40;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    if (!onPickPosition) return;
    const box = e.currentTarget.getBoundingClientRect();
    const yUnits = ((e.clientY - box.top) / box.height) * height;
    const pos = Math.round(topPos - (yUnits - PAD) / STEP);
    onPickPosition(Math.max(bottomPos + 1, Math.min(topPos - 1, pos)));
  };

  return (
    <svg
      className={`staff-svg${onPickPosition ? ' staff-svg-input' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      // `direction` flips SVG text-anchor, so pin it against a Hebrew page.
      style={{ direction: 'ltr', maxWidth: single ? undefined : `${Math.round(width * 1.55)}px` }}
      onPointerDown={onPickPosition ? pick : undefined}
    >
      {[0, 2, 4, 6, 8].map((p) => (
        <line key={p} x1="4" x2={width - 4} y1={yOf(p)} y2={yOf(p)} className="staff-line" />
      ))}
      {clef === 'treble'
        ? <TrebleClef y8={yOf(8)} octaveMark={octaveMark} />
        : <BassClef y8={yOf(8)} />}
      {keySignature.map((k, i) => (
        <text
          key={i}
          x={keyStart + i * 9}
          y={yOf(k.position) + 6}
          fontSize="18"
          textAnchor="middle"
          fill="currentColor"
          className="staff-key-sign"
        >
          {SIGN_GLYPH[k.sign]}
        </text>
      ))}
      {endBar && (
        <>
          <line x1={width - 11} x2={width - 11} y1={yOf(8)} y2={yOf(0)} className="staff-line" />
          <line x1={width - 6} x2={width - 6} y1={yOf(8)} y2={yOf(0)} className="staff-bar-thick" />
        </>
      )}
      {notes.map((n, i) => {
        const x = xs[i];
        const y = yOf(n.position);
        const stemUp = n.position < 4;
        return (
          <g key={i} className={`staff-note staff-note-${n.state ?? 'live'}`}>
            {ledgerLines(n.position).map((p) => (
              <line key={p} x1={x - 12} x2={x + 12} y1={yOf(p)} y2={yOf(p)} className="staff-ledger" />
            ))}
            {n.sign && (
              <text x={x - 11} y={y + 6} fontSize="18" textAnchor="end" fill="currentColor">
                {SIGN_GLYPH[n.sign]}
              </text>
            )}
            <ellipse
              cx={x} cy={y} rx="6.6" ry="4.6"
              transform={`rotate(-20 ${x} ${y})`}
              fill="currentColor"
            />
            <line
              x1={stemUp ? x + 6 : x - 6}
              x2={stemUp ? x + 6 : x - 6}
              y1={stemUp ? y - 1.5 : y + 1.5}
              y2={stemUp ? y - 35 : y + 35}
              className="staff-stem"
            />
            {n.label != null && (
              <text
                x={x}
                y={staffHeight + LABEL_ROW - 5}
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                fill="currentColor"
                className="staff-note-label"
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
