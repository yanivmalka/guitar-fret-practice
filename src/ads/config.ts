// Ad configuration: which ad surface this build uses and the ids it runs with.
//
// Everything is read from `VITE_*` env vars (see .env.example). These ids are
// public by nature — they ship inside the app / page — so unlike the Supabase
// service key there is nothing secret here.
//
// Until a real ad-unit id is supplied the native build falls back to Google's
// published TEST banner ids and asks for test ads, so a debug APK never serves
// (or bills) real impressions by accident. A web build with no AdSense ids
// falls back to the house placeholder strip.

import { Capacitor } from '@capacitor/core';

export type AdSurface = 'native' | 'adsense' | 'house';

// Google's public sample banner units — always safe, never earn anything.
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';

const env = import.meta.env;

export const ADSENSE_CLIENT: string = env.VITE_ADSENSE_CLIENT ?? '';
export const ADSENSE_SLOT: string = env.VITE_ADSENSE_SLOT ?? '';

/** The platform this build is running on: 'android' | 'ios' | 'web'. */
export function adPlatform(): 'android' | 'ios' | 'web' {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

/** The banner ad-unit id for the native platform, or the Google test unit when
 *  none is configured. */
export function nativeBannerId(): { adId: string; isTesting: boolean } {
  const platform = adPlatform();
  const real: string = (platform === 'ios' ? env.VITE_ADMOB_IOS_BANNER_ID : env.VITE_ADMOB_ANDROID_BANNER_ID) ?? '';
  if (real && !env.DEV && env.VITE_ADS_TESTING !== '1') return { adId: real, isTesting: false };
  return { adId: platform === 'ios' ? TEST_BANNER_IOS : TEST_BANNER_ANDROID, isTesting: true };
}

/** The native banner is swapped for a new ad after a random 60–90 s while it
 *  stays up (product owner). Native only: AdSense forbids refreshing an ad
 *  unit without a user action, so the web strip never auto-refreshes. Set the
 *  AdMob ad unit's own "Automatic refresh" to Disabled so the two don't stack. */
export const NATIVE_REFRESH_MIN_MS = 60_000;
export const NATIVE_REFRESH_MAX_MS = 90_000;

/** Which surface renders the ad on this platform. */
export function adSurface(): AdSurface {
  if (Capacitor.isNativePlatform()) return 'native';
  return ADSENSE_CLIENT && ADSENSE_SLOT ? 'adsense' : 'house';
}
