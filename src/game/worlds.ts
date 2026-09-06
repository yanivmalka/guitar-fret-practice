// ── Game worlds — the curriculum's 15 worlds ────────────────────────────
//
// The Game progression is 15 worlds / 139 stages (see `stages.ts`). It leans
// on the same shape Practice's Auto Advance walks — string 6 → 1, dots →
// naturals → full, lower half → upper half, single string → pairs → whole
// neck — but breaks every idea into its own single-skill stage and uses
// `DrillConfig.candidates` for any concept the half-based sequence cannot
// express (open-string groups, a single dot, octave / unison position pairs,
// "every X" maps, the N = N+12 identity).
//
// A `World` carries only identity, order and i18n keys. Unlock state and
// star totals are never stored here — they are derived from `GameProgress`
// (`src/utils/gameProgress.ts`).

import type { World } from './models';

export const WORLDS: World[] = [
  {
    id: 'open-strings',
    order: 1,
    titleKey: 'game.world.open-strings.title',
    descriptionKey: 'game.world.open-strings.description',
  },
  {
    id: 'open-position-naturals',
    order: 2,
    titleKey: 'game.world.open-position-naturals.title',
    descriptionKey: 'game.world.open-position-naturals.description',
  },
  {
    id: 'open-position-sharps',
    order: 3,
    titleKey: 'game.world.open-position-sharps.title',
    descriptionKey: 'game.world.open-position-sharps.description',
  },
  {
    id: 'naturals-along-string',
    order: 4,
    titleKey: 'game.world.naturals-along-string.title',
    descriptionKey: 'game.world.naturals-along-string.description',
  },
  {
    id: 'chromatic-along-string',
    order: 5,
    titleKey: 'game.world.chromatic-along-string.title',
    descriptionKey: 'game.world.chromatic-along-string.description',
  },
  {
    id: 'dot-landmarks',
    order: 6,
    titleKey: 'game.world.dot-landmarks.title',
    descriptionKey: 'game.world.dot-landmarks.description',
  },
  {
    id: 'octaves-unisons',
    order: 7,
    titleKey: 'game.world.octaves-unisons.title',
    descriptionKey: 'game.world.octaves-unisons.description',
  },
  {
    id: 'position-boxes-lower',
    order: 8,
    titleKey: 'game.world.position-boxes-lower.title',
    descriptionKey: 'game.world.position-boxes-lower.description',
  },
  {
    id: 'position-boxes-middle',
    order: 9,
    titleKey: 'game.world.position-boxes-middle.title',
    descriptionKey: 'game.world.position-boxes-middle.description',
  },
  {
    id: 'one-note-everywhere',
    order: 10,
    titleKey: 'game.world.one-note-everywhere.title',
    descriptionKey: 'game.world.one-note-everywhere.description',
  },
  {
    id: 'string-pairs',
    order: 11,
    titleKey: 'game.world.string-pairs.title',
    descriptionKey: 'game.world.string-pairs.description',
  },
  {
    id: 'string-groups',
    order: 12,
    titleKey: 'game.world.string-groups.title',
    descriptionKey: 'game.world.string-groups.description',
  },
  {
    id: 'upper-neck',
    order: 13,
    titleKey: 'game.world.upper-neck.title',
    descriptionKey: 'game.world.upper-neck.description',
  },
  {
    id: 'whole-neck-integration',
    order: 14,
    titleKey: 'game.world.whole-neck-integration.title',
    descriptionKey: 'game.world.whole-neck-integration.description',
  },
  {
    id: 'mastery-gauntlet',
    order: 15,
    titleKey: 'game.world.mastery-gauntlet.title',
    descriptionKey: 'game.world.mastery-gauntlet.description',
  },
];
