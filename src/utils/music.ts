export const notes: string[][] = [
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#'],
  ['B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#'],
  ['G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E'],
  ['D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
  ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#'],
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#'],
];

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
  'C':'Do', 'C#':'Do#', 'Db':'Dob',
  'D':'Re', 'D#':'Re#', 'Eb':'Reb',
  'E':'Mi',
  'F':'Fa', 'F#':'Fa#', 'Gb':'Fab',
  'G':'Sol', 'G#':'Sol#', 'Ab':'Solb',
  'A':'La', 'A#':'La#', 'Bb':'Lab',
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
  const openNote = notes[stringIdx][0];
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
  const dotAndOpenFrets = [0, 3, 5, 7, 9, 12, 15, 17, 19, 21];
  const valid: number[] = [];
  for (let f = fromFret; f <= toFret; f++) {
    if (dotsOnly && !dotAndOpenFrets.includes(f)) continue;
    if (!wholeToneOnly || wholeTones.includes(notes[stringIdx][f])) valid.push(f);
  }
  return valid.length > 0 ? valid : [fromFret];
}
