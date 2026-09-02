import { useEffect, useMemo } from 'react';
import type { HistoryEntry } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import {
  badgeList, evaluateLifetime, awardBadge, isEarned, earnedAt, badgeProgress,
  type BadgeDef, type BadgeId, type LifetimeSnapshot,
} from '../utils/badges';
import { BadgeMedal, BadgeMedalDefs } from './BadgeMedal';

/**
 * The badge collection, rendered by the standalone "🏅 Badges" settings page.
 * It evaluates the lifetime badges against the instrument's all-time history on
 * every open: badges that already qualify show as earned immediately, and an
 * effect persists them (retroactive catch-up) without a re-render — `awardBadge`
 * is idempotent, so this is safe to run every time.
 */
export function BadgeGrid({
  instrument, instrumentEntries, isAdmin = false,
}: {
  instrument: InstrumentConfig;
  instrumentEntries: HistoryEntry[];
  /** Current account is an app administrator — reveals the Admin role medal. */
  isAdmin?: boolean;
}) {
  const lifetime = useMemo<LifetimeSnapshot>(
    () => ({ instrumentEntries, instrument }),
    [instrumentEntries, instrument],
  );

  const qualifying = useMemo(
    () => new Set<BadgeId>(evaluateLifetime(lifetime)),
    [lifetime],
  );

  useEffect(() => {
    for (const id of qualifying) awardBadge(id, instrument.id);
    if (isAdmin) awardBadge('admin');
  }, [qualifying, instrument.id, isAdmin]);

  // Role medals only appear for the accounts that hold them — a non-admin
  // never sees a locked "become an admin" tile.
  const defs = badgeList(instrument).filter(d => d.kind !== 'role' || isAdmin);
  const isDone = (id: BadgeId) =>
    id === 'admin' ? isAdmin : isEarned(id, instrument.id) || qualifying.has(id);
  const earnedCount = defs.filter(d => isDone(d.id)).length;

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
            earned={isDone(def.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeTile({
  def, instrument, lifetime, earned,
}: {
  def: BadgeDef;
  instrument: InstrumentConfig;
  lifetime: LifetimeSnapshot;
  earned: boolean;
}) {
  const when = earned ? earnedAt(def.id, instrument.id) : null;
  const progress = !earned && def.kind === 'lifetime' ? badgeProgress(def.id, lifetime) : null;

  return (
    <div className={`badge-tile${earned ? '' : ' locked'}`}>
      <BadgeMedal def={def} />
      <span className="badge-name">{def.name}</span>
      <span className="badge-blurb">{def.blurb}</span>
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
