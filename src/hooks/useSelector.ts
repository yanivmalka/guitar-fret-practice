import { useState, useMemo, useEffect, useRef } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  buildStageSequence, stageStepIndex, nextStageStep, type StageStep,
} from '../utils/stageSequence';

// ── Types ────────────────────────────────────────────────────────────────

export type Difficulty = 'dots' | 'naturals' | 'full';

export interface SelectorState {
  selectedStrings: number[];
  multiMode: boolean;
  mode: 'byNote' | 'byFret';
  lowerActive: boolean;
  upperActive: boolean;
  difficulty: Difficulty;
  autoAdvance: boolean;
}

// Difficulty-only progression, kept as the fallback for when the current
// selection is a custom combo that isn't part of the ordered stage sequence.
// Returns the next step up, or null if already at the hardest difficulty.
export function nextDifficulty(difficulty: Difficulty): Difficulty | null {
  if (difficulty === 'dots') return 'naturals';
  if (difficulty === 'naturals') return 'full';
  return null;
}

export interface DerivedSettings {
  guitarString: number;
  multiStrings: number[];
  fretFrom: number;
  fretTo: number;
  byNote: boolean;
  dotsOnly: boolean;
  wholeToneOnly: boolean;
  time: number;
  maxQuestions: number;
  accidental: AccidentalMode;
  order: OrderMode;
}

// ── History key ──────────────────────────────────────────────────────────

// The instrument id prefixes every key so guitar and bass stats never mix.
// Guitar keeps its original (unprefixed) key shape for back-compat with
// history/personal-best records saved before bass existed.
export function historyKey(state: SelectorState, instrument: InstrumentConfig): string {
  const strings = [...state.selectedStrings].sort((a, b) => a - b).join(',');
  const upper = state.upperActive ? instrument.maxFret : 12;
  const fret = `${state.lowerActive ? '0' : '12'}-${upper}`;
  const mode = state.mode;
  const diff = state.difficulty;
  const base = `${strings}|${fret}|${mode}|${diff}`;
  return instrument.id === 'guitar' ? base : `${instrument.id}|${base}`;
}

// Per-instrument localStorage keys for the string picks (a guitar's "string 6"
// selection is meaningless on a 4-string bass).
const stringsKey = (id: string) => `sel_strings_${id}`;
const multiKey = (id: string) => `sel_multi_${id}`;

function loadStrings(instrument: InstrumentConfig): number[] {
  // Guitar migrates its pre-bass unprefixed `sel_strings` key on first read.
  const legacy = instrument.id === 'guitar'
    ? loadSetting<number[] | null>('sel_strings', null)
    : null;
  const fallback = legacy ?? [instrument.stringCount];
  const raw = loadSetting<number[]>(stringsKey(instrument.id), fallback);
  const valid = raw.filter(s => s >= 1 && s <= instrument.stringCount);
  return valid.length > 0 ? valid : [instrument.stringCount];
}

function loadMulti(instrument: InstrumentConfig): boolean {
  const legacy = instrument.id === 'guitar'
    ? loadSetting<boolean | null>('sel_multi', null)
    : null;
  return loadSetting<boolean>(multiKey(instrument.id), legacy ?? false);
}

// ── Time lookup ──────────────────────────────────────────────────────────

function getTime(difficulty: Difficulty, lowerActive: boolean, upperActive: boolean): number {
  const both = lowerActive && upperActive;
  const upperOnly = !lowerActive && upperActive;

  switch (difficulty) {
    case 'dots':
      return upperOnly ? 7 : 8;
    case 'naturals':
      return both ? 7 : 6;
    case 'full':
      return 5;
  }
}

function getMaxQuestions(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'dots': return 15;
    case 'naturals': return 20;
    case 'full': return 25;
  }
}

