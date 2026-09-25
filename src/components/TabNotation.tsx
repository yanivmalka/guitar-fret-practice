// ── TabNotation — fret numbers written on tab lines ──────────────────────
//
// tab-reading-spec.md §10. A small self-contained SVG: one line per string,
// the word TAB at the start, the open-string names on the left, and one fret
// number or a short riff of them, each written on its string's line.
//
// Orientation follows every real tab, NOT the app's necks: the top line is
// string 1, the thinnest and highest-pitched, and the lowest string is the
// bottom line. The product owner chose this deliberately so the learner
// reads the tabs they will meet everywhere else; the neck board beside it
// keeps the app's lowest-string-on-top layout, and the screen says so.
//
// With `onPickString` the tab is also an input: a tap reports the nearest
// line ("Write it in tab").
//
// Tab always reads left to right: the SVG is pinned to LTR (also against a
// Hebrew page) and is NOT mirrored by the left-handed setting — that setting
// mirrors the instrument, and a tab is notation, not the instrument.

import type { PointerEvent } from 'react';

export type TabNoteState =
  | 'live' | 'current' | 'correct' | 'wrong' | 'ghost';

export interface TabNote {
  /** 1-based string, 1 = the top line. */
  string: number;
  /** The number written; `null` = the line is chosen but no number yet. */
  fret: number | null;
  state?: TabNoteState;
  /** Text under the note (its name, once answered). */
  label?: string;
}

interface Props {
  /** Open-string names, `[0]` = string 1 (the top line). */
  stringNames: readonly string[];
  notes: readonly TabNote[];
  /** Close the riff with a final bar line. */
  endBar?: boolean;
  /** Lay the tab out for this many notes even while fewer are drawn. */
  slots?: number;
  /** Highlight this string's line (the line being written on). */
  selectedString?: number | null;
  /** Accessible description, e.g. "A number on the tab". */
  label: string;
  /** Makes the tab tappable: reports the nearest line's string number. */
  onPickString?: (string: number) => void;
}

const LINE_GAP = 16;
const TOP = 14;
const LABEL_ROW = 20;
const NAME_X = 12;
const LINE_START = 24;

export default function TabNotation({
  stringNames, notes, endBar = false, slots = 1, selectedString = null, label, onPickString,
}: Props) {
  const count = stringNames.length;
  const yOf = (s: number) => TOP + (s - 1) * LINE_GAP;
  const hasLabels = notes.some((n) => n.label != null);
  const tabHeight = TOP * 2 + (count - 1) * LINE_GAP;
  const height = tabHeight + (hasLabels ? LABEL_ROW : 0);

  const noteStart = 78;
  const slotCount = Math.max(slots, notes.length, 1);
  const single = slotCount === 1;
  const xs = single
    ? [140]
    : Array.from({ length: slotCount }, (_, i) => noteStart + i * 40);
  const width = single ? 220 : xs[xs.length - 1] + 40;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    if (!onPickString) return;
    const box = e.currentTarget.getBoundingClientRect();
    const yUnits = ((e.clientY - box.top) / box.height) * height;
    const s = Math.round((yUnits - TOP) / LINE_GAP) + 1;
    onPickString(Math.max(1, Math.min(count, s)));
  };

  // "TAB" written down the start of the tab, spread over its lines.
  const tabLetters = ['T', 'A', 'B'];
  const letterStep = (yOf(count) - yOf(1)) / 3;

  return (
    <svg
      className={`staff-svg tab-svg${onPickString ? ' staff-svg-input' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      // `direction` flips SVG text-anchor, so pin it against a Hebrew page.
      style={{ direction: 'ltr', maxWidth: single ? undefined : `${Math.round(width * 1.55)}px` }}
      onPointerDown={onPickString ? pick : undefined}
    >
      {stringNames.map((name, i) => {
        const s = i + 1;
        return (
          <g key={s}>
            <text x={NAME_X} y={yOf(s) + 4} fontSize="11" fontWeight="700" textAnchor="middle" className="tab-string-name">
              {name}
            </text>
            <line
              x1={LINE_START}
              x2={width - 4}
              y1={yOf(s)}
              y2={yOf(s)}
              className={`staff-line${selectedString === s ? ' tab-line-selected' : ''}`}
            />
          </g>
        );
      })}
      <line x1={LINE_START} x2={LINE_START} y1={yOf(1)} y2={yOf(count)} className="staff-line" />
      {tabLetters.map((ch, i) => {
        const cy = yOf(1) + letterStep * (i + 0.5);
        return (
          <g key={ch}>
            <rect x={LINE_START + 11} y={cy - 7} width={14} height={14} className="tab-num-bg" />
            <text x={LINE_START + 18} y={cy + 5} fontSize="13" fontWeight="800" textAnchor="middle" className="tab-clef">
              {ch}
            </text>
          </g>
        );
      })}
      {endBar && (
        <>
          <line x1={width - 11} x2={width - 11} y1={yOf(1)} y2={yOf(count)} className="staff-line" />
          <line x1={width - 6} x2={width - 6} y1={yOf(1)} y2={yOf(count)} className="staff-bar-thick" />
        </>
      )}
      {notes.map((n, i) => {
        const x = xs[i];
        const y = yOf(n.string);
        const text = n.fret == null ? '?' : String(n.fret);
        const w = text.length > 1 ? 20 : 13;
        return (
          <g key={i} className={`tab-note staff-note-${n.state ?? 'live'}`}>
            <rect x={x - w / 2} y={y - 8} width={w} height={16} rx="3" className="tab-num-bg" />
            <text x={x} y={y + 5} fontSize="15" fontWeight="800" textAnchor="middle" fill="currentColor">
              {text}
            </text>
            {n.label != null && (
              <text
                x={x}
                y={tabHeight + LABEL_ROW - 6}
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
