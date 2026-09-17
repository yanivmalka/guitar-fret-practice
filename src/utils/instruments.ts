import { GUITAR_NOTES, GUITAR_DOT_FRETS } from './music';

// Everything in the app that differs between guitar and bass lives here. The
// hooks read the *active* config (App.tsx applies it via setActiveInstrument +
// setAudioInstrument); nothing else should hardcode string counts, tuning,
// fret counts or sample URLs.

export type InstrumentId = 'guitar' | 'bass' | 'mandolin' | 'banjo';

// The 12 pitch classes, sharp-spelled — the spelling every `notes` row uses.
// Exported so the interval layer (`src/utils/intervals.ts`) can do pitch-class
// math against the same table the drill renders from.
export const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

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
  /**
   * When set, notes are synthesized in real time (see utils/audio.ts) instead
   * of being fetched from `soundfontUrl` — for instruments with no properly
   * licensed sample library available. `soundfontUrl` is still required by
   * the type but is ignored at playback time.
   */
  synth?: 'mandolin';
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

// Mandolin — 8 strings (4 paired courses), tuned G D A E.
// Each course is typically played in unison, so we represent it as 8 separate
// strings for the fretboard but players think in terms of 4 pairs.
//
// No properly-licensed sampled mandolin exists in any free soundfont set
// (checked FluidR3_GM, VCSL, University of Iowa, FreePats — none have one;
// General MIDI itself has no dedicated mandolin instrument). `synth:
// 'mandolin'` routes playback through the real-time synthesizer in
// utils/audio.ts instead of fetching samples; `soundfontUrl` below is unused
// while that flag is set but kept for type-completeness / a future fallback.
const MANDOLIN_MAX_FRET = 20;
const MANDOLIN: InstrumentConfig = {
  id: 'mandolin',
  label: 'Mandolin',
  emoji: '🎻',
  stringCount: 8,
  notes: [
    buildRow('G', MANDOLIN_MAX_FRET),
    buildRow('G', MANDOLIN_MAX_FRET),
    buildRow('D', MANDOLIN_MAX_FRET),
    buildRow('D', MANDOLIN_MAX_FRET),
    buildRow('A', MANDOLIN_MAX_FRET),
    buildRow('A', MANDOLIN_MAX_FRET),
    buildRow('E', MANDOLIN_MAX_FRET),
    buildRow('E', MANDOLIN_MAX_FRET),
  ],
  openMidi: [55, 55, 50, 50, 45, 45, 40, 40], // G3 pairs, D3 pairs, A2 pairs, E2 pairs
  maxFret: MANDOLIN_MAX_FRET,
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
  synth: 'mandolin',
  stringLabels: {
    1: 'String 1 · G', 2: 'String 2 · G',
    3: 'String 3 · D', 4: 'String 4 · D',
    5: 'String 5 · A', 6: 'String 6 · A',
    7: 'String 7 · E', 8: 'String 8 · E',
  },
  dotFrets: [3, 5, 7, 9, 12, 15, 17, 20],
};

// 5-string banjo — standard open-G tuning (gDGBD). String 5 is the short
// "drone" string, real-world only fretted from fret 5 up; we simplify it to a
// full-range row like every other string here (same simplification style used
// for mandolin's paired courses) rather than modelling a restricted range.
const BANJO_MAX_FRET = 22;
const BANJO: InstrumentConfig = {
  id: 'banjo',
  label: 'Banjo',
  emoji: '🪕',
  stringCount: 5,
  notes: [
    buildRow('D', BANJO_MAX_FRET), // 1st string
    buildRow('B', BANJO_MAX_FRET), // 2nd string
    buildRow('G', BANJO_MAX_FRET), // 3rd string
    buildRow('D', BANJO_MAX_FRET), // 4th string (lowest)
    buildRow('G', BANJO_MAX_FRET), // 5th string (short drone, highest pitch)
  ],
  openMidi: [62, 59, 55, 50, 67], // D4, B3, G3, D3, G4
  maxFret: BANJO_MAX_FRET,
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
  stringLabels: {
    1: 'String 1 · D', 2: 'String 2 · B', 3: 'String 3 · G',
    4: 'String 4 · low D', 5: 'String 5 · high G (drone)',
  },
  dotFrets: [5, 7, 10, 12, 15, 17, 19, 22],
};

export const INSTRUMENTS: Record<InstrumentId, InstrumentConfig> = {
  guitar: GUITAR,
  bass: BASS,
  mandolin: MANDOLIN,
  banjo: BANJO,
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
];
