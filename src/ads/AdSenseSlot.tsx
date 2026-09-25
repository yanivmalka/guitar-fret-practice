import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOT } from './config';

// The web (browser / PWA) ad: one AdSense unit inside the strip. The AdSense
// script is loaded on first use, never for a Pro user or a build with no
// AdSense ids. Web ads in the EEA / UK need a consent banner (Google's CMP)
// before this is switched on for real traffic — tracked in the wishlist.

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

const SCRIPT_ID = 'adsense-script';

function loadScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  document.head.appendChild(s);
}

export default function AdSenseSlot() {
  const pushed = useRef(false);
  useEffect(() => {
    // StrictMode mounts effects twice in dev; AdSense throws if a slot is
    // filled twice, so push once per mounted element.
    if (pushed.current) return;
    pushed.current = true;
    loadScript();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (err) { console.warn('[ads] adsense push failed', err); }
  }, []);

  return (
    <ins
      className="adsbygoogle ad-strip__adsense"
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={ADSENSE_SLOT}
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
}
