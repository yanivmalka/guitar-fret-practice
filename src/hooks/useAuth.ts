import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authRedirectTo } from '../utils/supabase';
import { setSyncUser } from '../utils/sync';

export interface AuthProfile {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
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
    loading,
    configured: isSupabaseConfigured,
    signInWithGoogle,
    signOut,
  };
}
