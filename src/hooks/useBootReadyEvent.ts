import { useEffect, useRef } from 'react';

// Hold the boot splash (index.html) until the first data load has settled — the
// Supabase session and, for a signed-in user, the entitlement lookup — so the
// UI doesn't visibly flip from a guest/default state to the real one after the
// splash has already gone. `src/main.tsx` listens for this event and still
// enforces its own minimum-visible and hard-cap timers, so a guest build (both
// flags false from the start) or a stalled network can't get stuck behind it.
export function useBootReadyEvent(loading: boolean, entitlementLoading: boolean) {
  const bootReadyRef = useRef(false);
  useEffect(() => {
    if (bootReadyRef.current) return;
    if (loading || entitlementLoading) return;
    bootReadyRef.current = true;
    window.dispatchEvent(new Event('app-ready'));
  }, [loading, entitlementLoading]);
}
