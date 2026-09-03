import { useTranslation } from '../i18n/useTranslation';
import { useEntitlement } from '../hooks/useEntitlement';

/**
 * The reusable Pro upsell (design .kiro/specs/free-pro-tiering §4.3). Rendered
 * by the `upgrade` drawer section and by `<ProGate variant="replace">`. It
 * lists what Pro unlocks and the current tier; for a Pro user it also shows the
 * entitlement `source` and expiry. The CTA is a placeholder for this pass —
 * there is no payment button until the Phase 7 payment rail lands.
 */

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
    <div className="pro-card">
      <div className="pro-card-head">
        <span className="pro-pill">{t('Pro')}</span>
        <span className="pro-card-tier">
          {isPro ? t('You have Pro') : t("You're on Free")}
        </span>
      </div>

      {pitch && <p className="pro-card-pitch">{pitch}</p>}

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
  );
}
