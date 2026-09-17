import { GUITAR_NOTES, GUITAR_DOT_FRETS } from './music';
import type { SampleRegion } from './ukuleleSamples';
import { UKULELE_SAMPLES } from './ukuleleSamples';

// Everything in the app that differs between guitar and bass lives here. The
// hooks read the *active* config (App.tsx applies it via setActiveInstrument +
// setAudioInstrument); nothing else should hardcode string counts, tuning,
// fret counts or sample URLs.

export type InstrumentId = 'guitar' | 'bass' | 'mandolin' | 'banjo' | 'ukulele';

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
  /**
   * When set, this instrument's samples aren't one-exact-file-per-note —
   * each file covers a few neighbouring semitones and is pitch-corrected at
   * playback (see utils/ukuleleSamples.ts). `soundfontUrl` is still where
   * the files are fetched from; the file name per note comes from this map
   * instead of the note's own name.
   */
  sampleMap?: SampleRegion[];
  /**
   * Per-string lowest playable fret, parallel to `openMidi` (default 0 for
   * every entry a caller omits). For a real instrument where one string is
   * physically shorter than the rest — e.g. a 5-string banjo's short drone
   * string, only fretted from fret 5 up — this is how that's expressed:
   * frets below it are never asked as a question and show up disabled
   * (greyed, non-interactive) on the fretboard grid, the same visual
   * treatment already used for whole-tone/dots-only filtering.
   */
  minFrets?: number[];
  /**
   * Present only on guitar/bass — identifies which string-count/fret-count
   * variant this config is, so settings persistence and the picker UI can
   * round-trip the choice. Absent on the single-config instruments
   * (mandolin/banjo/ukulele) and on any instrument before variants existed.
   */
  variant?: { stringCount: number; fretCount: number };
}

// ---------------------------------------------------------------------------
// Guitar & bass variants — string-count/fret-count combinations verified
// against commercial/professional production models (Sep 2026 market
// research; see /areas/guitar-fret-practice.md for sourcing). Only
// combinations that actually exist as production instruments are listed —
// this is deliberately not the full cross-product of every string count
// against every fret count some *other* string count happens to use.
//
//   Guitar 6-string: 21 / 22 / 24   (Fender vintage / modern std / shred)
//   Guitar 7-string: 22 / 24        (Ibanez S7320 / S7420 etc.)
//   Guitar 8-string: 24 only        (Ibanez RG2228 and all commercial 8s)
//   Guitar 9-string: 24 only        (rare, e.g. Kiesel Aries 9)
//   Bass   4-string: 20 / 21 / 22 / 24
//   Bass   5-string: 20 / 22 / 24
//   Bass   6-string: 24 only        (no commercial <24-fret 6-string found)
// ---------------------------------------------------------------------------

interface VariantSpec {
  stringCount: number;
  fretCount: number;
  /** Open-string tuning, LOW to HIGH (opposite of `notes`/`openMidi` order,
   *  which is highest-string-first — converted below). */
  tuningLowToHigh: string[];
  midiLowToHigh: number[];
  isDefault?: boolean;
}

const GUITAR_VARIANT_SPECS: VariantSpec[] = [
  { stringCount: 6, fretCount: 21, tuningLowToHigh: ['E','A','D','G','B','E'], midiLowToHigh: [40,45,50,55,59,64] },
  { stringCount: 6, fretCount: 22, tuningLowToHigh: ['E','A','D','G','B','E'], midiLowToHigh: [40,45,50,55,59,64], isDefault: true },
  { stringCount: 6, fretCount: 24, tuningLowToHigh: ['E','A','D','G','B','E'], midiLowToHigh: [40,45,50,55,59,64] },
  { stringCount: 7, fretCount: 22, tuningLowToHigh: ['B','E','A','D','G','B','E'], midiLowToHigh: [35,40,45,50,55,59,64] },
  { stringCount: 7, fretCount: 24, tuningLowToHigh: ['B','E','A','D','G','B','E'], midiLowToHigh: [35,40,45,50,55,59,64], isDefault: true },
  { stringCount: 8, fretCount: 24, tuningLowToHigh: ['F#','B','E','A','D','G','B','E'], midiLowToHigh: [30,35,40,45,50,55,59,64], isDefault: true },
  { stringCount: 9, fretCount: 24, tuningLowToHigh: ['C#','F#','B','E','A','D','G','B','E'], midiLowToHigh: [25,30,35,40,45,50,55,59,64], isDefault: true },
];

