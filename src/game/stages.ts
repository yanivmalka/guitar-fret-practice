// ── Game stages — the full 15-world / 139-stage curriculum ──────────────
//
// Source of truth: the finalised "Guitar Fret Practice — Game Curriculum".
// Every stage is one clear skill. A stage runs the *existing* drill engine
// through `useDrillSession(stage.drill, …)` — `stage.drill` is a plain
// `DrillConfig`, nothing here extends the engine.
//
// Conventions carried from the curriculum:
//   • `strings` uses the app's numbering: 6 = low E, 1 = high E.
//   • "naturals" → `wholeToneOnly: true`; "full" → full chromatic.
//   • `order: 'fifths'`, `accidental: 'sharps'` unless a stage is explicitly
//     about flat spelling.
//   • Each stage is a single mode (byFret OR byNote) — the engine cannot mix
//     the two inside one run.
//   • byFret and byNote are separate stages only where the curriculum asks
//     for both and each carries real learning value (reverse mapping,
//     tap-every-instance).
//
// Engine-limit adaptations (a stage that named a *relationship* between two
// positions, which the engine cannot ask directly, is rendered as a
// position-based drill via `candidates`; the concept lives in the title):
//   • World 2 §11  "E–F and B–C Have No Gap"  → name the E/F/B/C positions in
//     the open box (byFret); the no-semitone-gap idea is framing.
//   • World 3 §7 "The Sharps Only" / §11 "Tap the Sharp", World 10 §14
//     "Sharps — Name & Place" → the engine has no "accidentals only" filter
//     (only naturals-only), so the five sharps are pinned via `candidates`.
//   • World 6 (all) → exact dot frets via `candidates` rather than `dotsOnly`
//     (which would also pull in fret 0 and the 12–21 dots).
//   • World 7 (all) → octave / unison *relationships* become explicit
//     position-pair `candidates`. byFret stages (§1 fret 0 = fret 12, §6/§7
//     unison points) show one position and ask its name — the "=" is framing.
//     byNote stages (§2, §3, §4, §8) use the engine's "tap every matching
//     position in the set" so the player physically taps both ends of the
//     pair. §5 "Find Every Octave" needs no candidate set.
//   • World 13 §1 "It Repeats at Fret 12" → frets {0,3,5,12,15,17} via
//     `candidates`, byFret naming; the N = N+12 identity is framing.
//
// Titles/subtitles are i18n keys (`game.stage.<id>.title` / `.subtitle`),
// consistent with the world keys and the pre-existing seed. Wiring them into
// `src/i18n/translations.ts` is a separate pass — GameFlow renders the key
// string raw for now, by design.

import type { DrillConfig, Stage, StageTargets } from './models';
import type { DrillPosition } from '../drill/candidates';
import { GUITAR_NOTES, notesMatch } from '../utils/music';

// ── Star-target presets ────────────────────────────────────────────────
//
// Speed is expressed only through `DrillConfig.timeLimit`; the star tiers
// are `minAccuracy` (+ an optional `minLongestStreak` on 2★/3★) exactly as
// `StageGoal` allows — no new metric. Every preset is monotonic:
// oneStar.minAccuracy ≤ twoStar.minAccuracy ≤ threeStar.minAccuracy, and
// twoStar.minLongestStreak ≤ threeStar.minLongestStreak.
function targets(
  a1: number,
  a2: number,
  s2: number,
  a3: number,
  s3: number,
): StageTargets {
  return {
    oneStar: { minAccuracy: a1 },
    twoStar: { minAccuracy: a2, minLongestStreak: s2 },
    threeStar: { minAccuracy: a3, minLongestStreak: s3 },
  };
}

const INTRO = targets(60, 80, 6, 94, 9); // worlds 1–3: open position, forgiving
const STRING = targets(65, 82, 6, 95, 12); // worlds 4–5: one string end to end
const LANDMARK = targets(65, 82, 6, 94, 10); // worlds 6–7: dots, octaves, unisons
const BOX = targets(65, 83, 7, 95, 12); // worlds 8–9: position boxes
const EVERYWHERE = targets(60, 80, 5, 92, 8); // world 10: one note, tap-all
const ENSEMBLE = targets(65, 82, 7, 95, 12); // worlds 11–12: pairs & groups
const UPPER = targets(62, 80, 6, 93, 10); // world 13: above the 12th fret
const INTEGRATION = targets(65, 83, 8, 95, 14); // world 14: whole-neck recall
const GAUNTLET = targets(75, 88, 10, 97, 18); // world 15: mastery gates

