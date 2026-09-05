// ── Game worlds — seed data ─────────────────────────────────────────────
//
// A deliberately tiny starter list, just enough to exercise the `World`
// model. The real world set (and 20–30 real stages) is out of scope here —
// it lands with the Game progression work in a later task.

import type { World } from './models';

export const WORLDS: World[] = [
  {
    id: 'open-strings',
    order: 1,
    titleKey: 'game.world.open-strings.title',
    descriptionKey: 'game.world.open-strings.description',
  },
];
