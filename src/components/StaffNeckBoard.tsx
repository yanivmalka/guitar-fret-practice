// ── StaffNeckBoard — the neck section of the Staff reading exercises ─────
//
// staff-reading-spec.md §6.2 / §6.3. A still section of the neck, frets
// bottom…top (0…3 up to 12…the last fret), one
// row per string with the lowest string on top like every other neck in the
// app. The tiles are blank — naming them would give the answer away. After
// an answer, every place that plays the written pitch is revealed in green
// and a wrong tap turns red, so the learner sees all the places it lives.
// "Where is it written?" shows it read-only (no `onTap`) with one place
// `marked` — the note to find on the staff.
//
// Reuses ScaleOrderBoard's grid classes (30-scale-board.css), including the
// left-handed mirroring in 27-left-handed.css; pinned `dir="ltr"` because
// Hebrew changes text direction only, never the instrument's layout.

import type { StaffPosition } from '../learning/staffDrill';
import { displayNote, activeDotFrets, type AccidentalMode, type NotationMode } from '../utils/music';

interface Props {
  /** First fret shown (0, or 12 for the high range). */
  bottomFret?: number;
  topFret: number;
  /** `[string][fret] -> note name`, used only for the open-string labels. */
  noteTable: readonly (readonly string[])[];
  stringCount: number;
  minFrets?: readonly number[];
  /** Revealed after the answer: every place that plays the written pitch. */
  reveal: readonly StaffPosition[] | null;
  tapped: (StaffPosition & { correct: boolean }) | null;
  /** The place the question points at ("Where is it written?"). */
  marked?: StaffPosition | null;
  /** Places the learner has picked so far (a chord being played). */
  selected?: readonly StaffPosition[];
  /** Picked places that turned out wrong (after a chord is checked). */
  wrong?: readonly StaffPosition[];
  accidental: AccidentalMode;
  notation: NotationMode;
  /** Omitted ⇒ a read-only board. */
  onTap?: (string: number, fret: number) => void;
}

export default function StaffNeckBoard({
  bottomFret = 0, topFret, noteTable, stringCount, minFrets, reveal, tapped, marked, selected, wrong, accidental,
  notation, onTap,
}: Props) {
  const has = (list: readonly StaffPosition[] | undefined, s: number, f: number) =>
    list?.some((p) => p.string === s && p.fret === f) ?? false;
  const frets: number[] = [];
  for (let f = bottomFret; f <= topFret; f++) frets.push(f);
  const strings = Array.from({ length: stringCount }, (_, i) => stringCount - i);
  const dots = new Set(activeDotFrets);
  const isRevealed = (s: number, f: number) => reveal?.some((p) => p.string === s && p.fret === f) ?? false;

  return (
    <div
      className="scale-order-board staff-neck-board"
      dir="ltr"
      style={{ '--order-frets': frets.length } as React.CSSProperties}
    >
      {strings.map((s) => (
        <div key={s} className="scale-order-row">
          <span className="scale-order-string">
            {displayNote(noteTable[s - 1]?.[0] ?? '', accidental, notation)}
          </span>
          {frets.map((f) => {
            const playable = f >= (minFrets?.[s - 1] ?? 0);
            let cls = 'scale-order-tile staff-neck-tile';
            if (f === 0) cls += ' staff-neck-open';
            if (!playable) cls += ' staff-neck-unplayable';
            if (isRevealed(s, f)) cls += ' scale-order-tile-found';
            if (tapped && !tapped.correct && tapped.string === s && tapped.fret === f) cls += ' scale-order-tile-wrong';
            if (marked && marked.string === s && marked.fret === f) cls += ' staff-neck-marked';
            if (has(selected, s, f)) cls += ' staff-neck-selected';
            if (has(wrong, s, f)) cls += ' scale-order-tile-wrong';
            if (!onTap) return <span key={f} className={cls} />;
            return (
              <button
                key={f}
                type="button"
                className={cls}
                disabled={!playable}
                aria-label={`${s} · ${f}`}
                onClick={() => onTap(s, f)}
              />
            );
          })}
        </div>
      ))}
      <div className="scale-order-row scale-order-frets" aria-hidden="true">
        <span className="scale-order-string" />
        {frets.map((f) => (
          <span key={f} className={`scale-order-fret${dots.has(f) ? ' staff-neck-dot' : ''}`}>{f}</span>
        ))}
      </div>
    </div>
  );
}