const BASS_VARIANT_SPECS: VariantSpec[] = [
  { stringCount: 4, fretCount: 20, tuningLowToHigh: ['E','A','D','G'], midiLowToHigh: [28,33,38,43], isDefault: true },
  { stringCount: 4, fretCount: 21, tuningLowToHigh: ['E','A','D','G'], midiLowToHigh: [28,33,38,43] },
  { stringCount: 4, fretCount: 22, tuningLowToHigh: ['E','A','D','G'], midiLowToHigh: [28,33,38,43] },
  { stringCount: 4, fretCount: 24, tuningLowToHigh: ['E','A','D','G'], midiLowToHigh: [28,33,38,43] },
  { stringCount: 5, fretCount: 20, tuningLowToHigh: ['B','E','A','D','G'], midiLowToHigh: [23,28,33,38,43] },
  { stringCount: 5, fretCount: 22, tuningLowToHigh: ['B','E','A','D','G'], midiLowToHigh: [23,28,33,38,43] },
  { stringCount: 5, fretCount: 24, tuningLowToHigh: ['B','E','A','D','G'], midiLowToHigh: [23,28,33,38,43], isDefault: true },
  { stringCount: 6, fretCount: 24, tuningLowToHigh: ['B','E','A','D','G','C'], midiLowToHigh: [23,28,33,38,43,48], isDefault: true },
];

// Standard fretboard-dot positions, filtered to whatever's ≤ the variant's
// fret count — same convention BASS already used inline below.
const DOT_BASE = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
function dotsFor(fretCount: number): number[] {
  return DOT_BASE.filter((f) => f <= fretCount);
}

const NOTE_NAMES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
function ordinal(n: number): string {
  return NOTE_NAMES[n - 1] ?? `${n}th`;
}

function buildVariant(
  id: 'guitar' | 'bass',
  label: string,
  emoji: string,
  soundfontUrl: string,
  spec: VariantSpec,
): InstrumentConfig {
  const highToLowTuning = [...spec.tuningLowToHigh].reverse();
  const highToLowMidi = [...spec.midiLowToHigh].reverse();
  const notes = highToLowTuning.map((n) => buildRow(n, spec.fretCount));
  const stringLabels: Record<number, string> = {};
  highToLowTuning.forEach((noteName, i) => {
    const stringNum = i + 1;
    const isLast = stringNum === spec.stringCount;
    stringLabels[stringNum] = `String ${stringNum} · ${isLast ? 'low ' : ''}${noteName}`;
  });
  return {
    id,
    label,
    emoji,
    stringCount: spec.stringCount,
    notes,
    openMidi: highToLowMidi,
    maxFret: spec.fretCount,
    soundfontUrl,
    stringLabels,
    dotFrets: dotsFor(spec.fretCount),
    variant: { stringCount: spec.stringCount, fretCount: spec.fretCount },
  };
}

const GUITAR_SOUNDFONT = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/';
const BASS_SOUNDFONT = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3/';

export const GUITAR_VARIANTS: InstrumentConfig[] = GUITAR_VARIANT_SPECS.map((s) =>
  buildVariant('guitar', 'Guitar', '🎸', GUITAR_SOUNDFONT, s)
);
export const BASS_VARIANTS: InstrumentConfig[] = BASS_VARIANT_SPECS.map((s) =>
  buildVariant('bass', 'Bass', '🎵', BASS_SOUNDFONT, s)
);

