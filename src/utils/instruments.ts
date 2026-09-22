import { GUITAR_NOTES, GUITAR_DOT_FRETS } from './music';
import type { SampleRegion } from './ukuleleSamples';
import { UKULELE_SAMPLES } from './ukuleleSamples';

// Everything in the app that differs between guitar and bass lives here. The
// hooks read the *active* config (App.tsx applies it via setActiveInstrument +
// setAudioInstrument); nothing else should hardcode string counts, tuning,
// fret counts or sample URLs.

export type InstrumentId = 'guitar' | 'bass' | 'mandolin' | 'banjo' | 'ukulele';

// Guitar-only: acoustic vs electric. Doesn't touch tuning, string count or
// fret positions (same notes either way) — the only thing it changes is
// which sample library the notes are played from, plus the string/fret
// defaults seeded for it. Kept off InstrumentVariants.bass/mandolin/etc —
// this axis only exists for guitar.
export type GuitarType = 'acoustic' | 'electric';

// Per-instrument string/fret (or named-type) selection, on top of which
// instrument is active. Guitar and bass are independent string-count ×
// fret-count axes; mandolin is fret-count only; ukulele and banjo are each a
// single named-package picker (see the market-research comments by each
// variant table below for why). `UkuleleSize` is declared further down,
// next to the spec table it names.
export interface InstrumentVariants {
  guitar: { strings: number; frets: number; type: GuitarType };
  bass: { strings: number; frets: number };
  mandolin: { frets: number };
  ukulele: { size: UkuleleSize };
  banjo: { key: string };
}

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
  synth?: 'mandolin' | 'ukuleleBaritone';
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

const ACOUSTIC_GUITAR_SOUNDFONT = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/';
const ELECTRIC_GUITAR_SOUNDFONT = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_guitar_clean-mp3/';
const BASS_SOUNDFONT = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3/';

// Same string/fret variant matrix for both guitar types — acoustic vs
// electric doesn't change what commercial string/fret combinations exist,
// only the sample library each note is played from.
const GUITAR_SOUNDFONT_BY_TYPE: Record<GuitarType, string> = {
  acoustic: ACOUSTIC_GUITAR_SOUNDFONT,
  electric: ELECTRIC_GUITAR_SOUNDFONT,
};

export const GUITAR_VARIANTS_BY_TYPE: Record<GuitarType, InstrumentConfig[]> = {
  acoustic: GUITAR_VARIANT_SPECS.map((s) =>
    buildVariant('guitar', 'Guitar', '🎸', GUITAR_SOUNDFONT_BY_TYPE.acoustic, s)
  ),
  electric: GUITAR_VARIANT_SPECS.map((s) =>
    buildVariant('guitar', 'Guitar', '🎸', GUITAR_SOUNDFONT_BY_TYPE.electric, s)
  ),
};
// Back-compat: the acoustic pool is what `GUITAR_VARIANTS` always meant
// before the acoustic/electric selector existed.
export const GUITAR_VARIANTS: InstrumentConfig[] = GUITAR_VARIANTS_BY_TYPE.acoustic;

export const BASS_VARIANTS: InstrumentConfig[] = BASS_VARIANT_SPECS.map((s) =>
  buildVariant('bass', 'Bass', '🎵', BASS_SOUNDFONT, s)
);

/** The two guitar types the picker offers, in display order. */
export function getAvailableGuitarTypes(): GuitarType[] {
  return ['acoustic', 'electric'];
}

/** Verified default — acoustic, unchanged behavior for anyone who never
 *  touches the new selector. */
export function getDefaultGuitarType(): GuitarType {
  return 'acoustic';
}

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
 *  `getAvailableFretCounts` results, but keeps this total).
 *
 *  `guitarType` only matters when `base === 'guitar'` — it picks which
 *  sample-library pool (acoustic/electric) the string+fret combo is read
 *  from; ignored for bass. Defaults to acoustic so existing callers that
 *  don't pass it keep resolving exactly as before this type existed. */
