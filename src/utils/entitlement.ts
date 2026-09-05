// Free / Pro / Premium entitlement data access (design .kiro/specs/free-pro-tiering
// §3.2, extended for the Premium third tier — premium-product-plan.md P0).
// Mirrors `fetchIsAdmin` in utils/board.ts: one shared Supabase client, a safe
// default (`FREE`) on any error or when `!supabase`.
//
// Read model: absence of a row = Free. A row with tier='pro' | 'premium' and
// (expires_at is null or expires_at > now()) = that tier; an expired row =
// Free. Expiry is checked here against the client clock, so a caller that sees
// a paid `tier` can trust it without re-checking `expiresAt`.
//
// Tiers are ranked (`free < pro < premium`) and Premium includes everything
// Pro includes: gate on `tierAtLeast(tier, min)` rather than `tier === 'pro'`.
//
// Fail open on read failure, fail closed on absence: a network / Supabase
// error falls back to the last value cached in localStorage; with no cache,
// the user is treated as Free.

import { supabase } from './supabase';

export type Tier = 'free' | 'pro' | 'premium';

/** Ordinal rank of each tier. Higher includes everything lower. The single
 *  source of truth for tier comparisons — `features.ts` reads it too. */
export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, premium: 2 };

/** True when `tier` is at least `min` in the ranking (`free < pro < premium`).
 *  This is how every "does this user get feature X" check should be phrased so
 *  Premium is never accidentally excluded from a Pro-or-better gate. */
export function tierAtLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

export interface Entitlement {
  tier: Tier;
  /** ISO timestamp; null = never expires. Already checked against now() by
   *  the time a caller sees a paid `tier`. */
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
  // Any known paid tier counts; an unknown / future value is treated as Free
  // rather than trusted. A `premium` row must resolve to `premium` here — the
  // old `=== 'pro'` check would have silently dropped it to Free.
  const paidTier: Tier | null =
    data.tier === 'pro' || data.tier === 'premium' ? data.tier : null;
  const live = paidTier !== null
    && (expiresAt === null || Date.parse(expiresAt) > Date.now());

  const result: Entitlement = live
    ? { tier: paidTier, expiresAt, source: data.source ?? 'manual' }
    : FREE;

  writeCache(userId, result);
  return result;
}

/**
 * Admin self-serve grant/revoke of a paid tier for the caller's OWN account
 * (0010_admin_entitlement_toggle.sql). A paid tier (`'pro'` | `'premium'`)
 * upserts a non-expiring `source='comp'` row; `'free'` deletes the row. The
 * RLS policy still requires the caller to be in `public.admins`, to be
 * touching their own row and to use `source='comp'`, so a non-admin call
 * fails at the database. On success the offline cache is updated so the
 * change survives a reload before the next `fetchEntitlement`. Throws when
 * Supabase is unconfigured or the write is rejected.
 */
export async function setOwnEntitlement(userId: string, tier: Tier): Promise<Entitlement> {
  if (!supabase) throw new Error('Supabase is not configured');

  if (tier === 'free') {
    const { error } = await supabase
      .from('entitlements')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('entitlements')
      .upsert({ user_id: userId, tier, source: 'comp', expires_at: null });
    if (error) throw error;
  }

  const result: Entitlement =
    tier === 'free' ? FREE : { tier, expiresAt: null, source: 'comp' };
  writeCache(userId, result);
  return result;
}
