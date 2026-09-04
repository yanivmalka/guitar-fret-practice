// The capability map: the single place that says which features are Pro-only
// (design .kiro/specs/free-pro-tiering §4.1). Nothing else in the app should
// compare tiers directly — call `can(feature, tier)` instead, so "what is Pro"
// stays greppable and a future third tier is a one-line rank change.

import type { Tier } from './entitlement';

export type Feature =
  | 'historyBeyond7Days'   // the Stats & Progress screen's "All time" scope + trends
  | 'masteryMaps'          // "questions counted" window control for the mastery overlay
  | 'allPersonalBests'     // browse bests across every settings combination
  | 'fretRange'            // the precise "fret N–M" window control in SelectorPanel
  | 'multiStringFull'      // multi-string drilling on more than FREE_MULTI_STRING_LIMIT strings
  | 'voiceProfile'         // personal voice profile + calibration
  | 'noAds';               // future: suppress Free-tier ads

const MIN_TIER: Record<Feature, Tier> = {
  historyBeyond7Days: 'pro',
  masteryMaps:        'pro',
  allPersonalBests:   'pro',
  fretRange:          'pro',
  multiStringFull:    'pro',
  voiceProfile:       'pro',
  noAds:              'pro',
};
// `fretRange` gates the precise "from fret N to fret M" window control that
// sits under the neck in `SelectorPanel` (its "Precise fret range" toggle +
// two-handle slider). The 0–12 / 12–max half-picker above it is NOT this
// feature and stays free for everyone; the precise window is an extra layer.
//
// NOT in this map on purpose (free on every tier, design §2.3): cloud sync and
// full multi-device restore, the leaderboard (XP / questions / accuracy),
// badges / Achievements, the personal best for the combination currently being
// drilled, and the 0–12 / 12–max fret-range half-picker.
//
// Multi-string drilling is partly free: every tier can drill up to
// FREE_MULTI_STRING_LIMIT strings at once; going beyond that needs
// `multiStringFull` (Pro). `useSelector` caps a Free user's selection and
// opens the upgrade drawer when they reach for a third string.

const RANK: Record<Tier, number> = { free: 0, pro: 1 };

export function can(feature: Feature, tier: Tier): boolean {
  return RANK[tier] >= RANK[MIN_TIER[feature]];
}

/** How many strings a Free user may drill at once in multi-string mode. Pro
 *  lifts this to the full string count of the instrument. */
export const FREE_MULTI_STRING_LIMIT = 2;

/** Free users still see this many days of their own history in the Stats &
 *  Progress screen. The full history is still recorded, synced and restored —
 *  this is a view filter over one screen, never a data cut (design §5.1). */
export const FREE_HISTORY_DAYS = 7;
