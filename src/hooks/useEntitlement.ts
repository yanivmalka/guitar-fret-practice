import { useAuth } from './useAuth';
import type { Entitlement, Tier } from '../utils/entitlement';

export interface EntitlementState {
  tier: Tier;
  /** A signed-in user on the Pro tier. */
  isPro: boolean;
  /** The full row — `source` / `expiresAt` for the Pro details in the upsell. */
  entitlement: Entitlement;
  /** True while the first entitlement lookup for the current user is in flight. */
  loading: boolean;
  /** Re-fetch the entitlement now (foreground refresh, post-purchase flow). */
  refresh: () => Promise<void>;
}

/**
 * The one place a component asks "is this user Pro" (design
 * .kiro/specs/free-pro-tiering §1, §4). A thin read over `useAuth()` so call
 * sites don't pull the whole auth object; the underlying state is the same.
 */
export function useEntitlement(): EntitlementState {
  const { tier, isPro, entitlement, entitlementLoading, refreshEntitlement } = useAuth();
  return { tier, isPro, entitlement, loading: entitlementLoading, refresh: refreshEntitlement };
}
