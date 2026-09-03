// Free vs Pro entitlement data access (design .kiro/specs/free-pro-tiering
// §3.2). Mirrors `fetchIsAdmin` in utils/board.ts: one shared Supabase
// client, a safe default (`FREE`) on any error or when `!supabase`.
//
// Read model: absence of a row = Free. A row with tier='pro' and
// (expires_at is null or expires_at > now()) = Pro; an expired row = Free.
// Expiry is checked here against the client clock, so a caller that sees
// `tier: 'pro'` can trust it without re-checking `expiresAt`.
//
// Fail open on read failure, fail closed on absence: a network / Supabase
// error falls back to the last value cached in localStorage; with no cache,
// the user is treated as Free.

import { supabase } from './supabase';

export type Tier = 'free' | 'pro';

export interface Entitlement {
  tier: Tier;
  /** ISO timestamp; null = never expires. Already checked against now() by
   *  the time a caller sees `tier: 'pro'`. */
  expiresAt: string | null;
  source: string;
}

export const FREE: Entitlement = { tier: 'free', expiresAt: null, source: 'none' };

const cacheKey = (userId: string) => `entitlementCache:${userId}`;

interface CacheRecord {
  value: Entitlement;
  fetchedAt: number;
}

/** Last entitlement persisted for this user, or null if none / unreadable.
 *  Used to seed `useAuth` synchronously (no Pro→free flicker on reload) and
 *  as the offline fallback when a fetch fails. */
export function cachedEntitlement(userId: string): Entitlement | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const rec = JSON.parse(raw) as CacheRecord;
    return rec?.value ?? null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: Entitlement): void {
  try {
    const rec: CacheRecord = { value, fetchedAt: Date.now() };
    localStorage.setItem(cacheKey(userId), JSON.stringify(rec));
  } catch {
    /* storage full / disabled — the fetch still returned a usable value */
  }
}

/** The signed-in user's entitlement. Returns FREE on any error, when
 *  unconfigured, offline with no cache, or when the row is missing / expired.
 *  On a successful read the result is cached for offline fallback. */
export async function fetchEntitlement(userId: string): Promise<Entitlement> {
  if (!supabase) return FREE;

  const { data, error } = await supabase
    .from('entitlements')
    .select('tier, expires_at, source')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return cachedEntitlement(userId) ?? FREE;
  if (!data) return FREE;

  const expiresAt: string | null = data.expires_at ?? null;
  const live = data.tier === 'pro'
    && (expiresAt === null || Date.parse(expiresAt) > Date.now());

  const result: Entitlement = live
    ? { tier: 'pro', expiresAt, source: data.source ?? 'manual' }
    : FREE;

  writeCache(userId, result);
  return result;
}
