// ── Game stages — seed data ─────────────────────────────────────────────
//
// A minimal fixture that proves the `Stage` model composes: each entry
// carries a real `DrillConfig` (the Task 1/2 shape, runnable as-is through
// `useDrillSession`) and a `StageTargets`. This is NOT the real curriculum —
// the full stage content is out of scope for the model task.

import type { Stage } from './models';

export const STAGES: Stage[] = [
  {
    id: 'open-strings-1',
    worldId: 'open-strings',
    order: 1,
    titleKey: 'game.stage.open-strings-1.title',
    subtitleKey: 'game.stage.open-strings-1.subtitle',
    drill: {
      strings: [6],
      primaryString: 6,
      isMulti: false,
      mode: 'byFret',
      fretFrom: 0,
      fretTo: 12,
      wholeToneOnly: false,
      dotsOnly: true,
      questionCount: 15,
      timeLimit: 8,
      accidental: 'sharps',
      order: 'fifths',
    },
    targets: {
      oneStar: { minAccuracy: 60 },
      twoStar: { minAccuracy: 80 },
      threeStar: { minAccuracy: 95, minLongestStreak: 8 },
    },
  },
  {
    id: 'open-strings-2',
    worldId: 'open-strings',
    order: 2,
    titleKey: 'game.stage.open-strings-2.title',
    drill: {
      strings: [5],
      primaryString: 5,
      isMulti: false,
      mode: 'byNote',
      fretFrom: 0,
      fretTo: 12,
      wholeToneOnly: true,
      dotsOnly: false,
      questionCount: 20,
      timeLimit: 6,
      accidental: 'sharps',
      order: 'fifths',
    },
    targets: {
      oneStar: { minAccuracy: 70 },
      twoStar: { minAccuracy: 85, minLongestStreak: 6 },
      threeStar: { minAccuracy: 95, minLongestStreak: 12 },
    },
  },
];
