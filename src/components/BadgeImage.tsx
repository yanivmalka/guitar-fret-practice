import type { BadgeId } from '../utils/badges';
import { BadgeMedal, type Metal } from './BadgeMedal';

import onFireBronzeFront from '../assets/badges/on_fire/bronze-front.png';
import onFireBronzeBack from '../assets/badges/on_fire/bronze-back.png';
import onFireSilverFront from '../assets/badges/on_fire/silver-front.png';
import onFireSilverBack from '../assets/badges/on_fire/silver-back.png';
import onFireGoldFront from '../assets/badges/on_fire/gold-front.png';
import onFireGoldBack from '../assets/badges/on_fire/gold-back.png';

/**
 * A rendered badge: a sculpted metal figurine (a raster PNG with its own
 * silhouette, one per tier, plus a distinct back face for the earn-reveal
 * spin) where art exists, falling back to the struck-medal <BadgeMedal> SVG
 * everywhere else. Consumers can swap <BadgeMedal> → <BadgeImage> blindly:
 * a badge with no art looks exactly as before.
 *
 * Art is added family by family — On Fire is the first. See
 * `.kiro/specs/roadmap/product-wishlist.md` (§2, "Badge art + earn-animation
 * redesign") for the pipeline and the direction.
 */

type Face = 'front' | 'back';

const ART: Partial<Record<BadgeId, Partial<Record<Metal, Record<Face, string>>>>> = {
  on_fire: {
    bronze: { front: onFireBronzeFront, back: onFireBronzeBack },
    silver: { front: onFireSilverFront, back: onFireSilverBack },
    gold: { front: onFireGoldFront, back: onFireGoldBack },
  },
};

/** True when a real figurine exists for this family + tier (so a caller can
 *  decide whether the back face is worth rendering, e.g. the reveal spin). */
export function hasBadgeArt(id: BadgeId, tier: Metal): boolean {
  return ART[id]?.[tier] != null;
}

export function BadgeImage({
  id, instrumentId, tier, size = 52, face = 'front',
}: {
  id: BadgeId;
  instrumentId?: string;
  tier: Metal;
  size?: number;
  /** Which side of the figurine to show — 'back' is only meaningful mid-spin. */
  face?: Face;
}) {
  const art = ART[id]?.[tier];
  if (!art) {
    return <BadgeMedal id={id} instrumentId={instrumentId} tier={tier} size={size} />;
  }
  return (
    <img
      className="badge-image"
      src={face === 'back' ? art.back : art.front}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