// ── Candidate builders ────────────────────────────────────────────────
const ALL_STRINGS = [1, 2, 3, 4, 5, 6];
const SHARP_NAMES = ['C#', 'D#', 'F#', 'G#', 'A#'];

/** Every (string, fret) pair for the given strings × frets. */
function atFrets(strings: number[], frets: number[]): DrillPosition[] {
  return strings.flatMap((string) => frets.map((fret) => ({ string, fret })));
}

/** Every position on `strings` in [from, to] whose note matches one of
 *  `names` (enharmonic-aware via `notesMatch`). */
function notePositions(
  names: string[],
  strings: number[],
  from: number,
  to: number,
): DrillPosition[] {
  const out: DrillPosition[] = [];
  for (const string of strings) {
    const row = GUITAR_NOTES[string - 1];
    for (let fret = from; fret <= to && fret < row.length; fret++) {
      if (names.some((n) => notesMatch(row[fret], n))) out.push({ string, fret });
    }
  }
  return out;
}

/** Octave-shape pairs: for each `[lo, hi]` string pair and each fret f with
 *  f + shift ≤ 12, both `(lo, f)` and `(hi, f + shift)` — the two are the
 *  same note name one octave apart, so a byNote question asks the player to
 *  tap both. */
function octaveShapePairs(
  stringPairs: [number, number][],
  shift: number,
): DrillPosition[] {
  const out: DrillPosition[] = [];
  for (const [lo, hi] of stringPairs) {
    for (let f = 0; f + shift <= 12; f++) {
      out.push({ string: lo, fret: f }, { string: hi, fret: f + shift });
    }
  }
  return out;
}

// Fret 5 on a string == the next-higher open string (the tuning anchor),
// for every adjacent pair except G–B.
const UNISON_FRET5: DrillPosition[] = [
  { string: 6, fret: 5 }, { string: 5, fret: 0 },
  { string: 5, fret: 5 }, { string: 4, fret: 0 },
  { string: 4, fret: 5 }, { string: 3, fret: 0 },
  { string: 2, fret: 5 }, { string: 1, fret: 0 },
];
// The G–B unison sits at fret 4.
const UNISON_GB: DrillPosition[] = [
  { string: 3, fret: 4 }, { string: 2, fret: 0 },
];

// ── Stage builder ─────────────────────────────────────────────────────
interface Spec {
  strings: number[];
  mode: 'byFret' | 'byNote';
  /** Fret window. Ignored for question selection when `candidates` is set,
   *  but still recorded so the config is well-formed. */
  from: number;
  to: number;
  naturals?: boolean;
  flats?: boolean;
  candidates?: DrillPosition[];
  /** questionCount */ q: number;
  /** timeLimit (seconds) */ t: number;
  targets: StageTargets;
}

function makeStage(worldId: string, order: number, s: Spec): Stage {
  const id = `${worldId}-${order}`;
  const isMulti = s.strings.length > 1;
  const drill: DrillConfig = {
    strings: s.strings,
    primaryString: s.strings[0],
    isMulti,
    mode: s.mode,
    fretFrom: s.from,
    fretTo: s.to,
    wholeToneOnly: s.naturals ?? false,
    dotsOnly: false,
    questionCount: s.q,
    timeLimit: s.t,
    accidental: s.flats ? 'flats' : 'sharps',
    order: 'fifths',
  };
  if (s.candidates && s.candidates.length > 0) drill.candidates = s.candidates;
  return {
    id,
    worldId,
    order,
    titleKey: `game.stage.${id}.title`,
    subtitleKey: `game.stage.${id}.subtitle`,
    drill,
    targets: s.targets,
  };
}

/** Build one world's stages from bare specs, numbering `order` 1..N. */
function world(worldId: string, specs: Spec[]): Stage[] {
  return specs.map((s, i) => makeStage(worldId, i + 1, s));
}

