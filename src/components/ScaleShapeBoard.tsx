// ── ScaleShapeBoard — the "build the scale" answer surface ──────────────
//
// The WHOLE neck, all at once: one row per string of the active instrument,
// one tile per fret from 0 to `maxFret`, every tile carrying its real note
// name. The current shape's positions are **lit**; every other note on the
// neck is **dim** but still present and still tappable — the learner sees
// where the shape sits inside the full fretboard instead of seeing the shape
// alone (product-owner instruction, scales-learning-spec.md's Session 3
// correction: "all the notes appear, the unrelated ones off, the scale's
// ones lit"). Replaces the falling-lane Piano Tiles board.
//
// `dir="ltr"` is permanent — Hebrew changes text direction only, never the
// neck's physical layout; mirroring is the separate left-handed setting's
// job (`[data-hand="left"]` in 27-left-handed.css), exactly as `.fret-grid`
// does it.

import type { ScaleQuestion } from '../learning/scaleDrill';
import type { NeckPos } from '../utils/scales';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';

interface Props {
  question: ScaleQuestion;
  /** `[string][fret] -> sharp-spelled note name` for the active instrument. */
  noteTable: readonly (readonly string[])[];
  stringCount: number;
  maxFret: number;
  dotFrets: readonly number[];
  accidental: AccidentalMode;
  notation: NotationMode;
  foundPositions: NeckPos[];
  wrongPosition: NeckPos | null;
  active: boolean;
  onSelect: (string: number, fret: number) => void;
}

function samePos(a: NeckPos, b: NeckPos): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export default function ScaleShapeBoard({
  question, noteTable, stringCount, maxFret, dotFrets, accidental, notation,
  foundPositions, wrongPosition, active, onSelect,
}: Props) {
  const frets = Array.from({ length: maxFret + 1 }, (_, i) => i);
  // String 1 is the highest-pitched string, so it renders on top — the same
  // way a player looks down at the neck.
  const strings = Array.from({ length: stringCount }, (_, i) => i + 1);
  const dots = new Set(dotFrets);

  return (
    <div className="scale-neck-scroll">
      <div
        className="scale-neck"
        role="group"
        aria-label="Scale shape"
        dir="ltr"
        style={{ '--scale-neck-frets': frets.length } as React.CSSProperties}
      >
        {strings.map((s) => (
          <div className="scale-neck-row" key={s}>
            {frets.map((f) => {
              const pos: NeckPos = { string: s, fret: f };
              const isShapeMember = question.shape.some((p) => samePos(p, pos));
              const isRoot = s === question.rootString && f === question.rootFret;
              const isFound = foundPositions.some((p) => samePos(p, pos));
              const isWrong = wrongPosition != null && samePos(wrongPosition, pos);
              const name = noteTable[s - 1]?.[f] ?? '';

              let cls = isShapeMember ? 'scale-neck-tile scale-neck-tile-lit' : 'scale-neck-tile scale-neck-tile-dim';
              if (isRoot) cls += ' scale-neck-tile-root';
              if (isFound) cls += ' scale-neck-tile-found';
              if (isWrong) cls += ' scale-neck-tile-wrong';

              return (
                <button
                  key={f}
                  type="button"
                  className={cls}
                  disabled={!active}
                  onClick={() => onSelect(s, f)}
                  title={`String ${s} · fret ${f}`}
                >
                  {displayNote(name, accidental, notation)}
                </button>
              );
            })}
          </div>
        ))}
        <div className="scale-neck-row scale-neck-fretnums" aria-hidden="true">
          {frets.map((f) => (
            <span className="scale-neck-fretnum" key={f}>
              {dots.has(f) ? `${f}•` : f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
