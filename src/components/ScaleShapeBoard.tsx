// ── ScaleShapeBoard — the "build the scale" answer surface ──────────────
//
// A piano-tiles-style multi-string board: one row (lane) per string the
// shape touches, one tappable tile per fret in the shape's window — shape
// members AND decoys alike, so a wrong tap is a real possibility, not just
// "did you tap every visible button." This is the new capability Exercise A
// genuinely needs (see scaleDrill.ts's header comment) — FretGrid only ever
// renders one string.

import type { ScaleQuestion } from '../learning/scaleDrill';
import type { NeckPos } from '../utils/scales';

interface Props {
  question: ScaleQuestion;
  foundPositions: NeckPos[];
  wrongPosition: NeckPos | null;
  active: boolean;
  onSelect: (string: number, fret: number) => void;
}

function samePos(a: NeckPos, b: NeckPos): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export default function ScaleShapeBoard({ question, foundPositions, wrongPosition, active, onSelect }: Props) {
  const frets = question.shape.map((p) => p.fret);
  const fretFrom = Math.min(...frets);
  const fretTo = Math.max(...frets);
  const fretRange = Array.from({ length: fretTo - fretFrom + 1 }, (_, i) => fretFrom + i);

  const strings = [...new Set(question.shape.map((p) => p.string))].sort((a, b) => a - b);

  return (
    <div className="scale-board" role="group" aria-label="Scale shape">
      {strings.map((s) => (
        <div className="scale-board-row" key={s}>
          <span className="scale-board-string-label">{s}</span>
          {fretRange.map((f) => {
            const pos: NeckPos = { string: s, fret: f };
            // Every fret in the window is a real, tappable tile — including
            // ones that are NOT part of the shape. Rendering only the true
            // shape members (an earlier version of this component) would let
            // the learner "solve" a question by tapping every visible tile,
            // with nothing to actually get wrong — this way a wrong tap
            // lands on a real, indistinguishable-looking decoy tile, exactly
            // like FretGrid's filter-range frets.
            const isShapeMember = question.shape.some((p) => samePos(p, pos));
            const isRoot = s === question.rootString && f === question.rootFret;
            const isFound = foundPositions.some((p) => samePos(p, pos));
            const isWrong = wrongPosition != null && samePos(wrongPosition, pos);

            let cls = 'scale-tile scale-tile-active';
            if (isFound) cls += ' scale-tile-found';
            else if (isWrong) cls += ' scale-tile-wrong';
            else if (isRoot) cls += ' scale-tile-root';

            return (
              <button
                key={f}
                type="button"
                className={cls}
                disabled={!active || (isFound && isShapeMember)}
                onClick={() => onSelect(s, f)}
                title={`String ${s} · fret ${f}`}
              >
                {isRoot && !isFound && <span className="scale-tile-root-dot" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
