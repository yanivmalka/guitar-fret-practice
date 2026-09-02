import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authRedirectTo } from '../utils/supabase';
import { setSyncUser } from '../utils/sync';
import { fetchIsAdmin } from '../utils/board';

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
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

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

  return {
    user,
    profile: toProfile(user),
    admin: admin && !!user,
    loading,
    configured: isSupabaseConfigured,
    signInWithGoogle,
    signOut,
  };
}
