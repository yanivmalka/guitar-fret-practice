// ── intervals.ts — interval music theory for the interval drill ─────────
//
// Pure, no React, no storage. The one place that knows how an interval maps
// to a distance in semitones, to a target note name, and (for the Future neck
// extension) to target positions on the neck. `useGameEngine`'s interval
// branch and `src/learning/intervalDrill.ts` / `intervalPlanner.ts` build on
// this; nothing here imports any of them.
//
// The MVP drills two exercises (intervals-learning-spec §8) — *identify the
// interval* and *find the target note* — in both directions.
// `noteNameAtSemitones` is sign-safe, so a descending question just passes a
// negative offset. Compound intervals and key-aware enharmonic spelling stay
// later refinements.

import { notesMatch } from './music';
import { CHROMATIC } from './instruments';

/** An ascending interval quality, m2 … M7. */
export interface IntervalDef {
  /** Ascending distance in semitones, 1 (m2) … 11 (M7). This is also the
   *  identity the SRS schedule keys on — see `src/learning/intervalItem.ts`. */
  semitones: number;
  /** Compact label, e.g. `'M3'`, `'P5'`, `'TT'`. */
  short: string;
  /** English name; doubles as the i18n lookup key (see `translations.ts`). */
  nameKey: string;
}

export const INTERVALS: readonly IntervalDef[] = [
  { semitones: 1, short: 'm2', nameKey: 'Minor 2nd' },
  { semitones: 2, short: 'M2', nameKey: 'Major 2nd' },
  { semitones: 3, short: 'm3', nameKey: 'Minor 3rd' },
  { semitones: 4, short: 'M3', nameKey: 'Major 3rd' },
  { semitones: 5, short: 'P4', nameKey: 'Perfect 4th' },
  { semitones: 6, short: 'TT', nameKey: 'Tritone' },
  { semitones: 7, short: 'P5', nameKey: 'Perfect 5th' },
  { semitones: 8, short: 'm6', nameKey: 'Minor 6th' },
  { semitones: 9, short: 'M6', nameKey: 'Major 6th' },
  { semitones: 10, short: 'm7', nameKey: 'Minor 7th' },
  { semitones: 11, short: 'M7', nameKey: 'Major 7th' },
] as const;

const BY_SEMITONES = new Map(INTERVALS.map((i) => [i.semitones, i]));

/** All interval sizes this slice drills, ascending. */
export const ALL_INTERVAL_SEMITONES: readonly number[] = INTERVALS.map((i) => i.semitones);

export function intervalBySemitones(semitones: number): IntervalDef | undefined {
  return BY_SEMITONES.get(semitones);
}

/** The three named interval difficulty tiers (intervals-learning-spec §9.2).
 *  Defined here — the pure interval-theory leaf module — so both
 *  `src/learning/intervalDrill.ts` (which owns the `intervalDifficulty`
 *  function) and `src/hooks/useIntervalSelector.ts` can name it without a
 *  learning→hooks import cycle. `focused` / `full` are Selector-only; the
 *  guided planner always runs `mixed` (§13.1 / §13.5). */
export type IntervalDifficulty = 'focused' | 'mixed' | 'full';

/** Which interval exercise a question runs (intervals-learning-spec §8.1 /
 *  §5.1, plus the §8.5 "find on the neck" extension). The first two answer by
 *  picking from a chip row; `findTargetPosition` answers on the neck. */
export type IntervalExercise =
  /** "Which interval did you hear?" — the app plays two notes in sequence;
   *  the learner picks the interval quality from a chip row. */
  | 'identifyInterval'
  /** "M3 above G" — the app shows a first note + interval + direction; the
   *  learner picks the target note from a chip row. */
  | 'findTargetNote'
  /** "M3 above the marked note" — the app names the string and interval and
   *  marks one note on the neck; the learner taps the note that completes the
   *  interval on that string (any octave-equivalent position is accepted). */
  | 'findTargetPosition';

/** The optional interval question spec a `DrillConfig` / `GameSettings` may
 *  carry. Absent ⇒ the engine behaves exactly as it did before intervals. */
