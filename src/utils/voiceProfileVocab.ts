// ── Shared vocabulary for the personal voice-profile recogniser ────────
//
// v1 covers "by fret" questions only: the answer is one of the twelve
// chromatic note names. Calibration records the user saying each of these,
// stored per notation (they sound different spoken as "C sharp" vs
// "do dièse"), and the engine emits the canonical name straight back —
// `parseSpokenNote` round-trips it for either notation.

import type { SpeechNotation } from './speechVocab';

export const CHROMATIC_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export type ChromaticNote = (typeof CHROMATIC_NOTES)[number];

/** IndexedDB grouping key — kept per notation, see file header. */
export function profileVocabId(notation: SpeechNotation): string {
  return `notes-${notation}`;
}
