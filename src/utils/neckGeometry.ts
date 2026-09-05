// Shared fretboard-neck geometry for the little SVG necks (the half-picker in
// SelectorPanel and the fret-range neck in Settings). Positions are computed
// once for the longest neck we support (bass, 24 frets); a shorter neck just
// indexes the first N entries and rescales via `fretXFor`.

export const SCALE_FACTOR = 17.817;
export const MAX_SUPPORTED_FRET = 24;

function computeFretPositions(): number[] {
  const positions: number[] = [0];
  let remaining = 1.0;
  for (let i = 1; i <= MAX_SUPPORTED_FRET; i++) {
    const fretDist = remaining / SCALE_FACTOR;
    remaining -= fretDist;
    positions.push(1.0 - remaining);
  }
  return positions;
}

export const FRET_POSITIONS = computeFretPositions();

// Layout: nut at right (fret 0), last fret near the left edge.
export const NECK_RIGHT = 370;
export const FB_LEFT_MARGIN = 28;

export const FB_TOP = 5;
export const FB_HEIGHT = 40;
export const FB_BOTTOM = FB_TOP + FB_HEIGHT;

// Returns an `x` accessor for a given fret number, scaled so the last fret of
// this instrument always lands at the left margin whatever the neck length.
export function fretXFor(maxFret: number): (fretNum: number) => number {
  const neckWidth = (NECK_RIGHT - FB_LEFT_MARGIN) / FRET_POSITIONS[maxFret];
  return (fretNum: number) => NECK_RIGHT - FRET_POSITIONS[fretNum] * neckWidth;
}
