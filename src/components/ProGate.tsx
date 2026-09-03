import type { ReactNode } from 'react';
import { useEntitlement } from '../hooks/useEntitlement';
import { can, type Feature } from '../utils/features';
import { openUpgrade } from '../utils/upgradeDrawer';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';
import { UpgradeCard } from './UpgradeCard';

/**
 * The presentational lock (design .kiro/specs/free-pro-tiering §4.2). Renders
 * `children` untouched for a user who `can()` use the feature; otherwise a
 * locked state that routes to the `upgrade` drawer section. It enforces
 * nothing security-sensitive — the real gate is the entitlement row and the
 * per-feature logic in the host component; this is only the UI.
 *
 *  - `overlay`      dim + blur `children`, lock chip + "Pro" pill on top
 *                   (history panel, the mastery toggle).
 *  - `replace`      render only `<UpgradeCard>` instead of `children`
 *                   (a whole Pro-only section, e.g. voice calibration).
 *  - `inline-badge` render `children` in full, add a "Pro" pill, and swallow
 *                   the primary interaction so a tap opens the upsell instead
 *                   (the multi-string toggle).
 */

interface ProGateProps {
  feature: Feature;
  children: ReactNode;
  variant?: 'overlay' | 'replace' | 'inline-badge';
  /** Short reason shown in the locked state, e.g. "See your full history". */
  pitch?: string;
}

export function ProGate({ feature, children, variant = 'overlay', pitch }: ProGateProps) {
  const { tier } = useEntitlement();
  const { t } = useTranslation();

  if (can(feature, tier)) return <>{children}</>;

  const go = () => { playClickSound(); haptic.tap(); openUpgrade(); };

  if (variant === 'replace') {
    return <UpgradeCard pitch={pitch} />;
  }

  if (variant === 'inline-badge') {
    return (
      <span className="progate-inline">
        {children}
        <span className="progate-badge">{t('Pro')}</span>
        <button
          type="button"
          className="progate-inline-catch"
          onClick={go}
          aria-label={pitch ?? t('Unlock with Pro')}
        />
      </span>
    );
  }

  return (
    <div className="progate-overlay">
      <div className="progate-dim" aria-hidden="true">{children}</div>
      <button type="button" className="progate-lock" onClick={go}>
        <span className="progate-lock-icon" aria-hidden="true">🔒</span>
        <span className="progate-badge">{t('Pro')}</span>
        <span className="progate-lock-text">{pitch ?? t('Unlock with Pro')}</span>
      </button>
    </div>
  );
}
