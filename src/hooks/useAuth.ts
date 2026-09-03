import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authRedirectTo } from '../utils/supabase';
import { setSyncUser } from '../utils/sync';
import { fetchIsAdmin } from '../utils/board';
import { fetchEntitlement, FREE, type Entitlement, type Tier } from '../utils/entitlement';
import {
  getDevSimulatePro, subscribeDevSimulatePro, setDevSimulatePro,
} from '../utils/devSimulatePro';

export interface AuthProfile {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  /** True when the signed-in user has a row in `public.admins`. */
  admin: boolean;
  /** Subscription tier. `'free'` for guests and signed-in free users. */
  tier: Tier;
  /** Convenience: a signed-in user on the Pro tier. */
  isPro: boolean;
  /** The full entitlement row (tier + `source` + `expiresAt`), `FREE` for
   *  guests. `source` / `expiresAt` back the Pro details in `<UpgradeCard>`. */
  entitlement: Entitlement;
  /** True while the first entitlement lookup for the current user is in flight. */
  entitlementLoading: boolean;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch the entitlement now (used by the foreground refresh and, later,
   *  the post-purchase flow). No-op for guests. */
  refreshEntitlement: () => Promise<void>;
  /** Dev-only (`import.meta.env.DEV`): when true, `tier` / `isPro` report Pro
   *  with no DB change, so the gated UI can be exercised against one account.
   *  Always `false` in a production bundle. */
  devSimulatePro: boolean;
  /** Toggle {@link devSimulatePro} (persisted to localStorage). No-op in a
   *  production bundle. */
  setDevSimulatePro: (on: boolean) => void;
}

// How stale the entitlement may get before a foreground return re-fetches it.
const ENTITLEMENT_MAX_AGE_MS = 5 * 60_000;

// Google's OAuth `profile` scope (requested by default) puts the display name
// and picture into `user_metadata`. Supabase key names vary a little by
// provider, so check the known aliases.
function toProfile(user: User | null): AuthProfile | null {
  if (!user) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = m[k];
      if (typeof v === 'string' && v) return v;
    }
    return null;
  };
  return {
    name: str('full_name', 'name'),
    email: str('email') ?? user.email ?? null,
    avatarUrl: str('avatar_url', 'picture'),
  };
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [entitlement, setEntitlement] = useState<Entitlement>(FREE);
  const [entitlementLoading, setEntitlementLoading] = useState(isSupabaseConfigured);

  // Dev-only "simulate Pro": an external-store flag OR-ed into `isPro` below so
  // the gated UI can be checked without touching the DB (design §6.2). Backed
  // by a store rather than local state so every independent `useAuth()`
  // instance updates together; `import.meta.env.DEV`-gated, so a production
  // build folds it to `false` (verified by grepping `dist/`).
  const devSimulatePro = useSyncExternalStore(subscribeDevSimulatePro, getDevSimulatePro);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSyncUser(data.session?.user?.id ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSyncUser(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Admin flag: a row in `public.admins` (see utils/board.ts). Re-checked
  // whenever the signed-in user changes. A stale `true` after sign-out is
  // masked below by gating the exposed value on `user`.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchIsAdmin(user.id).then(is => { if (!cancelled) setAdmin(is); });
    return () => { cancelled = true; };
  }, [user]);

  // Entitlement: same shape as the admin effect — re-checked whenever the
  // signed-in user changes; a stale value after sign-out is masked below by
  // gating the exposed `tier` / `isPro` on `user`. Offline, `fetchEntitlement`
  // falls back to the localStorage cache, so a returning Pro user stays Pro
  // without a network round-trip (design §9).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchEntitlement(user.id).then(e => {
      if (cancelled) return;
      setEntitlement(e);
      setEntitlementLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  // Foreground refresh: a just-upgraded user on another device (or an expiry)
  // becomes visible without a reload. Re-fetch when the tab returns to the
  // foreground after more than ~5 min, and whenever the network reconnects.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let lastFetch = Date.now();
    const maybeRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetch < ENTITLEMENT_MAX_AGE_MS) return;
      lastFetch = Date.now();
      fetchEntitlement(user.id).then(e => { if (!cancelled) setEntitlement(e); });
    };
    const onOnline = () => { lastFetch = 0; maybeRefresh(); };
    document.addEventListener('visibilitychange', maybeRefresh);
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', maybeRefresh);
      window.removeEventListener('online', onOnline);
    };
  }, [user]);

  const refreshEntitlement = useCallback(async () => {
    if (!user) { setEntitlement(FREE); return; }
    setEntitlement(await fetchEntitlement(user.id));
  }, [user]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectTo() },
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  // Dev-only override: force Pro on so both experiences are one tap apart
  // during development (design §9). Deliberately not gated on `user` — it works
  // on the config-less local dev server too. `false` in production builds.
  const simPro = import.meta.env.DEV && devSimulatePro;

  return {
    user,
    profile: toProfile(user),
    admin: admin && !!user,
    tier: simPro ? 'pro' : user ? entitlement.tier : 'free',
    isPro: simPro || (entitlement.tier === 'pro' && !!user),
    entitlement: user ? entitlement : FREE,
    entitlementLoading: !!user && entitlementLoading,
    loading,
    configured: isSupabaseConfigured,
    signInWithGoogle,
    signOut,
    refreshEntitlement,
    devSimulatePro,
    setDevSimulatePro,
  };
}
