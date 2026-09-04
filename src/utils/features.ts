// The capability map: the single place that says which features are Pro-only
// (design .kiro/specs/free-pro-tiering §4.1). Nothing else in the app should
// compare tiers directly — call `can(feature, tier)` instead, so "what is Pro"
// stays greppable and a future third tier is a one-line rank change.

import type { Tier } from './entitlement';

export type Feature =
  | 'historyBeyond7Days'   // the Stats & Progress screen's "All time" scope + trends
  | 'masteryMaps'          // fret/note "equalizer" overlays + their toggle
  | 'allPersonalBests'     // browse bests across every settings combination
  | 'fretRange'            // planned: a fine "fret N–M" range selector (not yet surfaced)
  | 'voiceProfile'         // personal voice profile + calibration
  | 'noAds';               // future: suppress Free-tier ads

const MIN_TIER: Record<Feature, Tier> = {
  historyBeyond7Days: 'pro',
  masteryMaps:        'pro',
  allPersonalBests:   'pro',
  fretRange:          'pro',
  voiceProfile:       'pro',
  noAds:              'pro',
};
// `fretRange` is reserved ahead of the UI: it will gate a future precise
// "from fret N to fret M" range selector. The current 0–12 / 12–max half-picker
// in `SelectorPanel` is NOT this feature and stays free for everyone.
//
// NOT in this map on purpose (free on every tier, design §2.3): cloud sync and
// full multi-device restore, the leaderboard (XP / questions / accuracy),
// badges / Achievements, the personal best for the combination currently being
// drilled, the 0–12 / 12–max fret-range half-picker, and multi-string drilling
// mode (freed after the initial tiering pass).

const RANK: Record<Tier, number> = { free: 0, pro: 1 };

export function can(feature: Feature, tier: Tier): boolean {
  return RANK[tier] >= RANK[MIN_TIER[feature]];
}

/** Free users still see this many days of their own history in the Stats &
 *  Progress screen. The full history is still recorded, synced and restored —
 *  this is a view filter over one screen, never a data cut (design §5.1). */
export const FREE_HISTORY_DAYS = 7;