export function getInstrumentVariant(
  base: 'guitar' | 'bass',
  stringCount: number,
  fretCount: number,
  guitarType: GuitarType = 'acoustic',
): InstrumentConfig {
  const pool = base === 'guitar' ? GUITAR_VARIANTS_BY_TYPE[guitarType] : BASS_VARIANTS;
  const exact = pool.find((v) => v.stringCount === stringCount && v.maxFret === fretCount);
  if (exact) return exact;
  const specs = base === 'guitar' ? GUITAR_VARIANT_SPECS : BASS_VARIANT_SPECS;
  const fallbackSpec = specs.find((s) => s.isDefault) ?? specs[0];
  return pool.find((v) => v.variant?.stringCount === fallbackSpec.stringCount
    && v.variant?.fretCount === fallbackSpec.fretCount) ?? pool[0];
}

// ---------------------------------------------------------------------------
// Mandolin variants — fret count only. The mandolin market has no verified
// commercial cross-product of string counts (8-string / 4-course is
// effectively the only production configuration found in research); what
// varies is fret count. 4/5-string mandolins exist only as niche electric
// models with no confirmed multiple-fret-count commercial lineup, so they
// are NOT added here.
//
// Fret specifications verified against commercial models (Sep 2026 market
// research): 20 (budget/beginner, e.g. Hola! Music HM-3TS), 22 (modern
// standard A-style/F-hole, e.g. Kentucky KM-505), 24 (extended fingerboard
// range; no exact match at 24, but Eastman MD305 has 23 and Loar LM-500
// F-style has 29 with scoped fretboard — 24 is treated as a pragmatic
// intermediate tier consistent with guitar/bass conventions, not a confirmed
// single-source-verified production number).
// ---------------------------------------------------------------------------

interface MandolinVariantSpec {
  fretCount: number;
  isDefault?: boolean;
}

const MANDOLIN_VARIANT_SPECS: MandolinVariantSpec[] = [
  { fretCount: 20 },                  // budget/beginner models (e.g. Hola! Music HM-3TS)
  { fretCount: 22, isDefault: true }, // most common in modern A-style/F-hole (e.g. Kentucky KM-505)
  { fretCount: 24 },                  // extended fingerboard; no exact commercial match found (Eastman MD305 uses 23, Loar LM-500 F-style has 29 with scoped fretboard) but 24 represents this range, consistent with guitar/bass conventions
];

function buildMandolinVariant(fretCount: number): InstrumentConfig {
  return {
    id: 'mandolin',
    label: 'Mandolin',
    emoji: '🎻',
    stringCount: 8,
    notes: [
      buildRow('E', fretCount), buildRow('E', fretCount),
      buildRow('A', fretCount), buildRow('A', fretCount),
      buildRow('D', fretCount), buildRow('D', fretCount),
      buildRow('G', fretCount), buildRow('G', fretCount),
    ],
    openMidi: [76, 76, 69, 69, 62, 62, 55, 55],
    maxFret: fretCount,
    soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
    synth: 'mandolin',
    stringLabels: {
      1: 'String 1 · E', 2: 'String 2 · E',
      3: 'String 3 · A', 4: 'String 4 · A',
      5: 'String 5 · D', 6: 'String 6 · D',
      7: 'String 7 · G', 8: 'String 8 · G',
    },
    // Matches the existing single MANDOLIN config's dot convention exactly
    // ([3,5,7,9,12,15,17,20]), not the guitar/bass DOT_BASE table — a
    // mandolin's dots don't follow the same convention as guitar/bass.
    dotFrets: [3, 5, 7, 9, 12, 15, 17, 20, 22].filter((f) => f <= fretCount),
    variant: { stringCount: 8, fretCount },
  };
}

export const MANDOLIN_VARIANTS: InstrumentConfig[] = MANDOLIN_VARIANT_SPECS.map((s) =>
  buildMandolinVariant(s.fretCount)
);

export function getAvailableMandolinFretCounts(): number[] {
  return MANDOLIN_VARIANT_SPECS.map((s) => s.fretCount).sort((a, b) => a - b);
}