export interface IntervalDrillSpec {
  /** Interval sizes (semitones) the drill may ask, in preference order. */
  semitones: number[];
  /** Ascending, descending, or a per-question random mix (§5.3). */
  direction: 'up' | 'down' | 'both';
  /** Which exercise the session runs (§8.1). */
  exercise: IntervalExercise;
  /** How many answer chips to offer. The §9 difficulty tiers set this;
   *  the engine falls back to a fixed 4 when it is absent. */
  optionCount?: number;
  /** First-note bias for the reference note (§9.1). `'naturals'` → the engine
   *  prefers a natural (no ♯/♭) first note when the window allows; `'any'` →
   *  no preference. Absent ⇒ `'any'`. `focused` sets `'naturals'`. */
  firstNoteBias?: 'naturals' | 'any';
  /** Register spread the reference note is drawn from (§9.1, matters for
   *  *identify the interval*'s two-note playback). Absent ⇒ `'wide'`.
   *  `focused` narrows it, `full` opens it fully. */
  registerSpread?: 'narrow' | 'medium' | 'wide';
  /** How the answer-chip distractors relate to the correct answer (§9.2).
   *  `'avoidNear'` (focused) keeps every distractor ≥ 2 semitones from the
   *  answer; `'allNear'` (full) forces the nearest neighbours in; `'default'`
   *  (mixed) only completes `confuserPairs`. Absent ⇒ `'default'`. */
  optionPolicy?: 'avoidNear' | 'default' | 'allNear';
  /** Confuser pairs (semitone sizes) the answer chips must complete: when the
   *  correct answer is one member and the other is a real interval, the other
   *  is forced among the options (§9.2, mixed/full). Absent ⇒ none. */
  confuserPairs?: readonly (readonly [number, number])[];
}

/** Distractor-shaping rules for the two chip-row builders below — the runtime
 *  form of an `IntervalDrillSpec`'s `optionPolicy` + `confuserPairs` for one
 *  question whose correct answer size is known. */
export interface IntervalOptionRules {
  /** Keep every distractor ≥ 2 semitones from the answer (focused, §9.2). */
  avoidNear?: boolean;
  /** Force the answer's nearest neighbours (answer ± 1, in 1..11) in (full). */
  forceNear?: boolean;
  /** When the answer is a member of one of these pairs, force the other
   *  member in (mixed/full confuser completion). */
  pairs?: readonly (readonly [number, number])[];
}

/** The semitone sizes forced in by `rules` for a question whose answer is
 *  `answer` — the nearest neighbours (`forceNear`) and the other half of any
 *  confuser pair the answer belongs to (`pairs`). In 1..11, excludes `answer`. */
function forcedSizes(answer: number, rules?: IntervalOptionRules): number[] {
  if (!rules) return [];
  const out = new Set<number>();
  if (rules.forceNear) {
    for (const s of [answer - 1, answer + 1]) if (s >= 1 && s <= 11) out.add(s);
  }
  for (const [a, b] of rules.pairs ?? []) {
    if (a === answer && b >= 1 && b <= 11) out.add(b);
    if (b === answer && a >= 1 && a <= 11) out.add(a);
  }
  out.delete(answer);
  return [...out];
}

/** Fisher–Yates copy — pure given `Math.random`, like the engine's own
 *  question pickers. */