// ── World 1 — Open Strings ─────────────────────────────────────────────
const OPEN_STRINGS = world('open-strings', [
  { strings: [6, 5], mode: 'byFret', from: 0, to: 0, candidates: atFrets([6, 5], [0]), q: 12, t: 8, targets: INTRO },
  { strings: [4, 3], mode: 'byFret', from: 0, to: 0, candidates: atFrets([4, 3], [0]), q: 12, t: 8, targets: INTRO },
  { strings: [2, 1], mode: 'byFret', from: 0, to: 0, candidates: atFrets([2, 1], [0]), q: 12, t: 8, targets: INTRO },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 0, candidates: atFrets(ALL_STRINGS, [0]), q: 13, t: 8, targets: INTRO },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 0, candidates: atFrets(ALL_STRINGS, [0]), q: 13, t: 9, targets: INTRO },
]);

// ── World 2 — Open Position: Natural Notes ─────────────────────────────
const OPEN_NATURALS = world('open-position-naturals', [
  { strings: [6], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [5], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [4], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [3], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [2], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [1], mode: 'byFret', from: 0, to: 4, naturals: true, q: 14, t: 7, targets: INTRO },
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 4, naturals: true, q: 16, t: 7, targets: INTRO },
  { strings: [3, 2, 1], mode: 'byFret', from: 0, to: 4, naturals: true, q: 16, t: 7, targets: INTRO },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, naturals: true, q: 16, t: 7, targets: INTRO },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 4, naturals: true, q: 16, t: 8, targets: INTRO },
  // §11 "E–F and B–C Have No Gap" — concept via candidates.
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, candidates: notePositions(['E', 'F', 'B', 'C'], ALL_STRINGS, 0, 4), q: 16, t: 7, targets: INTRO },
]);

// ── World 3 — Open Position: The Sharps ────────────────────────────────
const OPEN_SHARPS = world('open-position-sharps', [
  { strings: [6], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  { strings: [5], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  { strings: [4], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  { strings: [3], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  { strings: [2], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  { strings: [1], mode: 'byFret', from: 0, to: 4, q: 14, t: 7, targets: INTRO },
  // §7 "The Sharps Only" — no "accidentals only" filter in the engine.
  { strings: ALL_STRINGS, mode: 'byFret', from: 1, to: 4, candidates: notePositions(SHARP_NAMES, ALL_STRINGS, 1, 4), q: 14, t: 6, targets: INTRO },
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 4, q: 16, t: 7, targets: INTRO },
  { strings: [3, 2, 1], mode: 'byFret', from: 0, to: 4, q: 16, t: 7, targets: INTRO },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, q: 16, t: 7, targets: INTRO },
  // §11 "Tap the Sharp" — sharps pinned via candidates.
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 4, candidates: notePositions(SHARP_NAMES, ALL_STRINGS, 0, 4), q: 16, t: 8, targets: INTRO },
  // §12 "Flat Spelling".
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, flats: true, q: 16, t: 7, targets: INTRO },
]);

// ── World 4 — Natural Notes Along Each String ──────────────────────────
const NATURALS_ALONG = world('naturals-along-string', [
  { strings: [6], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [5], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [4], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [3], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [2], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [1], mode: 'byFret', from: 0, to: 12, naturals: true, q: 15, t: 7, targets: STRING },
  { strings: [6, 1], mode: 'byFret', from: 0, to: 12, naturals: true, q: 16, t: 7, targets: STRING },
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 12, naturals: true, q: 18, t: 7, targets: STRING },
  { strings: [3, 2, 1], mode: 'byFret', from: 0, to: 12, naturals: true, q: 18, t: 7, targets: STRING },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, naturals: true, q: 18, t: 7, targets: STRING },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, naturals: true, q: 16, t: 8, targets: STRING },
]);

// ── World 5 — Full Chromatic Along Each String ─────────────────────────
const CHROMATIC_ALONG = world('chromatic-along-string', [
  { strings: [6], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [5], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [4], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [3], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [2], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [1], mode: 'byFret', from: 0, to: 12, q: 15, t: 6, targets: STRING },
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: STRING },
  { strings: [3, 2, 1], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: STRING },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: STRING },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, q: 16, t: 7, targets: STRING },
]);

