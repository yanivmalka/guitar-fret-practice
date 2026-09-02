import type { InstrumentConfig } from './instruments';
import type { Difficulty, SelectorState } from '../hooks/useSelector';

// ── The ordered stage curriculum ─────────────────────────────────────────
//
// Rebuilds the progression that the pre-selector `stages.ts` / `buildAllStages`
// used to define, expressed as concrete Selector states. Auto Advance walks
// this list in order, one entry per completed stage, so the autoplay button
// marches through the whole fretboard the way the old 86-stage linear nav did.
//
// Order (outer → inner), matching the old `buildAllStages`:
//   1. fret half:      lower (0–12) then upper (12–max)
//   2. string:         highest number (lowest pitch) down to 1
//   3. config:         dots/byFret, dots/byNote, naturals/byFret,
//                      naturals/byNote, full/byFret, full/byNote
//   …then adjacent string-pair stages (full chromatic, byFret then byNote,
//   per fret half), then the whole-neck stages (all strings, full chromatic,
//   byFret then byNote).

export interface StageStep {
  selectedStrings: number[];
  multiMode: boolean;
  mode: 'byNote' | 'byFret';
  lowerActive: boolean;
  upperActive: boolean;
  difficulty: Difficulty;
  /** Uppercase label for the stage-transition banner. */
  label: string;
}

const MID_FRET = 12;

// Same order as the old stages.ts CONFIGS array.
const CONFIGS: { difficulty: Difficulty; mode: 'byNote' | 'byFret' }[] = [
  { difficulty: 'dots', mode: 'byFret' },
  { difficulty: 'dots', mode: 'byNote' },
  { difficulty: 'naturals', mode: 'byFret' },
  { difficulty: 'naturals', mode: 'byNote' },
  { difficulty: 'full', mode: 'byFret' },
  { difficulty: 'full', mode: 'byNote' },
];

const HALVES: { lowerActive: boolean; upperActive: boolean }[] = [
  { lowerActive: true, upperActive: false },
  { lowerActive: false, upperActive: true },
];

function rangeLabel(lowerActive: boolean, upperActive: boolean, maxFret: number): string {
  if (lowerActive && upperActive) return `0-${maxFret}`;
  return lowerActive ? `0-${MID_FRET}` : `${MID_FRET}-${maxFret}`;
}

export function buildStageSequence(instrument: InstrumentConfig): StageStep[] {
  const steps: StageStep[] = [];
  // Highest string number (lowest pitch) down to 1, e.g. [6,5,4,3,2,1].
  const strings = Array.from({ length: instrument.stringCount }, (_, i) => instrument.stringCount - i);

  // Single-string stages.
  for (const half of HALVES) {
    for (const str of strings) {
      for (const c of CONFIGS) {
        steps.push({
          selectedStrings: [str],
          multiMode: false,
          mode: c.mode,
          lowerActive: half.lowerActive,
          upperActive: half.upperActive,
          difficulty: c.difficulty,
          label: `STRING ${str} · ${rangeLabel(half.lowerActive, half.upperActive, instrument.maxFret)} · ${c.difficulty.toUpperCase()}`,
        });
      }
    }
  }

  // Adjacent string pairs: [6,5], [4,3], [2,1] … full chromatic, byFret then byNote.
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < strings.length; i += 2) pairs.push([strings[i], strings[i + 1]]);
  for (const half of HALVES) {
    for (const [a, b] of pairs) {
      for (const mode of ['byFret', 'byNote'] as const) {
        steps.push({
          selectedStrings: [a, b],
          multiMode: true,
          mode,
          lowerActive: half.lowerActive,
          upperActive: half.upperActive,
          difficulty: 'full',
          label: `STRINGS ${a}+${b} · ${rangeLabel(half.lowerActive, half.upperActive, instrument.maxFret)} · FULL`,
        });
      }
    }
  }

  // Whole neck: every string, full chromatic, byFret then byNote.
  for (const mode of ['byFret', 'byNote'] as const) {
    steps.push({
      selectedStrings: [...strings].sort((x, y) => x - y),
      multiMode: true,
      mode,
      lowerActive: true,
      upperActive: true,
      difficulty: 'full',
      label: `ALL STRINGS · 0-${instrument.maxFret} · FULL`,
    });
  }

  return steps;
}

function stringsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

/** Index of the sequence entry matching the current selector state, or -1. */
export function stageStepIndex(seq: StageStep[], state: SelectorState): number {
  return seq.findIndex(s =>
    s.multiMode === state.multiMode &&
    s.mode === state.mode &&
    s.lowerActive === state.lowerActive &&
    s.upperActive === state.upperActive &&
    s.difficulty === state.difficulty &&
    stringsEqual(s.selectedStrings, state.selectedStrings),
  );
}

function bumpDifficulty(d: Difficulty): Difficulty | null {
  if (d === 'dots') return 'naturals';
  if (d === 'naturals') return 'full';
  return null;
}

/**
 * The stage to advance into after the current one completes, or null when
 * there is nothing further. For an on-sequence selection this is the next
 * curriculum entry; for a custom combo that isn't in the sequence it falls
 * back to the old difficulty-only bump (dots → naturals → full) so autoplay
 * still does something sensible.
 */
export function nextStageStep(seq: StageStep[], state: SelectorState): StageStep | null {
  const idx = stageStepIndex(seq, state);
  if (idx >= 0) return idx + 1 < seq.length ? seq[idx + 1] : null;

  const harder = bumpDifficulty(state.difficulty);
  if (!harder) return null;
  return {
    selectedStrings: state.selectedStrings,
    multiMode: state.multiMode,
    mode: state.mode,
    lowerActive: state.lowerActive,
    upperActive: state.upperActive,
    difficulty: harder,
    label: harder.toUpperCase(),
  };
}
