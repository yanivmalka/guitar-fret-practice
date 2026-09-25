// ── ScaleOrderBoard — "Tap the scale in order"'s still neck section ──────
//
// One row per string (the highest string on top, the way a box diagram or a
// tab reads), one column per fret of the box, fret numbers underneath. Every
// note of the scale is lit; the learner taps them in the order of the run.
// A found note turns green and shows its number in the run; the scale's tonic
// keeps a gold ring.
//
// The grid carries `dir="ltr"` permanently — Hebrew changes text direction
// only, never the instrument's layout; mirroring is the left-handed setting's
// job (`[data-hand="left"]` in 27-left-handed.css).

import type { ScaleOrderBoard as Board } from '../learning/scaleOrder';
import type { OrderTile } from '../hooks/useScaleOrderEngine';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';

interface Props {
  board: Board;
  /** Steps of the run already found. */
  step: number;
  /** Steps that slipped — a wrong tap while they were being looked for. */
  slips: readonly boolean[];
  wrongTile: OrderTile | null;
  rootName: string;
  /** `[string][fret] -> sharp-spelled note name` for the active instrument. */
  noteTable: readonly (readonly string[])[];
  stringCount: number;
  accidental: AccidentalMode;
  notation: NotationMode;
  onTap: (string: number, fret: number) => void;
}

export default function ScaleOrderBoard({
  board, step, slips, wrongTile, rootName, noteTable, stringCount, accidental, notation, onTap,
}: Props) {
  const frets: number[] = [];
  for (let f = board.fromFret; f <= board.toFret; f++) frets.push(f);
  const strings = Array.from({ length: stringCount }, (_, i) => i + 1);

  return (
    <div
      className="scale-order-board"
      dir="ltr"
      style={{ '--order-frets': frets.length } as React.CSSProperties}
    >
      {strings.map((s) => (
        <div key={s} className="scale-order-row">
          <span className="scale-order-string">
            {displayNote(noteTable[s - 1]?.[0] ?? '', accidental, notation)}
          </span>
          {frets.map((f) => {
            const name = noteTable[s - 1]?.[f] ?? '';
            const tileStep = board.stepAt.get(`${s}:${f}`);
            const lit = tileStep != null;
            const found = lit && tileStep < step;
            let cls = 'scale-order-tile';
            if (lit) cls += ' scale-order-tile-lit';
            if (lit && name === rootName) cls += ' scale-order-tile-root';
            if (found) cls += ' scale-order-tile-found';
            if (found && slips[tileStep]) cls += ' scale-order-tile-slip';
            if (wrongTile && wrongTile.string === s && wrongTile.fret === f) cls += ' scale-order-tile-wrong';
            return (
              <button
                key={f}
                type="button"
                className={cls}
                onClick={() => onTap(s, f)}
              >
                {lit && <span className="scale-order-note">{displayNote(name, accidental, notation)}</span>}
                {found && <span className="scale-order-step">{tileStep + 1}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="scale-order-row scale-order-frets" aria-hidden="true">
        <span className="scale-order-string" />
        {frets.map((f) => <span key={f} className="scale-order-fret">{f}</span>)}
      </div>
    </div>
  );
}
