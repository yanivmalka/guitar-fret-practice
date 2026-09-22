// ── ScaleTilesBoard — the real Piano Tiles answer surface for Exercise A ──
//
// One vertical lane per string (product-owner instruction: lane count = the
// active instrument's string count, for every instrument/variant, not a
// fixed number). Each tile falls down its lane on a pure CSS animation
// (`animation-delay` computed once from the engine's schedule — see
// `useScaleTilesEngine.ts`'s header comment for why there is no
// `requestAnimationFrame` loop anywhere in this feature) and crosses a fixed
// hit-line partway down. Tapping ANYWHERE in a lane is the input — exactly
// like the real game's "which column," not "which specific tile."

import type { ScaleTilesRun, ScaleTile } from '../learning/scaleTiles';
import { TRAVEL_MS } from '../learning/scaleTiles';
import type { TileResolution } from '../hooks/useScaleTilesEngine';

interface Props {
  run: ScaleTilesRun;
  resolutions: TileResolution[];
  stringCount: number;
  active: boolean;
  onTapLane: (stringNum: number) => void;
}

export default function ScaleTilesBoard({ run, resolutions, stringCount, active, onTapLane }: Props) {
  const lanes = Array.from({ length: stringCount }, (_, i) => i + 1);

  return (
    <div className="scale-tiles-board" role="group" aria-label="Scale tiles" dir="ltr">
      <div className="scale-tiles-hitline" />
      {lanes.map((laneString) => (
        <button
          key={laneString}
          type="button"
          className="scale-tiles-lane"
          disabled={!active}
          onClick={() => onTapLane(laneString)}
          aria-label={`String ${laneString}`}
        >
          {run.tiles.map((tile: ScaleTile, i: number) => {
            if (tile.string !== laneString) return null;
            const resolution = resolutions[i] ?? 'pending';
            const delayMs = tile.atMs - TRAVEL_MS;
            let cls = 'scale-tiles-tile';
            if (resolution === 'hit') cls += ' scale-tiles-tile-hit';
            else if (resolution === 'miss') cls += ' scale-tiles-tile-miss';
            return (
              <div
                key={i}
                className={cls}
                style={{
                  animationDelay: `${delayMs}ms`,
                  animationDuration: `${TRAVEL_MS}ms`,
                  animationPlayState: resolution === 'pending' ? 'running' : 'paused',
                }}
              />
            );
          })}
        </button>
      ))}
    </div>
  );
}