// ── World 6 — Dot Landmarks ───────────────────────────────────────────
const DOT_LANDMARKS = world('dot-landmarks', [
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [3]), q: 12, t: 6, targets: LANDMARK },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [5]), q: 12, t: 6, targets: LANDMARK },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [7]), q: 12, t: 6, targets: LANDMARK },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [9]), q: 12, t: 6, targets: LANDMARK },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [3, 5, 7, 9]), q: 16, t: 6, targets: LANDMARK },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [3, 5, 7, 9]), q: 14, t: 7, targets: LANDMARK },
]);

// ── World 7 — Octaves & Unisons ───────────────────────────────────────
const OCTAVES_UNISONS = world('octaves-unisons', [
  // §1 fret 0 = fret 12 (byFret naming; the "=" is framing).
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [0, 12]), q: 14, t: 6, targets: LANDMARK },
  // §2 tap both octaves.
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, candidates: atFrets(ALL_STRINGS, [0, 12]), q: 14, t: 7, targets: LANDMARK },
  // §3 octave shape — bass strings (6&4, 5&3, +2 frets).
  { strings: [3, 4, 5, 6], mode: 'byNote', from: 0, to: 12, candidates: octaveShapePairs([[6, 4], [5, 3]], 2), q: 16, t: 7, targets: LANDMARK },
  // §4 octave shape — treble strings (4&2, 3&1, +3 frets, crosses G–B).
  { strings: [1, 2, 3, 4], mode: 'byNote', from: 0, to: 12, candidates: octaveShapePairs([[4, 2], [3, 1]], 3), q: 16, t: 7, targets: LANDMARK },
  // §5 find every octave — no candidate set.
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, q: 16, t: 8, targets: LANDMARK },
  // §6 unison — fret 5 = next open string.
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 5, candidates: UNISON_FRET5, q: 14, t: 6, targets: LANDMARK },
  // §7 unison — the G–B exception (fret 4).
  { strings: [2, 3], mode: 'byFret', from: 0, to: 4, candidates: UNISON_GB, q: 12, t: 6, targets: LANDMARK },
  // §8 unison sweep.
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 5, candidates: [...UNISON_FRET5, ...UNISON_GB], q: 14, t: 7, targets: LANDMARK },
]);

// ── World 8 — Position Boxes: Lower Neck ───────────────────────────────
const BOXES_LOWER = world('position-boxes-lower', [
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 4, q: 16, t: 7, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 2, to: 5, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 2, to: 5, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 4, to: 7, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 4, to: 7, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 5, to: 8, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 5, to: 8, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byNote', from: 5, to: 8, q: 16, t: 7, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 8, q: 18, t: 6, targets: BOX },
]);

// ── World 9 — Position Boxes: Middle Neck ──────────────────────────────
const BOXES_MIDDLE = world('position-boxes-middle', [
  { strings: ALL_STRINGS, mode: 'byFret', from: 7, to: 10, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 7, to: 10, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byNote', from: 7, to: 10, q: 16, t: 7, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 9, to: 12, naturals: true, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 9, to: 12, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 8, to: 12, q: 16, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 7, to: 12, q: 18, t: 6, targets: BOX },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: BOX },
]);

// ── World 10 — One Note Everywhere ────────────────────────────────────
const oneNote = (name: string): Spec => ({
  strings: ALL_STRINGS,
  mode: 'byNote',
  from: 0,
  to: 12,
  candidates: notePositions([name], ALL_STRINGS, 0, 12),
  q: 12,
  t: 8,
  targets: EVERYWHERE,
});
const ONE_NOTE_EVERYWHERE = world('one-note-everywhere', [
  oneNote('C'),
  oneNote('G'),
  oneNote('D'),
  oneNote('A'),
  oneNote('E'),
  oneNote('F'),
  oneNote('B'),
  oneNote('F#'),
  oneNote('C#'),
  oneNote('G#'),
  oneNote('D#'),
  oneNote('A#'),
  // §13 naturals — name & place (mixed prompts, no candidate set).
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, naturals: true, q: 16, t: 8, targets: EVERYWHERE },
  // §14 sharps — name & place.
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, candidates: notePositions(SHARP_NAMES, ALL_STRINGS, 0, 12), q: 16, t: 8, targets: EVERYWHERE },
]);

