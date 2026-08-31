// Master [string][fret] -> note-name table for the standard 6-string guitar
// (string index 0 = high E). `notes` below is a *live binding* that points at
// this table by default and is swapped to the bass table by setActiveInstrument
// (see utils/instruments.ts) — always read `notes`/`activeMaxFret`/
// `activeDotFrets` at call time rather than copying them at module load.
export const GUITAR_NOTES: string[][] = [
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#'],
  ['B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#'],
  ['G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E'],
  ['D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
  ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#'],
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#'],
];

export const GUITAR_DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

// ── Active instrument (mutable) ──────────────────────────────────────────
// Guitar by default; App.tsx calls setActiveInstrument() before first paint
// and again whenever the user switches instrument in the hamburger menu.
export let notes: string[][] = GUITAR_NOTES;
export let activeMaxFret = 21;
export let activeDotFrets: number[] = GUITAR_DOT_FRETS;

export function setActiveInstrument(cfg: {
  notes: string[][];
  maxFret: number;
  dotFrets: number[];
}): void {
  notes = cfg.notes;
  activeMaxFret = cfg.maxFret;
  activeDotFrets = cfg.dotFrets;
}

export const cofNotesSharp = ['C','G','D','A','E','B','F#','C#','G#','D#','A#','F'];
export const cofNotesFlat = ['C','G','D','A','E','B','Gb','Db','Ab','Eb','Bb','F'];
export const alphaNotesSharp = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
export const alphaNotesFlat = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];
export const wholeTonesFifths = ['C','G','D','A','E','B','F'];
export const wholeTonesAlpha = ['A','B','C','D','E','F','G'];
export const wholeTones = ['C','D','E','F','G','A','B'];

export const sharpToFlat: Record<string, string> = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
export const flatToSharp: Record<string, string> = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};

// Solfege mapping (using Italian/Spanish standard: Do Re Mi Fa Sol La Si)
const alphaToSolfege: Record<string, string> = {
  'C':'Do', 'C#':'Do#', 'Db':'Do♭',
  'D':'Re', 'D#':'Re#', 'Eb':'Re♭',
  'E':'Mi',
  'F':'Fa', 'F#':'Fa#', 'Gb':'Fa♭',
  'G':'Sol', 'G#':'Sol#', 'Ab':'Sol♭',
  'A':'La', 'A#':'La#', 'Bb':'La♭',
  'B':'Si',
};

export type AccidentalMode = 'sharps' | 'flats';
export type OrderMode = 'fifths' | 'alphabet';
export type NotationMode = 'alpha' | 'solfege';

export interface HistoryEntry {
  note: string;
  fret: number;
  string: number;
  seconds: number;
  skipped: boolean;
  correct: boolean | null;
  // Assigned by useHistory when the entry is recorded (older localStorage
  // rows predate these). Used to sync/merge with the cloud per account.
  id?: string;
  createdAt?: string;
}

export function getCofNotes(accidental: AccidentalMode, order: OrderMode, wholeToneOnly: boolean): string[] {
  if (order === 'alphabet') {
    const base = wholeToneOnly ? wholeTonesAlpha : (accidental === 'sharps' ? alphaNotesSharp : alphaNotesFlat);
    return base;
  }
  const base = wholeToneOnly ? wholeTonesFifths : (accidental === 'sharps' ? cofNotesSharp : cofNotesFlat);
  return base;
}

// Returns the index in cofList that should appear at 12 o'clock for the given string
export function getStringStartIndex(accidental: AccidentalMode, order: OrderMode, wholeToneOnly: boolean, stringIdx: number): number {
  const base = getCofNotes(accidental, order, wholeToneOnly);
  // Guard the brief render right after an instrument switch, when a stale
  // (larger) string number can still be passed against the new note table.
  const openNote = notes[stringIdx]?.[0] ?? notes[notes.length - 1][0];
  const idx = base.findIndex(n => notesMatch(n, openNote));
  return idx >= 0 ? idx : 0;
}

export function displayNote(note: string, mode: AccidentalMode, notation: NotationMode = 'alpha'): string {
  // First resolve accidental
  let resolved = note;
  if (mode === 'flats') resolved = sharpToFlat[note] || note;
  if (mode === 'sharps') resolved = flatToSharp[note] || note;
  // Then apply notation
  if (notation === 'solfege') return alphaToSolfege[resolved] || resolved;
  return resolved;
}

export function notesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (sharpToFlat[a] === b || sharpToFlat[b] === a) return true;
  if (flatToSharp[a] === b || flatToSharp[b] === a) return true;
  return false;
}

export function getCorrectCofNote(correctNote: string, cofList: string[]): string {
  return cofList.find(n => notesMatch(n, correctNote)) || correctNote;
}

export function getValidFrets(stringIdx: number, fromFret: number, toFret: number, wholeToneOnly: boolean, dotsOnly?: boolean): number[] {
  const dotAndOpenFrets = [0, ...activeDotFrets];
  // Fall back to the lowest string if a stale out-of-range index slips through
  // during an instrument switch (see getStringStartIndex).
  const row = notes[stringIdx] ?? notes[notes.length - 1];
  const valid: number[] = [];
  for (let f = fromFret; f <= toFret; f++) {
    if (dotsOnly && !dotAndOpenFrets.includes(f)) continue;
    if (!wholeToneOnly || wholeTones.includes(row[f])) valid.push(f);
  }
  return valid.length > 0 ? valid : [fromFret];
}
