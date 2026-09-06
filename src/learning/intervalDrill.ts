// ── intervalDrill.ts — build the DrillConfig for an interval session ─────
//
// P4 first vertical slice. Pure: given the learner's interval SRS map and the
// instrument, it emits a plain `DrillConfig` with an `interval` spec set, so
// the session runs through the EXISTING `useDrillSession` / engine (no new
// runner). It picks nothing about individual questions — the engine's interval
// branch does that — it only decides which interval qualities are in play and
// the plain drill envelope (window / count / timer / form).

import type { DrillConfig } from '../drill/DrillConfig';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { SrsMap } from './srs';
import { dueItems } from './srs';
import { ALL_INTERVAL_SEMITONES, type IntervalForm } from '../utils/intervals';
import { parseIntervalItemId } from './intervalItem';

export interface IntervalDrillOptions {
  /** The interval SRS map for this instrument (`InstrumentLearningState.intervalSrs`). */
  intervalSrs: SrsMap;
  now: number;
  maxFret: number;
  /** All drillable string numbers (1..stringCount). */
  allStrings: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  form: IntervalForm;
  /** Distinct questions the drill asks. Default 12. */
  questionCount?: number;
  /** Base per-question seconds. Default 7. */
  timeLimit?: number;
  /** Upper fret for the reference/target window. Default min(12, maxFret). */
  fretTo?: number;
}

const DEFAULT_QUESTION_COUNT = 12;
const DEFAULT_TIME = 7;
const DEFAULT_FRET_TO = 12;

/**
 * Build the interval-session `DrillConfig`. Overdue interval qualities are
 * listed first so the engine leans on what is due, but every quality stays in
 * the pool so a session is never narrowed to one interval.
 */
export function buildIntervalDrill(opts: IntervalDrillOptions): DrillConfig {
  const {
    intervalSrs, now, maxFret, allStrings, accidental, order, form,
    questionCount = DEFAULT_QUESTION_COUNT,
    timeLimit = DEFAULT_TIME,
  } = opts;

  const fretTo = Math.max(3, Math.min(opts.fretTo ?? DEFAULT_FRET_TO, maxFret));

  const due = dueItems(intervalSrs, now)
    .map((it) => parseIntervalItemId(it.itemId))
    .filter((n): n is number => n != null);
  const rest = ALL_INTERVAL_SEMITONES.filter((s) => !due.includes(s));
  const semitones = [...due, ...rest];

  const strings = allStrings.length > 0 ? [...allStrings] : [1];

  return {
    strings,
    primaryString: strings[0],
    isMulti: strings.length > 1,
    // on-neck → by-note answer surface (tap the fret); by-name → by-fret
    // surface (tap the note on the circle).
    mode: form === 'onNeck' ? 'byNote' : 'byFret',
    fretFrom: 0,
    fretTo,
    wholeToneOnly: false,
    dotsOnly: false,
    questionCount,
    timeLimit,
    accidental,
    order,
    interval: { semitones, direction: 'up', form },
  };
}
