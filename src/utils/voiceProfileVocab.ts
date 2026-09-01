// ── Shared vocabulary for the personal voice-profile recogniser ────────
//
// v2 (segmented). "By fret" questions where the answer is one of the twelve
// chromatic note names. Instead of recording every accidental note as a
// whole phrase ("C sharp", "D sharp", …), calibration records nine short
// isolated words:
//
//   • seven natural letters — C D E F G A B (spoken in the active notation,
//     so "C" or "do", etc.)
//   • two accidental words  — "#" holds "sharp" / "dièse", "b" holds "flat"
//     / "bémol"
//
// At question time `templateSpeechEngine` splits the spoken answer into one
// or two segments and matches each part against the relevant set, then
// composes the note name. Templates are still grouped per notation (the
// accidental word differs between "sharp" and "dièse"), see `profileVocabId`.

import type { SpeechNotation } from './speechVocab';

/** Canonical natural-note letters, matched against the first segment. */
export const LETTER_LABELS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/** Accidental labels, matched against an optional second segment. */
export const ACCIDENTAL_LABELS = ['#', 'b'] as const;

/** Every label a v2 profile stores, in calibration order. */
export const PROFILE_LABELS = [...LETTER_LABELS, ...ACCIDENTAL_LABELS] as const;

export type LetterLabel = (typeof LETTER_LABELS)[number];
export type AccidentalLabel = (typeof ACCIDENTAL_LABELS)[number];

export function isLetterLabel(label: string): label is LetterLabel {
  return (LETTER_LABELS as readonly string[]).includes(label);
}

export function isAccidentalLabel(label: string): label is AccidentalLabel {
  return (ACCIDENTAL_LABELS as readonly string[]).includes(label);
}

/** IndexedDB grouping key — kept per notation, see file header. */
export function profileVocabId(notation: SpeechNotation): string {
  return `notes-${notation}`;
}
