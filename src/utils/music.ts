export const notes: string[][] = [
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#'],
  ['B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F'],
  ['G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#'],
  ['D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#'],
  ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C','C#','D','D#'],
  ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#','E','F','F#','G','G#','A','A#'],
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

export type AccidentalMode = 'sharps' | 'flats';
export type OrderMode = 'fifths' | 'alphabet';

export interface HistoryEntry {
  note: string;
  fret: number;
  string: number;
  seconds: number;
  skipped: boolean;
  correct: boolean | null;
}

export function getCofNotes(accidental: AccidentalMode, order: OrderMode, wholeToneOnly: boolean, stringIdx?: number, byString?: boolean): string[] {
  if (order === 'alphabet') {
    const base = wholeToneOnly ? wholeTonesAlpha : (accidental === 'sharps' ? alphaNotesSharp : alphaNotesFlat);
    if (byString && stringIdx !== undefined) {
      const openNote = notes[stringIdx][0];
      const startIdx = base.findIndex(n => notesMatch(n, openNote));
      if (startIdx > 0) return [...base.slice(startIdx), ...base.slice(0, startIdx)];
    }
    return base;
  }
  const base = wholeToneOnly ? wholeTonesFifths : (accidental === 'sharps' ? cofNotesSharp : cofNotesFlat);
  if (byString && stringIdx !== undefined) {
    const openNote = notes[stringIdx][0];
    const startIdx = base.findIndex(n => notesMatch(n, openNote));
    if (startIdx > 0) return [...base.slice(startIdx), ...base.slice(0, startIdx)];
  }
  return base;
}

export function displayNote(note: string, mode: AccidentalMode): string {
  if (mode === 'flats') return sharpToFlat[note] || note;
  if (mode === 'sharps') return flatToSharp[note] || note;
  return note;
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

export function getValidFrets(stringIdx: number, fromFret: number, toFret: number, wholeToneOnly: boolean): number[] {
  const valid: number[] = [];
  for (let f = fromFret; f <= toFret; f++) {
    if (!wholeToneOnly || wholeTones.includes(notes[stringIdx][f])) valid.push(f);
  }
  return valid.length > 0 ? valid : [fromFret];
}
