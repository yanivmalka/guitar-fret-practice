// ── The drill layer's seam between Practice and (later) Game ───────────────
//
// Architectural target:  Practice → DrillSession ← Game
//
// A `DrillConfig` is everything the drill engine needs to run one drill: which
// strings and frets it may ask about, whether it asks byFret or byNote, how
// many questions, and the base per-question time. It deliberately does NOT
// carry any Practice UI/selector concept (halves vs. precise window,
// difficulty labels, Auto Advance, stage sequence, history scoping). Practice
// turns its `DerivedSettings` into a `DrillConfig` via `deriveDrillConfig`;
// a future Game will build one straight from a stage definition.
//
// `SessionResult` is the tidy shape of what the system already knows the
// moment a drill finishes — no new metrics.

import type { AccidentalMode, OrderMode, HistoryEntry } from '../utils/music';
import type { DerivedSettings } from '../hooks/useSelector';
import type { SessionScore } from '../hooks/useScoring';
import type { GameSettings } from '../hooks/useGameEngine';
import type { DrillPosition } from './candidates';
import type { IntervalDrillSpec } from '../utils/intervals';

export type { DrillPosition };
export type { IntervalDrillSpec };

export interface DrillConfig {
  /** Strings the drill may ask about (1-based). A single entry means a
   *  single-string drill; more than one means the drill rotates between them
   *  question to question (multi-string mode). */
  strings: number[];
  /** The string shown/selected while the drill is not multi-string. Also the
   *  string the engine falls back to for a non-multi drill. */
  primaryString: number;
  /** True when `strings` holds more than one string and the drill should
   *  rotate between them. */
  isMulti: boolean;
  /** byFret: a fret is shown, answer with the note. byNote: a note is shown,
   *  answer by tapping every matching fret. */
  mode: 'byFret' | 'byNote';
  fretFrom: number;
  fretTo: number;
  /** Naturals-only drill (Practice difficulty === 'naturals'). */
  wholeToneOnly: boolean;
  /** Marker-fret-only drill (Practice difficulty === 'dots'). */
  dotsOnly: boolean;
  /** How many questions this drill asks before it completes. */
  questionCount: number;
  /** Base per-question time limit in seconds, before the run-length timing
   *  ramp in useScoring compresses it. */
  timeLimit: number;
  accidental: AccidentalMode;
  order: OrderMode;
  /** Optional explicit question pool. When present (and non-empty), the engine
   *  asks *only* about these positions and ignores `fretFrom`/`fretTo`/
   *  `wholeToneOnly`/`dotsOnly` for pool selection — `strings`/`primaryString`/
   *  `isMulti` still decide which string a question lands on. When absent, the
   *  engine behaves exactly as it did before candidate sets existed. Practice
   *  never sets this; it is the seam a future Game builds a stage on. */
  candidates?: DrillPosition[];
  /** Optional interval question spec (P4). When present the engine asks
   *  interval questions ("what is a 5th above G", or "tap a M6 above this
   *  fret") on the by-fret / by-note answer surface named by `spec.form`,
   *  instead of plain note questions. Absent ⇒ unchanged behaviour. Practice
   *  and the notes-only Teacher never set this. */
  interval?: IntervalDrillSpec;
}

export interface SessionResult {
  score: number;
  /** 0–100, whole number: correct answers over recorded answers. Matches the
   *  accuracy Practice already computes for its personal-best record. */
  accuracy: number;
  longestStreak: number;
  questionsAnswered: number;
  questionsCorrect: number;
  /** The drill's target question count (`DrillConfig.questionCount`). */
  questionCount: number;
}

// Practice adapter: DerivedSettings (from useSelector) → DrillConfig. This is
// the only place that knows both shapes. `primaryString`, `accidental` and
// `order` come from App state rather than DerivedSettings, matching exactly
// what App passed straight into useGameEngine before this seam existed.
export function deriveDrillConfig(
  ds: DerivedSettings,
  opts: { primaryString: number; accidental: AccidentalMode; order: OrderMode },
): DrillConfig {
  const isMulti = ds.multiStrings.length > 0;
  return {
    strings: isMulti ? ds.multiStrings : [opts.primaryString],
    primaryString: opts.primaryString,
    isMulti,
    mode: ds.byNote ? 'byNote' : 'byFret',
    fretFrom: ds.fretFrom,
    fretTo: ds.fretTo,
    wholeToneOnly: ds.wholeToneOnly,
    dotsOnly: ds.dotsOnly,
    questionCount: ds.maxQuestions,
    timeLimit: ds.time,
    accidental: opts.accidental,
    order: opts.order,
  };
}

// DrillConfig → the (unchanged) useGameEngine `settings` shape. Kept next to
// the config so the field-by-field mapping stays in one place.
export function drillConfigToGameSettings(config: DrillConfig): GameSettings {
  return {
    guitarString: config.primaryString,
    fretFrom: config.fretFrom,
    fretTo: config.fretTo,
    wholeToneOnly: config.wholeToneOnly,
    dotsOnly: config.dotsOnly,
    byNote: config.mode === 'byNote',
    isMulti: config.isMulti,
    activeStrings: config.strings,
    time: config.timeLimit,
    accidental: config.accidental,
    order: config.order,
    candidates: config.candidates,
    interval: config.interval,
  };
}

// The finished-drill snapshot, from the session score + this drill's recorded
// history. Same accuracy formula Practice uses at game end.
export function computeSessionResult(
  session: SessionScore,
  history: HistoryEntry[],
  questionCount: number,
): SessionResult {
  const total = history.length;
  const questionsCorrect = history.filter((h) => h.correct === true).length;
  const accuracy = total === 0 ? 0 : Math.round((questionsCorrect / total) * 100);
  return {
    score: session.score,
    accuracy,
    longestStreak: session.longestStreak,
    questionsAnswered: session.questionsAnswered,
    questionsCorrect,
    questionCount,
  };
}
