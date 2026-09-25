// The native (AdMob) banner, for the Capacitor Android and iOS apps.
//
// The banner is a real native view laid over the WebView, not DOM, so there is
// nothing for React to render: this module just shows and removes it and
// reports its height so the page can keep clear. The plugin is imported lazily,
// so the web bundle never loads it (same trick as the native speech engine).
//
// Order matters and is the whole compliance story: (iOS) App Tracking
// Transparency prompt → initialise the SDK → Google's UMP consent flow → only
// when consent allows (`canRequestAds`) is a banner requested. A user who
// refuses simply sees no ad.

import { adPlatform, nativeBannerId } from './config';

type AdMobModule = typeof import('@capacitor-community/admob');

let ready: Promise<{ mod: AdMobModule; canRequest: boolean }> | null = null;

function prepare() {
  if (ready) return ready;
  ready = (async () => {
    const mod = await import('@capacitor-community/admob');
    const { AdMob } = mod;
    const { isTesting } = nativeBannerId();
    if (adPlatform() === 'ios') {
      const s = await AdMob.trackingAuthorizationStatus();
      if (s.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    await AdMob.initialize({ initializeForTesting: isTesting });
    let info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === mod.AdmobConsentStatus.REQUIRED) {
      info = await AdMob.showConsentForm();
    }
    return { mod, canRequest: info.canRequestAds };
  })();
  // A failed setup must not be cached forever (offline first launch).
  ready.catch(() => { ready = null; });
  return ready;
}

// `wanted` is the caller's latest intent. Setup and the banner request are both
// async, so a hide can arrive while a show is still in flight; each step
// re-checks it and takes the banner straight back down if the user has moved on.
let wanted = false;
let shown = false;
let sizeHandle: { remove: () => Promise<void> } | null = null;

async function removeIfUp(): Promise<void> {
  if (!shown) return;
  shown = false;
  try {
    const { mod } = await prepare();
    await mod.AdMob.removeBanner();
  } catch (err) {
    console.warn('[ads] native banner removal failed', err);
  }
}

/** Show the bottom banner. `onHeight` receives its height in CSS px (0 = gone
 *  or failed). Resolves quietly on any failure — an ad must never break the app. */
export async function showNativeBanner(onHeight: (px: number) => void): Promise<void> {
  wanted = true;
  try {
    const { mod, canRequest } = await prepare();
    if (!canRequest || !wanted) return;
    const { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } = mod;
    sizeHandle?.remove().catch(() => {});
    sizeHandle = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (s) => onHeight(s.height));
    if (!wanted) return;
    const { adId, isTesting } = nativeBannerId();
    shown = true;
    await AdMob.showBanner({
      adId,
      isTesting,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
    if (!wanted) void removeIfUp();
  } catch (err) {
    console.warn('[ads] native banner failed', err);
    onHeight(0);
  }
}

/** Remove the banner if one is up. Safe to call when none is. */
export async function hideNativeBanner(): Promise<void> {
  wanted = false;
  await removeIfUp();
}

/** Lets a signed-out-of-consent user revisit their choice (UMP privacy form).
 *  Wired to a settings row later; a no-op where no form is required. */
export async function openAdPrivacyOptions(): Promise<void> {
  try {
    const { mod } = await prepare();
    await mod.AdMob.showPrivacyOptionsForm();
  } catch (err) {
    console.warn('[ads] privacy options failed', err);
  }
}
