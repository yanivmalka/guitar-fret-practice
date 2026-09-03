import { useTranslation } from '../i18n/useTranslation';
import { useEntitlement } from '../hooks/useEntitlement';

/**
 * The reusable Pro upsell (design .kiro/specs/free-pro-tiering §4.3). Rendered
 * by the `upgrade` drawer section and by `<ProGate variant="replace">`. Like
 * any other subscription screen it lays out BOTH plans — what Free already
 * gives you, then what Pro adds — and marks whichever one the account is on.
 * For a Pro user the Pro card also shows the entitlement `source` and expiry.
 * The CTA is a placeholder for this pass — there is no payment button until
 * the Phase 7 payment rail lands.
 */

// The free side, kept in step with the "NOT in this map on purpose" note in
// utils/features.ts — that comment is the source of truth for what stays free.
const FREE_PERKS = [
  'The full fretboard drill — by note and by fret, on every string',
  'Badges and achievements, with your pinned medal shelf',
  'The leaderboard — XP, questions answered and accuracy',
  'Cloud sync and full restore of your practice on every device',
  'Your last 7 days of stats, plus the personal best for what you’re drilling',
] as const;

// Kept in step with design §2.2. Each string is translated at the call below.
const PRO_PERKS = [
  'Your full practice history — all-time stats and trends, not just the last 7 days',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid',
  'Browse your personal bests across every settings combination',
  'Multi-string drilling mode',
  'A personal voice profile built from your own calibration recordings',
] as const;

// Whole sentences (not glued fragments) so the Hebrew reads naturally.
const SOURCE_SENTENCE: Record<string, string> = {
  comp: 'Your Pro access is complimentary.',
  promo: 'Your Pro access came from a promotion.',
  manual: 'Your Pro access was granted manually.',
  revenuecat: 'Your Pro access is from your subscription.',
  stripe: 'Your Pro access is from your subscription.',
  play: 'Your Pro access is from your subscription.',
};

export function UpgradeCard({ pitch }: { pitch?: string }) {
  const { t, lang } = useTranslation();
  const { isPro, entitlement } = useEntitlement();

  const sourceSentence = t(SOURCE_SENTENCE[entitlement.source] ?? 'Your Pro access is active.');
  const expirySentence = (() => {
    if (!entitlement.expiresAt) return t('It does not expire.');
    const d = new Date(entitlement.expiresAt);
    if (Number.isNaN(d.getTime())) return t('It does not expire.');
    const date = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return `${t('Access runs until')} ${date}.`;
  })();

  return (
    <div className="plan-stack">
      {pitch && <p className="pro-card-pitch">{pitch}</p>}

      {/* Free — what you already have without paying. */}
      <div className={`pro-card plan-free${isPro ? '' : ' is-current'}`}>
        <div className="pro-card-head">
          <span className="plan-pill">{t('Free')}</span>
          <span className="pro-card-tier">
            {isPro ? t('Included with Pro') : t('Your plan')}
          </span>
        </div>

        <p className="pro-card-lead">
          {t('Everything you need to practice daily, at no cost.')}
        </p>

        <ul className="pro-perks">
          {FREE_PERKS.map(perk => (
            <li key={perk}><span aria-hidden="true">✓</span>{t(perk)}</li>
          ))}
        </ul>

        <p className="pro-card-note plan-price">{t('Free, forever')}</p>
      </div>

      {/* Pro — what upgrading adds on top of everything above. */}
      <div className={`pro-card${isPro ? ' is-current' : ''}`}>
        <div className="pro-card-head">
          <span className="pro-pill">{t('Pro')}</span>
          <span className="pro-card-tier">
            {isPro ? t('You have Pro') : t('Everything in Free, plus:')}
          </span>
        </div>

        <p className="pro-card-lead">
          {t('Pro is for training seriously and tracking progress over time.')}
        </p>

        <ul className="pro-perks">
          {PRO_PERKS.map(perk => (
            <li key={perk}><span aria-hidden="true">✦</span>{t(perk)}</li>
          ))}
        </ul>

        {isPro ? (
          <p className="pro-card-status">{sourceSentence} {expirySentence}</p>
        ) : (
          <>
            {/* Phase 7: wire purchase entry point here — replace this placeholder
                with the real CTA that opens the platform purchase sheet and calls
                refreshEntitlement() on success. */}
            <button type="button" className="pro-cta" disabled>
              {t('Coming soon')}
            </button>
            <p className="pro-card-note">
              {t('Pro isn’t on sale yet — everything above stays free to try in the meantime.')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
