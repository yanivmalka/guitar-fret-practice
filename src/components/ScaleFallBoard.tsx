// ── ScaleFallBoard — Exercise A's full-screen Piano Tiles surface ────────
//
// Covers the whole app screen while a session runs (scales-learning-spec.md's
// Session 5 correction: "spread over the whole screen, like Piano Tiles").
// One lane per string, lowest string on the left — the way a vertical neck
// diagram reads — so a run up the scale travels left to right as it climbs.
// Each row is a slice of the neck at one fret (`scaleFall.ts`); its lit tile
// is the next note of the run.
//
// The stream moves by a transform written straight from the engine's
// animation frame (`frameListenerRef`), not through React state. Only rows
// near the live one are mounted, so a long session never puts hundreds of
// rows in the DOM.
//
// The lanes carry `dir="ltr"` permanently — Hebrew changes text direction
// only, never the instrument's layout; mirroring is the left-handed
// setting's job (`[data-hand="left"]` in 27-left-handed.css). The header
// follows the UI language.

import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { START_OFFSET, VISIBLE_ROWS, type FallStream } from '../learning/scaleFall';
import type { FallRowState, WrongTile } from '../hooks/useScaleFallEngine';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';

interface Props {
  stream: FallStream;
  rowStates: readonly FallRowState[];
  nextRow: number;
  wrongTile: WrongTile | null;
  /** `[string][fret] -> sharp-spelled note name` for the active instrument. */
  noteTable: readonly (readonly string[])[];
  stringCount: number;
  accidental: AccidentalMode;
  notation: NotationMode;
  frameListenerRef: MutableRefObject<((scroll: number) => void) | null>;
  onTap: (row: number, string: number) => void;
  /** Banner text for question `q` (scale name, root, box). */
  bannerLabel: (q: number) => string;
  /** The header's left-hand content: current scale, progress, score. */
  header: React.ReactNode;
  onExit: () => void;
  exitLabel: string;
  uiDir?: 'rtl';
}

export default function ScaleFallBoard({
  stream, rowStates, nextRow, wrongTile, noteTable, stringCount, accidental, notation,
  frameListenerRef, onTap, bannerLabel, header, onExit, exitLabel, uiDir,
}: Props) {
  const playRef = useRef<HTMLDivElement>(null);
  const streamElRef = useRef<HTMLDivElement>(null);
  const rowPxRef = useRef(0);
  const scrollRef = useRef(0);
  const [rowPx, setRowPx] = useState(0);

  // Row height follows the play area: VISIBLE_ROWS rows fill it exactly.
  useLayoutEffect(() => {
    const el = playRef.current;
    if (!el) return;
    const measure = () => {
      const px = el.clientHeight / VISIBLE_ROWS;
      rowPxRef.current = px;
      setRowPx(px);
      if (streamElRef.current) streamElRef.current.style.transform = `translate3d(0, ${scrollRef.current * px}px, 0)`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    frameListenerRef.current = (scroll: number) => {
      scrollRef.current = scroll;
      const el = streamElRef.current;
      if (el) el.style.transform = `translate3d(0, ${scroll * rowPxRef.current}px, 0)`;
    };
    return () => { frameListenerRef.current = null; };
  }, [frameListenerRef]);

  // Lowest-pitched string on the left.
  const lanes = Array.from({ length: stringCount }, (_, i) => stringCount - i);

  // Everything that can be on screen: rows already hit below the live one
  // (the learner can run ahead up to a screen's worth) and the ones above it.
  const lo = Math.max(0, nextRow - VISIBLE_ROWS - 2);
  const hi = Math.min(stream.rows.length - 1, nextRow + VISIBLE_ROWS + 2);
  const visible: number[] = [];
  for (let i = lo; i <= hi; i++) visible.push(i);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-lane]');
    if (!tile) return;
    e.preventDefault();
    onTap(Number(tile.dataset.row), Number(tile.dataset.lane));
  };

  return (
    <div
      className="scale-fall"
      role="dialog"
      aria-modal="true"
      style={{ '--fall-lanes': stringCount } as React.CSSProperties}
    >
      <div className="scale-fall-header" dir={uiDir}>
        <div className="scale-fall-header-info">{header}</div>
        <button type="button" className="scale-fall-exit" onClick={onExit} aria-label={exitLabel} title={exitLabel}>
          ✕
        </button>
      </div>

      <div
        className="scale-fall-play"
        ref={playRef}
        onPointerDown={handlePointerDown}
      >
        <div className="scale-fall-stream" ref={streamElRef}>
          {rowPx > 0 && visible.map((i) => {
            const row = stream.rows[i];
            const style: React.CSSProperties = { bottom: (i + START_OFFSET) * rowPx, height: rowPx };
            if (row.kind === 'banner') {
              return (
                <div key={i} className="scale-fall-banner" style={style} dir={uiDir}>
                  <span>{bannerLabel(row.q)}</span>
                </div>
              );
            }
            const state = rowStates[i];
            const rootName = stream.questions[row.q]?.rootName;
            const isGap = row.kind === 'gap';
            return (
              <div key={i} className="scale-fall-row" style={style} dir="ltr">
                {lanes.map((s, laneIndex) => {
                  const isTarget = row.kind === 'note' && s === row.string;
                  const name = noteTable[s - 1]?.[row.fret] ?? '';
                  let cls = 'scale-fall-tile';
                  if (isTarget) {
                    cls += ' scale-fall-tile-lit';
                    if (name === rootName) cls += ' scale-fall-tile-root';
                    if (i === nextRow) cls += ' scale-fall-tile-next';
                    if (state === 'hit') cls += ' scale-fall-tile-hit';
                    if (state === 'miss') cls += ' scale-fall-tile-miss';
                  }
                  if (wrongTile && wrongTile.row === i && wrongTile.string === s) cls += ' scale-fall-tile-wrong';
                  return (
                    <div key={s} className={cls} data-row={i} data-lane={s}>
                      <span className="scale-fall-note">{displayNote(name, accidental, notation)}</span>
                      {(isTarget || (isGap && laneIndex === 0)) && <span className="scale-fall-fret">{row.fret}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="scale-fall-lanes" dir="ltr" aria-hidden="true">
        {lanes.map((s) => (
          <span key={s} className="scale-fall-lane-label">
            {displayNote(noteTable[s - 1]?.[0] ?? '', accidental, notation)}
          </span>
        ))}
      </div>
    </div>
  );
}
