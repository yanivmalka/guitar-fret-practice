// Standalone note pool for the pitch-answer spike — deliberately not
// imported from src/utils/instruments.ts, same isolation convention as
// src/tuner/ (see its README): this whole feature is a throwaway
// measurement tool, not yet integrated with the real app.

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function buildRow(openNote: string, maxFret: number): string[] {
  const start = CHROMATIC.indexOf(openNote);
  return Array.from({ length: maxFret + 1 }, (_, f) => CHROMATIC[(start + f) % 12]);
}

// Standard guitar tuning, high to low, frets 0-12 only (matches the app's
// free "Dots" difficulty range — the easiest, most realistic first target
// for a spike).
export const GUITAR = {
  stringCount: 6,
  openMidi: [64, 59, 55, 50, 45, 40], // E4 B3 G3 D3 A2 E2
  notes: [
    buildRow('E', 12),
    buildRow('B', 12),
    buildRow('G', 12),
    buildRow('D', 12),
    buildRow('A', 12),
    buildRow('E', 12),
  ],
};