export function getMandolinVariant(fretCount: number): InstrumentConfig {
  return MANDOLIN_VARIANTS.find((v) => v.maxFret === fretCount)
    ?? MANDOLIN_VARIANTS.find((v) => v.variant?.fretCount
      === MANDOLIN_VARIANT_SPECS.find((s) => s.isDefault)?.fretCount)!;
}

/** The verified-default fret count (20 — most common) — used to seed the
 *  mandolin picker before the user has made a choice. */
export function getDefaultMandolinFretCount(): number {
  return (MANDOLIN_VARIANT_SPECS.find((s) => s.isDefault) ?? MANDOLIN_VARIANT_SPECS[0]).fretCount;
}

// ---------------------------------------------------------------------------
// Ukulele variants — soprano / concert / tenor / baritone. NOT a string-count
// × fret-count matrix: each named size is a fixed package (length + fret
// range + tuning), not independent axes — so this is a single "size" picker,
// not two pickers like guitar/bass.
//
// Soprano/concert/tenor share the standard reentrant G-C-E-A tuning and use
// the recorded FreePats samples (`sampleMap`), same as before. Concert/tenor
// are capped at 17 frets (not the real-world 15–20) because 17 is the
// documented outer edge of what that sample set was verified against (see
// the original UKULELE_MAX_FRET comment above). Soprano's real-world 12–15
// range is unaffected by the cap.
//
// Baritone uses a completely different, non-reentrant D-G-B-E tuning (like
// the top 4 guitar strings) whose open notes (down to D3) fall well below
// both that verified sample range AND below any free/CC0 sample library
// found anywhere (checked FreePats in full — its only ukulele bank is the
// one already used here for the reentrant sizes; there is no separate
// baritone patch). So — same situation and same fix as mandolin — baritone
// is synthesized in real time (`synth: 'ukuleleBaritone'`,
// see utils/audio.ts) instead of sampled.
// ---------------------------------------------------------------------------

const UKULELE_SAMPLE_VERIFIED_MAX_FRET = 17; // see comment above

export type UkuleleSize = 'soprano' | 'concert' | 'tenor' | 'baritone';

interface UkuleleVariantSpec {
  size: UkuleleSize;
  fretCount: number;
  isDefault?: boolean;
}

const UKULELE_VARIANT_SPECS: UkuleleVariantSpec[] = [
  { size: 'soprano', fretCount: 15, isDefault: true }, // most common/most popular size overall
  { size: 'concert', fretCount: UKULELE_SAMPLE_VERIFIED_MAX_FRET },
  { size: 'tenor', fretCount: UKULELE_SAMPLE_VERIFIED_MAX_FRET }, // 2nd most popular; favored by pros, not the majority
  { size: 'baritone', fretCount: 19 },
];

function buildUkuleleVariant(spec: UkuleleVariantSpec): InstrumentConfig {
  const fretCount = spec.fretCount;
  if (spec.size === 'baritone') {
    // D-G-B-E, low to high — same interval pattern as the top 4 guitar
    // strings, just its own tuning (not derived from GUITAR's rows).
    return {
      id: 'ukulele',
      label: 'Ukulele',
      emoji: '🎸',
      stringCount: 4,
      notes: [
        buildRow('E', fretCount), buildRow('B', fretCount),
        buildRow('G', fretCount), buildRow('D', fretCount),
      ],
      openMidi: [64, 59, 55, 50], // E4, B3, G3, D3
      maxFret: fretCount,
      soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/', // unused while synth is set; kept for type-completeness
      synth: 'ukuleleBaritone',
      stringLabels: {
        1: 'String 1 · E', 2: 'String 2 · B', 3: 'String 3 · G', 4: 'String 4 · low D',
      },
      dotFrets: dotsFor(fretCount), // guitar-family dot convention (same scale-length family as its D-G-B-E tuning)
      variant: { stringCount: 4, fretCount },
    };
  }
  return {
    id: 'ukulele',
    label: 'Ukulele',
    emoji: '🎸',
    stringCount: 4,
    notes: [
      buildRow('A', fretCount), buildRow('E', fretCount),
      buildRow('C', fretCount), buildRow('G', fretCount),
    ],
    openMidi: [69, 64, 60, 67],
    maxFret: fretCount,
    soundfontUrl: `${import.meta.env.BASE_URL}audio/ukulele/`,
    sampleMap: UKULELE_SAMPLES,
    stringLabels: {
      1: 'String 1 · A', 2: 'String 2 · E', 3: 'String 3 · C', 4: 'String 4 · G (high)',
    },
    dotFrets: [5, 7, 10, 12, 15, 17].filter((f) => f <= fretCount),
    variant: { stringCount: 4, fretCount },
  };
}

