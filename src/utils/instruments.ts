import { GUITAR_NOTES, GUITAR_DOT_FRETS } from './music';

// Everything in the app that differs between guitar and bass lives here. The
// hooks read the *active* config (App.tsx applies it via setActiveInstrument +
// setAudioInstrument); nothing else should hardcode string counts, tuning,
// fret counts or sample URLs.

export type InstrumentId = 'guitar' | 'bass';

const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Build one [fret] -> note-name row from an open-string note name.
function buildRow(openNote: string, maxFret: number): string[] {
  const start = CHROMATIC.indexOf(openNote);
  return Array.from({ length: maxFret + 1 }, (_, f) => CHROMATIC[(start + f) % 12]);
}

export interface InstrumentConfig {
  id: InstrumentId;
  label: string;
  emoji: string;
  stringCount: number;
  /** [stringIdx 0 = highest-pitched] [fret] -> note name */
  notes: string[][];
  /** MIDI note number of each open string, parallel to `notes` rows */
  openMidi: number[];
  maxFret: number;
  /** Soundfont directory (trailing slash) the note samples are fetched from */
  soundfontUrl: string;
  /** "String N · …" caption per 1-based string number */
  stringLabels: Record<number, string>;
  dotFrets: number[];
}

const GUITAR: InstrumentConfig = {
  id: 'guitar',
  label: 'Guitar',
  emoji: '🎸',
  stringCount: 6,
  notes: GUITAR_NOTES,
  openMidi: [64, 59, 55, 50, 45, 40],
  maxFret: 21,
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/',
  stringLabels: {
    1: 'String 1 · high E', 2: 'String 2 · B', 3: 'String 3 · G',
    4: 'String 4 · D', 5: 'String 5 · A', 6: 'String 6 · low E',
  },
  dotFrets: GUITAR_DOT_FRETS,
};

// Standard 4-string bass, tuned exactly one octave below guitar strings 6–3,
// so its note-name rows match the guitar's E/A/D/G strings. 24 frets is the
// common bass neck length.
const BASS_MAX_FRET = 24;
const BASS: InstrumentConfig = {
  id: 'bass',
  label: 'Bass',
  emoji: '🎵',
  stringCount: 4,
  notes: [
    buildRow('G', BASS_MAX_FRET),
    buildRow('D', BASS_MAX_FRET),
    buildRow('A', BASS_MAX_FRET),
    buildRow('E', BASS_MAX_FRET),
  ],
  openMidi: [43, 38, 33, 28], // G2, D2, A1, E1
  maxFret: BASS_MAX_FRET,
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3/',
  stringLabels: {
    1: 'String 1 · G', 2: 'String 2 · D',
    3: 'String 3 · A', 4: 'String 4 · low E',
  },
  dotFrets: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
};

export const INSTRUMENTS: Record<InstrumentId, InstrumentConfig> = {
  guitar: GUITAR,
  bass: BASS,
};

export function getInstrument(id: InstrumentId): InstrumentConfig {
  return INSTRUMENTS[id] ?? GUITAR;
}

// Fretted instruments on the roadmap but not yet playable — the engine has no
// tuning / sample support for them. Surfaced as disabled "coming soon" tiles in
// the instrument picker (admins only for now) so the plan is visible in-app
// without implying they work. Deliberately not part of `InstrumentId`: nothing
// can select or drill these.
export interface ComingSoonInstrument {
  label: string;
  emoji: string;
  /** Open-string tuning, highest string first — shown as the tile caption. */
  tuning: string;
}

export const COMING_SOON_INSTRUMENTS: readonly ComingSoonInstrument[] = [
  { label: 'Ukulele', emoji: '🎸', tuning: 'G C E A' },
  { label: 'Mandolin', emoji: '🎻', tuning: 'G D A E' },
  { label: 'Banjo', emoji: '🪕', tuning: 'G D G B D' },
];
