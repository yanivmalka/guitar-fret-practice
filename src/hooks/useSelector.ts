import { useState, useMemo } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { AccidentalMode, OrderMode } from '../utils/music';

// ── Types ────────────────────────────────────────────────────────────────

export type Difficulty = 'dots' | 'naturals' | 'full';

export interface SelectorState {
  selectedStrings: number[];
  multiMode: boolean;
  mode: 'byNote' | 'byFret';
  lowerActive: boolean;
  upperActive: boolean;
  difficulty: Difficulty;
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

export function historyKey(state: SelectorState): string {
  const strings = [...state.selectedStrings].sort((a, b) => a - b).join(',');
  const fret = `${state.lowerActive ? '0' : '12'}-${state.upperActive ? '21' : '12'}`;
  const mode = state.mode;
  const diff = state.difficulty;
  return `${strings}|${fret}|${mode}|${diff}`;
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

// ── Hook ─────────────────────────────────────────────────────────────────

export function useSelector() {
  const [selectedStrings, setSelectedStrings] = useState<number[]>(
    () => loadSetting('sel_strings', [6])
  );
  const [multiMode, setMultiMode] = useState<boolean>(
    () => loadSetting('sel_multi', false)
  );
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

  // ── Setters with persistence ───────────────────────────────────────

  const onStringSelect = (stringNum: number) => {
    if (!multiMode) {
      const next = [stringNum];
      setSelectedStrings(next);
      saveSetting('sel_strings', next);
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
        saveSetting('sel_strings', next);
        return next;
      });
    }
  };

  const onMultiToggle = () => {
    setMultiMode(prev => {
      const next = !prev;
      saveSetting('sel_multi', next);
      if (next) {
        // Turning on multi: select ALL strings
        const all = [1, 2, 3, 4, 5, 6];
        setSelectedStrings(all);
        saveSetting('sel_strings', all);
      } else {
        // Turning off multi: keep only the last-selected string
        const last = selectedStrings[selectedStrings.length - 1];
        const kept = [last];
        setSelectedStrings(kept);
        saveSetting('sel_strings', kept);
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

  // ── Selector state object ──────────────────────────────────────────

  const state: SelectorState = {
    selectedStrings,
    multiMode,
    mode,
    lowerActive,
    upperActive,
    difficulty,
  };

  // ── Derived settings ───────────────────────────────────────────────

  const derivedSettings: DerivedSettings = useMemo(() => {
    const guitarString = Math.max(...selectedStrings);
    const multiStrings = (multiMode && selectedStrings.length > 1)
      ? selectedStrings
      : [];
    const fretFrom = lowerActive ? 0 : 12;
    const fretTo = upperActive ? 21 : 12;
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
  }, [selectedStrings, multiMode, mode, lowerActive, upperActive, difficulty]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    state,
    onStringSelect,
    onMultiToggle,
    onModeSelect,
    onFretRangeToggle,
    onDifficultySelect,
    derivedSettings,
    historyKey: () => historyKey(state),
  };
}