export const UKULELE_VARIANTS: InstrumentConfig[] = UKULELE_VARIANT_SPECS.map(buildUkuleleVariant);

export function getAvailableUkuleleSizes(): UkuleleSize[] {
  return UKULELE_VARIANT_SPECS.map((s) => s.size);
}

export function getUkuleleTuning(size: UkuleleSize): string {
  if (size === 'baritone') return 'D-G-B-E';
  return 'A-E-C-G';
}

export function getUkuleleVariant(size: UkuleleSize): InstrumentConfig {
  const idx = UKULELE_VARIANT_SPECS.findIndex((s) => s.size === size);
  return UKULELE_VARIANTS[idx] ?? UKULELE_VARIANTS[UKULELE_VARIANT_SPECS.findIndex((s) => s.isDefault)];
}

/** The verified-default size (tenor — preferred by professionals) — used to
 *  seed the ukulele picker before the user has made a choice. */
export function getDefaultUkuleleSize(): UkuleleSize {
  return (UKULELE_VARIANT_SPECS.find((s) => s.isDefault) ?? UKULELE_VARIANT_SPECS[0]).size;
}

// ---------------------------------------------------------------------------
// Banjo variants — named types, not independent string × fret axes. Each
// named type below is a verified fixed commercial package (string count +
// fret count + tuning together); combinations not listed (e.g. a 4-string
// with 22 frets tuned like tenor, or a 6-string with 19 frets) were not
// found as commercial products in research and are intentionally omitted.
// ---------------------------------------------------------------------------

interface BanjoVariantSpec {
  key: 'tenor17' | 'tenor19' | 'plectrum22' | 'standard22' | 'parlor19' | 'longneck25' | 'sixstring22' | 'sixstring24';
  label: string;
  stringCount: number;
  fretCount: number;
  tuningLowToHigh: string[]; // for the 4 "main" strings; 5th drone handled separately
  midiLowToHigh: number[];
  hasDrone5th?: boolean; // 5-string types: adds a short 5th string, fretted from fret 5 up
  isDefault?: boolean;
}

const BANJO_VARIANT_SPECS: BanjoVariantSpec[] = [
  { key: 'standard22', label: '5-String Standard', stringCount: 4, fretCount: 22,
    tuningLowToHigh: ['D','G','B','D'], midiLowToHigh: [50,55,59,62], hasDrone5th: true, isDefault: true },
  { key: 'parlor19', label: '5-String Parlor', stringCount: 4, fretCount: 19,
    tuningLowToHigh: ['D','G','B','D'], midiLowToHigh: [50,55,59,62], hasDrone5th: true },
  { key: 'longneck25', label: '5-String Long Neck', stringCount: 4, fretCount: 25,
    tuningLowToHigh: ['D','G','B','D'], midiLowToHigh: [50,55,59,62], hasDrone5th: true },
  { key: 'tenor17', label: '4-String Tenor (Irish, short scale)', stringCount: 4, fretCount: 17,
    tuningLowToHigh: ['C','G','D','A'], midiLowToHigh: [48,55,62,69] },
  { key: 'tenor19', label: '4-String Tenor', stringCount: 4, fretCount: 19,
    tuningLowToHigh: ['C','G','D','A'], midiLowToHigh: [48,55,62,69] },
  { key: 'plectrum22', label: '4-String Plectrum', stringCount: 4, fretCount: 22,
    tuningLowToHigh: ['C','G','B','D'], midiLowToHigh: [48,55,59,62] },
  { key: 'sixstring22', label: '6-String (Guitar-Banjo)', stringCount: 6, fretCount: 22,
    tuningLowToHigh: ['E','A','D','G','B','E'], midiLowToHigh: [40,45,50,55,59,64] },
  { key: 'sixstring24', label: '6-String (Guitar-Banjo)', stringCount: 6, fretCount: 24,
    tuningLowToHigh: ['E','A','D','G','B','E'], midiLowToHigh: [40,45,50,55,59,64] },
];