/** String-count options available for a base instrument, ascending. */
export function getAvailableStringCounts(base: 'guitar' | 'bass'): number[] {
  const specs = base === 'guitar' ? GUITAR_VARIANT_SPECS : BASS_VARIANT_SPECS;
  return [...new Set(specs.map((s) => s.stringCount))].sort((a, b) => a - b);
}

/** Fret-count options available for a base instrument + a given string
 *  count, ascending. Empty array if that string count doesn't exist. */
export function getAvailableFretCounts(base: 'guitar' | 'bass', stringCount: number): number[] {
  const specs = base === 'guitar' ? GUITAR_VARIANT_SPECS : BASS_VARIANT_SPECS;
  return specs.filter((s) => s.stringCount === stringCount).map((s) => s.fretCount).sort((a, b) => a - b);
}

/** The single verified-default variant for a string count (e.g. 22 frets
 *  for a 6-string guitar) — used when the user switches string count and
 *  their previously-chosen fret count no longer applies to it. */
export function getDefaultFretCount(base: 'guitar' | 'bass', stringCount: number): number {
  const specs = base === 'guitar' ? GUITAR_VARIANT_SPECS : BASS_VARIANT_SPECS;
  const forCount = specs.filter((s) => s.stringCount === stringCount);
  return (forCount.find((s) => s.isDefault) ?? forCount[0])?.fretCount ?? forCount[0]?.fretCount;
}

/** Look up a built guitar/bass variant config by string+fret count. Falls
 *  back to that base instrument's default variant if the exact combination
 *  isn't one of the verified ones (should not happen if the UI only offers
 *  `getAvailableFretCounts` results, but keeps this total). */
export function getInstrumentVariant(
  base: 'guitar' | 'bass',
  stringCount: number,
  fretCount: number,
): InstrumentConfig {
  const pool = base === 'guitar' ? GUITAR_VARIANTS : BASS_VARIANTS;
  const exact = pool.find((v) => v.stringCount === stringCount && v.maxFret === fretCount);
  if (exact) return exact;
  const specs = base === 'guitar' ? GUITAR_VARIANT_SPECS : BASS_VARIANT_SPECS;
  const fallbackSpec = specs.find((s) => s.isDefault) ?? specs[0];
  return pool.find((v) => v.variant?.stringCount === fallbackSpec.stringCount
    && v.variant?.fretCount === fallbackSpec.fretCount) ?? pool[0];
}

// Default configs — unchanged from before variants existed, so every caller
// that isn't variant-aware yet keeps working exactly as it did.
const GUITAR: InstrumentConfig = {
  id: 'guitar',
  label: 'Guitar',
  emoji: '🎸',
  stringCount: 6,
  notes: GUITAR_NOTES,
  openMidi: [64, 59, 55, 50, 45, 40],
  maxFret: 21,
  soundfontUrl: GUITAR_SOUNDFONT,
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
  soundfontUrl: BASS_SOUNDFONT,
  stringLabels: {
    1: 'String 1 · G', 2: 'String 2 · D',
    3: 'String 3 · A', 4: 'String 4 · low E',
  },
  dotFrets: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
};

