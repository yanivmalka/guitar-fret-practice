// Community stats for the Account screen's "About" tile.
//
// One number, fetched once: the total registered-account count, via the
// `public.registered_user_count()` SECURITY DEFINER RPC (migration 0016).
// Best-effort like every other data helper — a config-less guest build
// (`supabase` is null) or any error returns null and the tile just hides the
// number. The last good value is cached in localStorage so a figure still
// shows while offline / before the network answers.

import { supabase } from './supabase';
import { verror } from './debugLog';

const CACHE_KEY = 'communityRegisteredCount';

export function cachedRegisteredUserCount(): number | null {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export async function fetchRegisteredUserCount(): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('registered_user_count');
    if (error) throw error;
    const n = Number(data);
    if (!Number.isFinite(n) || n < 0) return null;
    try { localStorage.setItem(CACHE_KEY, String(n)); } catch { /* ignore */ }
    return n;
  } catch (e) {
    verror('[communityStats] registered_user_count failed', e);
    return null;
  }
}
