// Standard 6-string guitar tuning (low to high: E A D G B E). Maps a note
// name to which physical string(s) it corresponds to as an open string, so
// picking a target note on the wheel can also say "this is string N". Open
// E exists on both string 6 (low) and string 1 (high) — a chromatic wheel
// position can't distinguish the octave, so both are listed.
export const STANDARD_TUNING_STRINGS: Record<string, number[]> = {
  E: [6, 1],
  A: [5],
  D: [4],
  G: [3],
  B: [2],
};