function shuffled<T>(xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The answer-chip semitone set for an *identify the interval* question:
 * `answer` plus distinct distractors, `count` chips total, order randomised.
 * Forced sizes (nearest neighbours / confuser-pair partners — §9.2) come in
 * first, then `pool` (the drilled qualities), then all 11 so the row is always
 * full even for a one-quality pool. With `rules.avoidNear` (focused) every
 * *filler* distractor stays ≥ 2 semitones from the answer, but the row is
 * still padded to `count` from the near sizes as a last resort.
 */
export function buildIntervalOptionSemitones(
  answer: number,
  pool: readonly number[],
  count: number,
  rules?: IntervalOptionRules,
): number[] {
  const want = Math.max(2, Math.round(count));
  const chips = new Set<number>([answer]);
  const isNear = (s: number) => Math.abs(s - answer) <= 1;

  for (const s of forcedSizes(answer, rules)) {
    if (chips.size >= want) break;
    chips.add(s);
  }
  const far = (s: number) => s >= 1 && s <= 11 && !(rules?.avoidNear && isNear(s));
  for (const s of shuffled(pool)) {
    if (chips.size >= want) break;
    if (far(s)) chips.add(s);
  }
  for (const s of shuffled(ALL_INTERVAL_SEMITONES)) {
    if (chips.size >= want) break;
    if (far(s)) chips.add(s);
  }
  // Last-resort padding (only bites near a difficulty edge, e.g. avoidNear with
  // a huge `count`): fill from anything so the row is never short.
  for (const s of shuffled(ALL_INTERVAL_SEMITONES)) {
    if (chips.size >= want) break;
    chips.add(s);
  }
  return shuffled([...chips]);
}

/**
 * The answer-chip note set for a *find the target note* question: the correct
 * `target` plus distinct distractors, `count` chips total, order randomised.
 * Distractors are other plausible interval targets from the same first note
 * (`first ± poolSemitones`), topped up with random pitch classes. Names are
 * sharp-spelled; the caller formats them for display.
 *
 * `answerSemitones` (the size behind `target`) and `rules` apply the §9.2
 * shaping: forced near / confuser-pair sizes are turned into their target
 * notes and added first; with `rules.avoidNear` every *pool* distractor whose
 * size is within 1 semitone of the answer is skipped.
 */
export function buildTargetNoteOptions(
  first: string,
  target: string,
  poolSemitones: readonly number[],
  direction: 1 | -1,
  count: number,
  rules?: IntervalOptionRules,
  answerSemitones?: number,
): string[] {
  const want = Math.max(2, Math.round(count));
  const chips = new Set<string>([target]);

  if (answerSemitones != null) {
    for (const s of forcedSizes(answerSemitones, rules)) {
      if (chips.size >= want) break;
      chips.add(noteNameAtSemitones(first, direction * s));
    }
  }
  const skipNear = (s: number) =>
    rules?.avoidNear && answerSemitones != null && Math.abs(s - answerSemitones) <= 1;
  for (const s of shuffled(poolSemitones)) {
    if (chips.size >= want) break;
    if (!skipNear(s)) chips.add(noteNameAtSemitones(first, direction * s));
  }
  for (const n of shuffled(CHROMATIC)) {
    if (chips.size >= want) break;
    chips.add(n);
  }
  return shuffled([...chips]);
}

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

function pitchClassIndex(noteName: string): number {
  const i = CHROMATIC.indexOf(noteName);
  if (i >= 0) return i;
  return CHROMATIC.indexOf(FLAT_TO_SHARP[noteName] ?? noteName);
}

/**
 * The sharp-spelled note name `semitones` above `rootName` (octave-equivalent).
 * Returns `rootName` unchanged if it is not a recognised pitch class.
 */
export function noteNameAtSemitones(rootName: string, semitones: number): string {
  const idx = pitchClassIndex(rootName);
  if (idx < 0) return rootName;
  const step = ((semitones % 12) + 12) % 12;
  return CHROMATIC[(idx + step) % 12];
}

export interface NeckPos {
  /** 1-based string number. */
  string: number;
  /** Fret number, 0 = open. */
  fret: number;
}

/** Absolute MIDI pitch of a fretted position, given the instrument's open
 *  strings. */
export function positionMidi(pos: NeckPos, openMidi: readonly number[]): number {
  return (openMidi[pos.string - 1] ?? 0) + pos.fret;
}

/** Signed semitone distance from `a` to `b` (positive = `b` is higher). */
export function semitonesBetween(
  a: NeckPos,
  b: NeckPos,
  openMidi: readonly number[],
): number {
  return positionMidi(b, openMidi) - positionMidi(a, openMidi);
}

export interface FretWindow {
  /** 1-based string numbers in scope. */
  strings: number[];
  fretFrom: number;
  fretTo: number;
}

/**
 * Every position inside `window` whose note name is exactly `semitones` above
 * the note at `refPos` — octave-equivalent, matching how the by-note flow
 * already accepts any fret of the asked note. `noteTable` is the active
 * `[string-1][fret] -> name` table (`InstrumentConfig.notes`).
 */
export function targetPositionsForInterval(
  refPos: NeckPos,
  semitones: number,
  noteTable: readonly (readonly string[])[],
  window: FretWindow,
): NeckPos[] {
  const rootName = noteTable[refPos.string - 1]?.[refPos.fret];
  if (!rootName) return [];
  const targetName = noteNameAtSemitones(rootName, semitones);
  const out: NeckPos[] = [];
  for (const s of window.strings) {
    const row = noteTable[s - 1];
    if (!row) continue;
    for (let f = Math.max(0, window.fretFrom); f <= window.fretTo; f++) {
      if (f >= row.length) break;
      if (notesMatch(row[f], targetName)) out.push({ string: s, fret: f });
    }
  }
  return out;
}
