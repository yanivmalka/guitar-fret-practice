import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/useTranslation';
import { can } from '../utils/features';
import { dismissAd, isAdPending, subscribeAdPending } from '../utils/adPacing';
import { haptic, playClickSound } from '../utils/feedback';
import { adSurface } from '../ads/config';
import { hideNativeBanner, showNativeBanner } from '../ads/nativeBanner';
import AdSenseSlot from '../ads/AdSenseSlot';

const SURFACE = adSurface();
const ROOT = document.documentElement;

/** The Free-tier ad strip.
 *
 *  When it shows is decided by `utils/adPacing` (after a random 1–5 finished
 *  rounds, gone as soon as the next round starts); who sees it is decided here
 *  through the capability map (`noAds` is a Pro feature). Mounted once, outside
 *  <App>, so it overlays every browsing screen without each one knowing.
 *
 *  What fills it depends on the platform (`ads/config.ts`):
 *   • native (Capacitor Android / iOS) — an AdMob banner, a native view over
 *     the WebView; this component renders no DOM, it only drives the banner;
 *   • web with AdSense ids — an AdSense unit inside a bottom strip;
 *   • otherwise — a house placeholder line in the same strip. */
export default function AdBanner() {
  const { t } = useTranslation();
  const auth = useAuth();
  const pending = useSyncExternalStore(subscribeAdPending, isAdPending);
  // While the entitlement is still resolving a paying user reads as Free, so
  // hold the strip back until we actually know.
  const visible = pending && !auth.loading && !can('noAds', auth.tier);

  // Reserve room at the bottom so the strip never covers a control.
  useEffect(() => {
    document.body.classList.toggle('has-ad-strip', visible);
    return () => document.body.classList.remove('has-ad-strip');
  }, [visible]);

  // Native: raise / remove the AdMob banner and reserve its real height.
  useEffect(() => {
    if (SURFACE !== 'native') return;
    if (!visible) { void hideNativeBanner(); ROOT.style.removeProperty('--ad-strip-h'); return; }
    void showNativeBanner(px => {
      if (px > 0) ROOT.style.setProperty('--ad-strip-h', `${px}px`);
      else ROOT.style.removeProperty('--ad-strip-h');
    });
    return () => { void hideNativeBanner(); ROOT.style.removeProperty('--ad-strip-h'); };
  }, [visible]);

  if (!visible || SURFACE === 'native') return null;

  return (
    <div className="ad-strip" role="complementary" aria-label={t('Advertisement')}>
      <span className="ad-strip__tag">{t('Ad')}</span>
      {SURFACE === 'adsense'
        ? <AdSenseSlot />
        : <span className="ad-strip__text">{t('Your ad could be here. Go Pro to remove ads.')}</span>}
      <button
        type="button"
        className="ad-strip__close"
        aria-label={t('Close ad')}
        onClick={() => { playClickSound(); haptic.tap(); dismissAd(); }}
      >
        ×
      </button>
    </div>
  );
}
