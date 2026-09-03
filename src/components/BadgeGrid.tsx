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
  const collectedPct = defs.length ? Math.round((earnedCount / defs.length) * 100) : 0;

  return (
    <div className="badge-wrap">
      <BadgeMedalDefs />
      {/* Collection tracker — the whole shelf's completion, read as one meter. */}
      <div className="badge-collection-head">
        <div className="badge-collection-top">
          <span className="badge-collection-num">{earnedCount}</span>
          <span className="badge-collection-total">/ {defs.length}</span>
          <span className="badge-collection-label">unlocked</span>
        </div>
        <span className="badge-collection-meter" aria-hidden="true">
          <span className="badge-collection-meter-fill" style={{ width: `${collectedPct}%` }} />
        </span>
      </div>
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
  const reachedIdx = tier ? TIERS.indexOf(tier) : -1;

  return (
    <div className={`badge-tile tier-${medalTier} ${earned ? 'earned' : 'locked'}${maxedOut ? ' maxed' : ''}`}>
      <span className="badge-medal-frame">
        <BadgeMedal id={def.id} instrumentId={instrument.id} tier={medalTier} size={76} />
        {!earned && (
          <span className="badge-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path
                d="M6 10V8a6 6 0 0 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h8V8a4 4 0 0 0-8 0v2Z"
                fill="currentColor"
              />
            </svg>
          </span>
        )}
      </span>

      {maxedOut && (
        <span className={`badge-crown tier-${medalTier}`} aria-hidden="true">
          {medalTier === 'platinum' ? (
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M2 8l4.6 3.2L12 3l5.4 8.2L22 8l-2.1 11.3H4.1L2 8Z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M12 2.6l2.7 6 6.6.6-5 4.3 1.5 6.4L12 16.5 6.2 19.9l1.5-6.4-5-4.3 6.6-.6z" fill="currentColor" />
            </svg>
          )}
        </span>
      )}

      <span className="badge-id-row">
        <span className="badge-name">{def.name}</span>
        {def.instrumentScoped && <span className="badge-scope">{instrument.label}</span>}
      </span>

      {!isRole && def.levels.length > 0 && (
        <span className="badge-tier-track" aria-hidden="true">
          {def.levels.map(l => (
            <span
              key={l.tier}
              className={`badge-tier-seg tier-${l.tier}${
                reachedIdx >= 0 && TIERS.indexOf(l.tier) <= reachedIdx ? ' on' : ''
              }`}
            />
          ))}
        </span>
      )}

      {!isRole && earned && (
        <span className={`badge-tier-word${maxedOut ? ' is-max' : ''}${tier ? ` tier-${tier}` : ''}`}>
          {maxedOut ? (
            'Max'
          ) : (
            <>
              {TIER_LABEL[tier as Tier]}
              {nextLevel && <span className="badge-tier-next"> → {TIER_LABEL[nextLevel.tier]}</span>}
            </>
          )}
        </span>
      )}

      <span className="badge-blurb">
        {isRole ? def.blurb : (maxedOut ? def.levels[def.levels.length - 1].blurb : nextLevel?.blurb)}
      </span>

      {!earned && progress && progress.target > 0 && (
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

      {earned && (
        <span className="badge-earned">
          {when
            ? `✓ ${new Date(when).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}`
            : '✓ Earned'}
        </span>
      )}

      {/* Earned, not maxed: the next-tier climb is a quiet footnote, and only
          when there's real progress to show — never a big empty bar. */}
      {earned && !maxedOut && nextLevel && progress && progress.target > 0 && progress.current > 0 && (
        <span className="badge-progress badge-progress--next">
          <span className="badge-progress-track">
            <span
              className="badge-progress-bar"
              style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
            />
          </span>
          <span className="badge-progress-txt">
            {TIER_LABEL[nextLevel.tier]} · {progress.current}/{progress.target}
          </span>
        </span>
      )}
    </div>
  );
}
