import { useEffect, useMemo } from 'react';
import type { HistoryEntry } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  badgeList, evaluateLifetime, awardBadge, awardFamilyUpTo, earnedTier, earnedAt, badgeProgress,
  TIERS, TIER_LABEL, type BadgeDef, type LifetimeSnapshot, type Tier,
} from '../utils/badges';
import { BadgeMedal, BadgeMedalDefs, type Metal } from './BadgeMedal';

function higherTier(a: Tier | null, b: Tier | null): Tier | null {
  if (!a) return b;
  if (!b) return a;
  return TIERS.indexOf(a) >= TIERS.indexOf(b) ? a : b;
}

/**
 * The badge collection, rendered by the standalone "🏅 Badges" settings page.
 * It evaluates the lifetime badges against the instrument's all-time history on
 * every open: families that already qualify show their reached tier immediately,
 * and an effect persists every tier up to it (retroactive catch-up) without a
 * re-render — `awardBadge` is idempotent, so this is safe to run every time.
 */
export function BadgeGrid({
  instrument, instrumentEntries, allEntries, isAdmin = false,
}: {
  instrument: InstrumentConfig;
  /** History for the current instrument — fretboard-shape badges. */
  instrumentEntries: HistoryEntry[];
  /** History across every instrument — player-progress badges. */
  allEntries: HistoryEntry[];
  /** Current account is an app administrator — reveals the Admin role medal. */
  isAdmin?: boolean;
}) {
  const lifetime = useMemo<LifetimeSnapshot>(
    () => ({ instrumentEntries, allEntries, instrument }),
    [instrumentEntries, allEntries, instrument],
  );

  const qualifying = useMemo(() => evaluateLifetime(lifetime), [lifetime]);

  useEffect(() => {
    for (const def of badgeList(instrument)) {
      if (def.kind === 'role') continue;
      const tier = qualifying[def.id];
      if (tier) awardFamilyUpTo(def.id, instrument.id, tier, def.levels);
    }
    if (isAdmin) awardBadge('admin');
  }, [qualifying, instrument, isAdmin]);

  // Role medals only appear for the accounts that hold them — a non-admin
  // never sees a locked "become an admin" tile.
  const defs = badgeList(instrument).filter(d => d.kind !== 'role' || isAdmin);
  const effectiveTier = (def: BadgeDef): Tier | null =>
    def.kind === 'role' ? null : higherTier(earnedTier(def.id, instrument.id), qualifying[def.id] ?? null);
  const earnedCount = defs.filter(d => d.kind === 'role' ? isAdmin : effectiveTier(d) !== null).length;

  return (
    <div className="badge-wrap">
      <BadgeMedalDefs />
      <p className="badge-summary">🏅 {earnedCount} / {defs.length} earned</p>
      <div className="badge-grid">
        {defs.map(def => (
          <BadgeTile
            key={def.id}
            def={def}
            instrument={instrument}
            lifetime={lifetime}
            tier={def.kind === 'role' ? 'gold' : effectiveTier(def)}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeTile({
  def, instrument, lifetime, tier,
}: {
  def: BadgeDef;
  instrument: InstrumentConfig;
  lifetime: LifetimeSnapshot;
  /** The family's highest reached tier, or null if not yet earned. */
  tier: Tier | null;
}) {
  const isRole = def.kind === 'role';
  const earned = tier !== null;
  const nextLevel = isRole
    ? null
    : def.levels.find(l => tier === null || TIERS.indexOf(l.tier) > TIERS.indexOf(tier));
  const when = isRole ? earnedAt(def.id) : (earned ? earnedAt(def.id, instrument.id, tier as Tier) : null);
  const progress = !isRole && nextLevel && def.kind === 'lifetime'
    ? badgeProgress(def.id, lifetime, nextLevel.tier)
    : null;
  const medalTier: Metal = isRole ? 'onyx' : (tier ?? def.levels[0]?.tier ?? 'bronze');
  const maxedOut = !isRole && !nextLevel && earned;

  return (
    <div className={`badge-tile${earned ? '' : ' locked'}`}>
      <BadgeMedal id={def.id} instrumentId={instrument.id} tier={medalTier} />
      <span className="badge-name">
        {def.name}
        {!isRole && earned && <span className={`badge-tier-pill tier-${tier}`}>{TIER_LABEL[tier as Tier]}</span>}
      </span>
      {!isRole && def.levels.length > 1 && (
        <span className="badge-pips" aria-hidden="true">
          {def.levels.map(l => (
            <span
              key={l.tier}
              className={`badge-pip tier-${l.tier}${tier !== null && TIERS.indexOf(l.tier) <= TIERS.indexOf(tier) ? ' filled' : ''}`}
            />
          ))}
        </span>
      )}
      <span className="badge-blurb">
        {isRole ? def.blurb : (maxedOut ? def.levels[def.levels.length - 1].blurb : nextLevel?.blurb)}
      </span>
      {earned && (
        <span className="badge-earned">
          {when
            ? `Earned ${new Date(when).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}`
            : 'Earned'}
        </span>
      )}
      {progress && progress.target > 0 && (
        <span className="badge-progress">
          <span className="badge-progress-track">
            <span
              className="badge-progress-bar"
              style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
            />
          </span>
          <span className="badge-progress-txt">{progress.current} / {progress.target}</span>
        </span>
      )}
      {def.instrumentScoped && (
        <span className="badge-scope">for {instrument.label}</span>
      )}
    </div>
  );
}
