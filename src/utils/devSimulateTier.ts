// Dev-only "simulate tier" selector (design .kiro/specs/free-pro-tiering §6.2 /
// §9, extended for the Premium third tier — premium-product-plan.md P0).
//
// Lets a developer flip the app between the real entitlement, forced Pro, and
// forced Premium with no DB change, so all three gated experiences are one tap
// apart. It is ONE tri-state value, never two booleans, so there is no
// ambiguous "both on" state:
//
//   'off'     → use the real entitlement
//   'pro'     → force the effective tier to Pro
//   'premium' → force the effective tier to Premium
//
// `useAuth()` is not context-backed — every `<ProGate>` mounts its own
// instance — so the value lives in this tiny external store and every instance
// reacts through `useSyncExternalStore` the moment the debug-panel control
// changes, with no reload.
//
// Every entry point is guarded by `import.meta.env.DEV`, so a production build
// constant-folds `getDevSimulateTier` to `'off'` and drops the setter body and
// the localStorage key entirely.

export type SimTier = 'off' | 'pro' | 'premium';

const KEY = 'devSimulateTier';
// The old two-state flag this replaces: `devSimulatePro` held '1' for Pro.
// Read once for a seamless migration, then cleared on the next `set`.
const LEGACY_KEY = 'devSimulatePro';
const listeners = new Set<() => void>();

function readInitial(): SimTier {
  if (!import.meta.env.DEV) return 'off';
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'pro' || v === 'premium' || v === 'off') return v;
    if (localStorage.getItem(LEGACY_KEY) === '1') return 'pro';
  } catch { /* ignore */ }
  return 'off';
}

let current: SimTier = readInitial();

export function getDevSimulateTier(): SimTier {
  return current;
}

export function subscribeDevSimulateTier(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function setDevSimulateTier(tier: SimTier): void {
  if (!import.meta.env.DEV) return;
  current = tier;
  try {
    if (tier === 'off') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, tier);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
  for (const fn of listeners) fn();
}