// ── World 11 — String Pairs ──────────────────────────────────────────
const STRING_PAIRS = world('string-pairs', [
  { strings: [6, 5], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [5, 4], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [4, 3], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [3, 2], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [2, 1], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [6, 4], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [5, 3], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [3, 1], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [3, 2], mode: 'byNote', from: 0, to: 12, q: 16, t: 7, targets: ENSEMBLE },
]);

// ── World 12 — String Groups ─────────────────────────────────────────
const STRING_GROUPS = world('string-groups', [
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [5, 4, 3], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [4, 3, 2], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [3, 2, 1], mode: 'byFret', from: 0, to: 12, q: 18, t: 6, targets: ENSEMBLE },
  { strings: [6, 5, 4], mode: 'byNote', from: 0, to: 12, q: 16, t: 7, targets: ENSEMBLE },
  { strings: [3, 2, 1], mode: 'byNote', from: 0, to: 12, q: 16, t: 7, targets: ENSEMBLE },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, naturals: true, q: 18, t: 6, targets: ENSEMBLE },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, q: 20, t: 6, targets: ENSEMBLE },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 12, q: 18, t: 7, targets: ENSEMBLE },
]);

// ── World 13 — The Upper Neck ────────────────────────────────────────
const UPPER_NECK = world('upper-neck', [
  // §1 "It Repeats at Fret 12" — concept via candidates (byFret naming).
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, candidates: atFrets(ALL_STRINGS, [0, 3, 5, 12, 15, 17]), q: 12, t: 7, targets: UPPER },
  { strings: [6], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: [5], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: [4], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: [3], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: [2], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: [1], mode: 'byFret', from: 12, to: 21, q: 15, t: 7, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byFret', from: 12, to: 15, q: 16, t: 6, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byFret', from: 15, to: 18, q: 16, t: 6, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byFret', from: 17, to: 21, q: 16, t: 6, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byFret', from: 12, to: 21, naturals: true, q: 18, t: 7, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byFret', from: 12, to: 21, q: 18, t: 7, targets: UPPER },
  { strings: ALL_STRINGS, mode: 'byNote', from: 12, to: 21, q: 16, t: 8, targets: UPPER },
]);

// ── World 14 — Whole-Neck Integration ────────────────────────────────
const WHOLE_NECK = world('whole-neck-integration', [
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, naturals: true, q: 20, t: 6, targets: INTEGRATION },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, q: 20, t: 6, targets: INTEGRATION },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 21, naturals: true, q: 18, t: 7, targets: INTEGRATION },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 21, q: 18, t: 7, targets: INTEGRATION },
  { strings: [6, 5, 4], mode: 'byFret', from: 0, to: 21, q: 20, t: 6, targets: INTEGRATION },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, flats: true, q: 20, t: 6, targets: INTEGRATION },
]);

// ── World 15 — Mastery Gauntlet ─────────────────────────────────────
const MASTERY_GAUNTLET = world('mastery-gauntlet', [
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 4, q: 20, t: 5, targets: GAUNTLET },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 12, q: 20, t: 5, targets: GAUNTLET },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, candidates: atFrets(ALL_STRINGS, [3, 5, 7, 9, 12, 15, 17, 19, 21]), q: 20, t: 5, targets: GAUNTLET },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 21, q: 20, t: 6, targets: GAUNTLET },
  { strings: ALL_STRINGS, mode: 'byFret', from: 0, to: 21, q: 28, t: 5, targets: GAUNTLET },
  { strings: ALL_STRINGS, mode: 'byNote', from: 0, to: 21, q: 28, t: 6, targets: GAUNTLET },
]);

export const STAGES: Stage[] = [
  ...OPEN_STRINGS,
  ...OPEN_NATURALS,
  ...OPEN_SHARPS,
  ...NATURALS_ALONG,
  ...CHROMATIC_ALONG,
  ...DOT_LANDMARKS,
  ...OCTAVES_UNISONS,
  ...BOXES_LOWER,
  ...BOXES_MIDDLE,
  ...ONE_NOTE_EVERYWHERE,
  ...STRING_PAIRS,
  ...STRING_GROUPS,
  ...UPPER_NECK,
  ...WHOLE_NECK,
  ...MASTERY_GAUNTLET,
];
