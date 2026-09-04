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

/** Recordings required per label before a label counts as "done". */
export const SAMPLES_PER_LABEL = 2;

export type LetterLabel = (typeof LETTER_LABELS)[number];
export type AccidentalLabel = (typeof ACCIDENTAL_LABELS)[number];

export function isLetterLabel(label: string): label is LetterLabel {
  return (LETTER_LABELS as readonly string[]).includes(label);
}

export function isAccidentalLabel(label: string): label is AccidentalLabel {
  return (ACCIDENTAL_LABELS as readonly string[]).includes(label);
}

/**
 * Bumped whenever stored templates stop being comparable with freshly
 * captured ones, so templates from an older layout are simply never loaded.
 *
 * The IndexedDB version in `voiceProfile.ts` drops the local store on a
 * bump, but that alone is not enough: a signed-in user's templates also live
 * in Supabase, and `bootstrapVoiceProfile` writes every cloud row back into
 * the freshly emptied store. Versioning the id means those old rows land
 * under an id nothing asks for.
 *
 * v5: calibration takes are trimmed to the spoken word (`isolateWord`), the
 *     same way a question-time segment is. Earlier takes stored the whole
 *     capture, trailing silence included.
 */
const VOCAB_VERSION = 'v5';

/** IndexedDB / cloud grouping key — kept per notation, see file header. */
export function profileVocabId(notation: SpeechNotation): string {
  return `notes-${notation}-${VOCAB_VERSION}`;
}

/**
 * The unversioned id, for looking up data that is not the user's own
 * recordings — the bundled synthetic templates and the calibration noise
 * gate's reference set, both of which are keyed "notes-alpha"/"notes-solfege".
 */
export function baseVocabId(vocabId: string): string {
  return vocabId.replace(/-v\d+$/, '');
}

/** True for an id written by the current template layout. */
export function isCurrentVocabId(vocabId: string): boolean {
  return vocabId.endsWith(`-${VOCAB_VERSION}`);
}
