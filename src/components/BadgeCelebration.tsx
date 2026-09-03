import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { badgeDef, TIER_LABEL, type BadgeDef, type BadgeId, type Tier } from '../utils/badges';
import { BadgeMedal, BadgeMedalDefs } from './BadgeMedal';
import { haptic, playBadgeFanfare } from '../utils/feedback';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Localise a badge family name for the active language, matching how the
 * Badges wall (`BadgeGrid`) does it: most names pass straight through `t()`,
 * but the per-string String Master family carries a spliced-in string label,
 * so that label is lifted to a `{s}` placeholder (one template covers every
 * string) and the translated label substituted back. English is a no-op.
 */
function localiseBadgeName(
  def: BadgeDef | undefined, instrument: InstrumentConfig, t: (s: string) => string,
): string {
  if (!def) return '';
  const m = /^string_master_s(\d+)$/.exec(def.id);
  const label = m ? instrument.stringLabels[Number(m[1])] : null;
  if (label && def.name.includes(label)) {
    return t(def.name.replace(label, '{s}')).replace('{s}', t(label));
  }
  return t(def.name);
}

/**
 * One badge worth celebrating this run. `upgrade` is true when the family had
 * already been earned at a lower tier before this award — the copy then reads
 * "Badge upgraded" instead of "New badge". `uid` is a per-run running number so
 * the toast can be keyed/remounted per badge.
 */
export interface CelebratedBadge {
  uid: number;
  id: BadgeId;
  tier: Tier;
  upgrade: boolean;
}

// ── Mid-game toast ───────────────────────────────────────────────────────────
// Slides down from the very top, holds a few seconds, slides back up. It is
// non-blocking (the container ignores pointer events; only the pill itself is
// tappable, to dismiss early) so it never interrupts a question in progress.

const TOAST_HOLD_MS = 3000;
const TOAST_EXIT_MS = 450;

export function BadgeToast({
  badge, instrument, onDone,
}: {
  badge: CelebratedBadge | null;
  instrument: InstrumentConfig;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!badge) return;
    haptic.milestone();
    const hold = window.setTimeout(() => setLeaving(true), TOAST_HOLD_MS);
    const done = window.setTimeout(() => onDoneRef.current(), TOAST_HOLD_MS + TOAST_EXIT_MS);
    return () => { window.clearTimeout(hold); window.clearTimeout(done); };
  }, [badge]);

  if (!badge) return null;
  const def = badgeDef(badge.id, instrument);

  return (
    <div className={`badge-toast${leaving ? ' leaving' : ''}`} role="status" aria-live="polite">
      <BadgeMedalDefs />
      <button
        type="button"
        className={`badge-toast-card tier-${badge.tier}`}
        onClick={() => setLeaving(true)}
      >
        <span className="badge-toast-medal">
          <BadgeMedal id={badge.id} instrumentId={instrument.id} tier={badge.tier} size={44} />
        </span>
        <span className="badge-toast-text">
          <span className="badge-toast-kicker">
            {badge.upgrade ? t('Badge upgraded') : t('New badge')}
          </span>
          <span className="badge-toast-name">
            {localiseBadgeName(def, instrument, t) || badge.id} · {t(TIER_LABEL[badge.tier])}
          </span>
        </span>
      </button>
    </div>
  );
}

// ── End-of-round reveal ──────────────────────────────────────────────────────
// A full-screen curtain that flies each freshly-earned medal in on a long spin,
// lands it with a shockwave + spark burst, then names it. Nothing here is timed:
// every step — the next badge, and the final dismissal into the summary — waits
// for a user tap (anywhere) or the Continue / OK button. A tap while the medal
// is still flying in doesn't skip it; it rushes that arrival to 2× speed.

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  a: `${Math.round((i * 360) / 14 + (i % 2 ? 9 : -7))}deg`,
  d: `${92 + (i % 3) * 26}px`,
}));

// Keep in sync with the .badge-reveal-medal fly-in animation in the stylesheet.
const REVEAL_FLY_MS = 1250;

export function BadgeRevealOverlay({
  badges, instrument, onClose,
}: {
  badges: CelebratedBadge[];
  instrument: InstrumentConfig;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  // The highest badge index whose fly-in has finished, and the index (if any)
  // whose arrival the user has rushed. Derived flags avoid resetting state per
  // badge — advancing `idx` past `arrivedIdx` makes `arrived` false again.
  const [arrivedIdx, setArrivedIdx] = useState(-1);
  const [rushedIdx, setRushedIdx] = useState(-1);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const flyTimerRef = useRef<number | null>(null);

  const last = idx >= badges.length - 1;
  const current = badges[idx];
  const arrived = arrivedIdx >= idx;
  const rushed = rushedIdx === idx;

  useEffect(() => {
    playBadgeFanfare();
    haptic.milestone();
    flyTimerRef.current = window.setTimeout(() => setArrivedIdx(idx), REVEAL_FLY_MS);
    return () => { if (flyTimerRef.current) window.clearTimeout(flyTimerRef.current); };
  }, [idx]);

  const tap = useCallback(() => {
    if (!arrived) {
      // Mid-flight: rush this arrival to 2× rather than skipping it.
      if (!rushed) {
        setRushedIdx(idx);
        if (flyTimerRef.current) window.clearTimeout(flyTimerRef.current);
        flyTimerRef.current = window.setTimeout(() => setArrivedIdx(idx), REVEAL_FLY_MS / 2);
      }
      return;
    }
    if (idx >= badges.length - 1) onCloseRef.current();
    else setIdx(i => i + 1);
  }, [arrived, rushed, idx, badges.length]);

  if (!current) return null;
  const def = badgeDef(current.id, instrument);
  const sparkStyle = (s: { a: string; d: string }) =>
    ({ '--a': s.a, '--d': s.d } as CSSProperties);

  return (
    <div
      className={`badge-reveal${rushed ? ' rushing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('New badge')}
      onClick={tap}
    >
      <BadgeMedalDefs />
      <div className="badge-reveal-stage" key={idx}>
        <span className="badge-reveal-rays" aria-hidden="true" />
        <span className="badge-reveal-wave" aria-hidden="true" />
        <span className="badge-reveal-burst" aria-hidden="true">
          {SPARKS.map((s, i) => (
            <span className="badge-reveal-spark" key={i} style={sparkStyle(s)} />
          ))}
        </span>
        <span className="badge-reveal-medal">
          <BadgeMedal id={current.id} instrumentId={instrument.id} tier={current.tier} size={160} />
        </span>
      </div>

      <div className="badge-reveal-caption" key={`cap-${idx}`}>
        <div className="badge-reveal-kicker">
          {current.upgrade ? t('Badge upgraded') : t('New badge')}
        </div>
        <div className="badge-reveal-name">{localiseBadgeName(def, instrument, t) || current.id}</div>
        <div className={`badge-reveal-tier tier-${current.tier}`}>{t(TIER_LABEL[current.tier])}</div>
      </div>

      {badges.length > 1 && (
        <div className="badge-reveal-count" aria-hidden="true">{idx + 1} / {badges.length}</div>
      )}

      {arrived && (
        <button
          type="button"
          className="clear-btn badge-reveal-btn"
          onClick={(e) => { e.stopPropagation(); tap(); }}
        >
          {last ? t('OK') : t('Continue')}
        </button>
      )}
    </div>
  );
}