function buildBanjoVariant(spec: BanjoVariantSpec): InstrumentConfig {
  // Strings 1..N in high-to-low pitch order for the "main" strings, same
  // convention as every other instrument here. The short drone string (5th
  // strings only) is a real-world exception: it's numbered *last* (string
  // 5) despite being the highest-pitched string of all — that's the actual
  // physical numbering used on a banjo, and matches the existing single
  // BANJO config's own layout (see its 5-string block above) exactly.
  const highToLowTuning = [...spec.tuningLowToHigh].reverse();
  const highToLowMidi = [...spec.midiLowToHigh].reverse();
  const notes = highToLowTuning.map((n) => buildRow(n, spec.fretCount));
  const openMidi = [...highToLowMidi];
  const stringLabels: Record<number, string> = {};
  highToLowTuning.forEach((noteName, i) => {
    const stringNum = i + 1;
    const isLowest = stringNum === spec.stringCount;
    stringLabels[stringNum] = `String ${stringNum} · ${isLowest ? 'low ' : ''}${noteName}`;
  });

  let minFrets: number[] | undefined;
  let totalStringCount = spec.stringCount;
  if (spec.hasDrone5th) {
    notes.push(buildRow('G', spec.fretCount));
    openMidi.push(67); // G4
    totalStringCount = spec.stringCount + 1;
    stringLabels[totalStringCount] = `String ${totalStringCount} · high G (drone)`;
    minFrets = [...Array(spec.stringCount).fill(0), 5]; // drone only fretted from fret 5 up
  }

  return {
    id: 'banjo',
    label: 'Banjo',
    emoji: '🪕',
    stringCount: totalStringCount,
    notes,
    openMidi,
    maxFret: spec.fretCount,
    minFrets,
    soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/banjo-mp3/',
    stringLabels,
    // Matches the existing single BANJO config's dot convention exactly
    // ([5,7,10,12,15,17,19,22]) — a banjo's dots (10th fret, not 9th) don't
    // follow the guitar/bass DOT_BASE table.
    dotFrets: [5, 7, 10, 12, 15, 17, 19, 22, 24, 25].filter((f) => f <= spec.fretCount),
    variant: { stringCount: totalStringCount, fretCount: spec.fretCount },
  };
}

export const BANJO_VARIANTS: InstrumentConfig[] = BANJO_VARIANT_SPECS.map(buildBanjoVariant);

export function getAvailableBanjoTypes(): Array<{ key: string; label: string }> {
  return BANJO_VARIANT_SPECS.map((s) => ({ key: s.key, label: s.label }));
}

export function getBanjoVariant(key: string): InstrumentConfig {
  const idx = BANJO_VARIANT_SPECS.findIndex((s) => s.key === key);
  return BANJO_VARIANTS[idx] ?? BANJO_VARIANTS[BANJO_VARIANT_SPECS.findIndex((s) => s.isDefault)];
}

/** The verified-default type (5-String Standard — most common) — used to
 *  seed the banjo picker before the user has made a choice. */
export function getDefaultBanjoType(): string {
  return (BANJO_VARIANT_SPECS.find((s) => s.isDefault) ?? BANJO_VARIANT_SPECS[0]).key;
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
  soundfontUrl: ACOUSTIC_GUITAR_SOUNDFONT,
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