// Difficulty-only run length — the fallback when the current selection isn't
// part of the ordered stage sequence (a custom combo).
export function totalRunQuestions(difficulty: Difficulty, autoAdvance: boolean): number {
  if (!autoAdvance) return getMaxQuestions(difficulty);
  let total = 0;
  let d: Difficulty | null = difficulty;
  while (d) {
    total += getMaxQuestions(d);
    d = nextDifficulty(d);
  }
  return total;
}

// Total questions a run will ask. With Auto Advance on, that's every stage from
// the current position in the sequence through the last one; otherwise just
// this stage. Used to scale the continuous-run timing progression (useScoring).
function runQuestions(seq: StageStep[], state: SelectorState): number {
  if (!state.autoAdvance) return getMaxQuestions(state.difficulty);
  const idx = stageStepIndex(seq, state);
  if (idx < 0) return totalRunQuestions(state.difficulty, true);
  return seq.slice(idx).reduce((sum, s) => sum + getMaxQuestions(s.difficulty), 0);
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useSelector(instrument: InstrumentConfig) {
  const [selectedStrings, setSelectedStrings] = useState<number[]>(
    () => loadStrings(instrument)
  );
  const [multiMode, setMultiMode] = useState<boolean>(
    () => loadMulti(instrument)
  );

  // On instrument switch: reload that instrument's own string picks. The
  // effect only runs *after* this render, so `safeStrings` below also clamps
  // synchronously — otherwise the first render post-switch would index the new
  // (shorter) note table with an out-of-range string number and crash.
  const prevInstrumentRef = useRef(instrument.id);
  useEffect(() => {
    if (prevInstrumentRef.current === instrument.id) return;
    prevInstrumentRef.current = instrument.id;
    setSelectedStrings(loadStrings(instrument));
    setMultiMode(loadMulti(instrument));
  }, [instrument]);

  const safeStrings = (() => {
    const valid = selectedStrings.filter(s => s >= 1 && s <= instrument.stringCount);
    return valid.length > 0 ? valid : [instrument.stringCount];
  })();
  const [mode, setMode] = useState<'byNote' | 'byFret'>(
    () => loadSetting('sel_mode', 'byFret')
  );
  const [lowerActive, setLowerActive] = useState<boolean>(
    () => loadSetting('sel_lower', true)
  );
  const [upperActive, setUpperActive] = useState<boolean>(
    () => loadSetting('sel_upper', false)
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => loadSetting('sel_difficulty', 'dots')
  );
  const [autoAdvance, setAutoAdvance] = useState<boolean>(
    () => loadSetting('sel_autoAdvance', false)
  );

  // ── Setters with persistence ───────────────────────────────────────

  const sKey = stringsKey(instrument.id);
  const mKey = multiKey(instrument.id);

  const onStringSelect = (stringNum: number) => {
    if (!multiMode) {
      const next = [stringNum];
      setSelectedStrings(next);
      saveSetting(sKey, next);
    } else {
      setSelectedStrings(prev => {
        const idx = prev.indexOf(stringNum);
        let next: number[];
        if (idx >= 0) {
          // Remove it (toggle off)
          next = prev.filter(s => s !== stringNum);
          // If removing would empty the array, keep it
          if (next.length === 0) next = [stringNum];
        } else {
          next = [...prev, stringNum];
        }
        saveSetting(sKey, next);
        return next;
      });
    }
  };

  const onMultiToggle = () => {
    setMultiMode(prev => {
      const next = !prev;
      saveSetting(mKey, next);
      if (next) {
        // Turning on multi: select ALL of this instrument's strings
        const all = Array.from({ length: instrument.stringCount }, (_, i) => i + 1);
        setSelectedStrings(all);
        saveSetting(sKey, all);
      } else {
        // Turning off multi: keep only the last-selected string
        const last = selectedStrings[selectedStrings.length - 1];
        const kept = [last];
        setSelectedStrings(kept);
        saveSetting(sKey, kept);
      }
      return next;
    });
  };

  const onModeSelect = (m: 'byNote' | 'byFret') => {
    setMode(m);
    saveSetting('sel_mode', m);
  };

  const onFretRangeToggle = (half: 'lower' | 'upper') => {
    if (half === 'lower') {
      if (lowerActive && !upperActive) return; // can't deselect the only one
      const next = !lowerActive;
      setLowerActive(next);
      saveSetting('sel_lower', next);
    } else {
      if (upperActive && !lowerActive) return; // can't deselect the only one
      const next = !upperActive;
      setUpperActive(next);
      saveSetting('sel_upper', next);
    }
  };

  const onDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    saveSetting('sel_difficulty', diff);
  };

  const onAutoAdvanceToggle = () => {
    setAutoAdvance(prev => {
      const next = !prev;
      saveSetting('sel_autoAdvance', next);
      return next;
    });
  };

  // Apply a whole stage at once (used by Auto Advance to march through the
  // ordered curriculum). Every field is set and persisted together so the one
  // resulting re-render carries the complete next stage.
  const applyStage = (step: StageStep) => {
    setSelectedStrings(step.selectedStrings);
    saveSetting(sKey, step.selectedStrings);
    setMultiMode(step.multiMode);
    saveSetting(mKey, step.multiMode);
    setMode(step.mode);
    saveSetting('sel_mode', step.mode);
    setLowerActive(step.lowerActive);
    saveSetting('sel_lower', step.lowerActive);
    setUpperActive(step.upperActive);
    saveSetting('sel_upper', step.upperActive);
    setDifficulty(step.difficulty);
    saveSetting('sel_difficulty', step.difficulty);
  };

  // ── Selector state object ──────────────────────────────────────────

  const state: SelectorState = {
    selectedStrings: safeStrings,
    multiMode,
    mode,
    lowerActive,
    upperActive,
    difficulty,
    autoAdvance,
  };

  // The ordered stage curriculum for this instrument, and the stage Auto
  // Advance should move into after the current one completes (null at the end
  // of the sequence, or when the current selection is an off-sequence combo).
  const stageSequence = useMemo(() => buildStageSequence(instrument), [instrument]);
  const nextStage = (): StageStep | null => nextStageStep(stageSequence, state);
  const runQuestionCount = (): number => runQuestions(stageSequence, state);

  // ── Derived settings ───────────────────────────────────────────────

  const safeKey = safeStrings.join(',');
  const derivedSettings: DerivedSettings = useMemo(() => {
    const guitarString = Math.max(...safeStrings);
    // Multi-string drilling is free on every tier.
    const multiStrings = (multiMode && safeStrings.length > 1)
      ? safeStrings
      : [];
    const fretFrom = lowerActive ? 0 : 12;
    const fretTo = upperActive ? instrument.maxFret : 12;
    const byNote = mode === 'byNote';
    const dotsOnly = difficulty === 'dots';
    const wholeToneOnly = difficulty === 'naturals';
    const time = getTime(difficulty, lowerActive, upperActive);
    const maxQuestions = getMaxQuestions(difficulty);

    // Preserve existing user preferences for accidental and order
    const accidental: AccidentalMode = loadSetting('pref_accidental', 'sharps');
    const order: OrderMode = loadSetting('pref_order', 'fifths');

    return {
      guitarString,
      multiStrings,
      fretFrom,
      fretTo,
      byNote,
      dotsOnly,
      wholeToneOnly,
      time,
      maxQuestions,
      accidental,
      order,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeKey, multiMode, mode, lowerActive, upperActive, difficulty, instrument]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    state,
    onStringSelect,
    onMultiToggle,
    onModeSelect,
    onFretRangeToggle,
    onDifficultySelect,
    onAutoAdvanceToggle,
    applyStage,
    nextStage,
    runQuestionCount,
    derivedSettings,
    historyKey: () => historyKey(state, instrument),
  };
}