// Mandolin — 8 strings (4 paired courses), tuned G D A E — ascending by
// fifths from the lowest course (G3) to the highest (E5), same interval
// pattern as a violin but pitched an octave down. (An earlier version of
// this had the octaves wrong — descending like a bass instead of ascending
// like a mandolin actually is — fixed here.)
// Each course is typically played in unison, so we represent it as 8 separate
// strings for the fretboard but players think in terms of 4 pairs.
//
// No properly-licensed sampled mandolin exists in any free soundfont set
// (checked FluidR3_GM, VCSL, University of Iowa, FreePats, sfzinstruments.io,
// Flame Studios, and both of hilbricht.net's curated FOSS-instrument lists —
// none have one; General MIDI itself has no dedicated mandolin instrument).
// `synth: 'mandolin'` routes playback through the real-time synthesizer in
// utils/audio.ts instead of fetching samples; `soundfontUrl` below is unused
// while that flag is set but kept for type-completeness / a future fallback.
const MANDOLIN_MAX_FRET = 20;
const MANDOLIN: InstrumentConfig = {
  id: 'mandolin',
  label: 'Mandolin',
  emoji: '🎻',
  stringCount: 8,
  notes: [
    buildRow('E', MANDOLIN_MAX_FRET),
    buildRow('E', MANDOLIN_MAX_FRET),
    buildRow('A', MANDOLIN_MAX_FRET),
    buildRow('A', MANDOLIN_MAX_FRET),
    buildRow('D', MANDOLIN_MAX_FRET),
    buildRow('D', MANDOLIN_MAX_FRET),
    buildRow('G', MANDOLIN_MAX_FRET),
    buildRow('G', MANDOLIN_MAX_FRET),
  ],
  openMidi: [76, 76, 69, 69, 62, 62, 55, 55], // E5 pairs, A4 pairs, D4 pairs, G3 pairs
  maxFret: MANDOLIN_MAX_FRET,
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
  synth: 'mandolin',
  stringLabels: {
    1: 'String 1 · E', 2: 'String 2 · E',
    3: 'String 3 · A', 4: 'String 4 · A',
    5: 'String 5 · D', 6: 'String 6 · D',
    7: 'String 7 · G', 8: 'String 8 · G',
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
  minFrets: [0, 0, 0, 0, 5], // 5th string is the short drone — no fret below 5
  soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
  stringLabels: {
    1: 'String 1 · D', 2: 'String 2 · B', 3: 'String 3 · G',
    4: 'String 4 · low D', 5: 'String 5 · high G (drone)',
  },
  dotFrets: [5, 7, 10, 12, 15, 17, 19, 22],
};

// Ukulele — 4 strings, standard reentrant tuning A E C G (string 1 = A,
// thinnest/highest; string 4 = G, the "reentrant" string — physically
// labelled 4 but tuned HIGHER than strings 2/3, which is what makes it
// reentrant rather than a plain descending run like a guitar's strings).
//
// Real recorded samples from the FreePats project (CC0, see
// public/audio/ukulele/CREDIT.txt) — 13 notes spanning C4–C6, each covering
// a few neighbouring semitones via `sampleMap` (utils/ukuleleSamples.ts).
// maxFret is capped at 17 so every fretted note on every string stays
// inside that C4–C6 sample range with zero extrapolation (checked: the
// highest note this produces is the A string at fret 17 = MIDI 86, exactly
// the top edge of the last mapped sample).
const UKULELE_MAX_FRET = 17;
const UKULELE: InstrumentConfig = {
  id: 'ukulele',
  label: 'Ukulele',
  emoji: '🎸',
  stringCount: 4,
  notes: [
    buildRow('A', UKULELE_MAX_FRET), // 1st string
    buildRow('E', UKULELE_MAX_FRET), // 2nd string
    buildRow('C', UKULELE_MAX_FRET), // 3rd string
    buildRow('G', UKULELE_MAX_FRET), // 4th string (reentrant — higher than 2nd/3rd)
  ],
  openMidi: [69, 64, 60, 67], // A4, E4, C4, G4
  maxFret: UKULELE_MAX_FRET,
  soundfontUrl: `${import.meta.env.BASE_URL}audio/ukulele/`,
  sampleMap: UKULELE_SAMPLES,
  stringLabels: {
    1: 'String 1 · A', 2: 'String 2 · E', 3: 'String 3 · C', 4: 'String 4 · G (high)',
  },
  dotFrets: [5, 7, 10, 12, 15, 17],
};

export const INSTRUMENTS: Record<InstrumentId, InstrumentConfig> = {
  guitar: GUITAR,
  bass: BASS,
  mandolin: MANDOLIN,
  banjo: BANJO,
  ukulele: UKULELE,
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

export const COMING_SOON_INSTRUMENTS: readonly ComingSoonInstrument[] = [];
