// Dev-only "simulate Pro" flag (design .kiro/specs/free-pro-tiering §6.2 / §9).
//
// `useAuth()` is not context-backed — every `<ProGate>` mounts its own
// instance — so the flag lives in this tiny external store instead of per-hook
// state, and every instance reacts through `useSyncExternalStore` the moment
// the debug-panel toggle flips, with no reload.
//
// Every entry point is guarded by `import.meta.env.DEV`, so a production build
// constant-folds `getDevSimulatePro` to `false` and drops the setter body and
// the localStorage key entirely (verified by grepping `dist/`).

const KEY = 'devSimulatePro';
const listeners = new Set<() => void>();

let current: boolean = (() => {
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
})();

export function getDevSimulatePro(): boolean {
  return current;
}

export function subscribeDevSimulatePro(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function setDevSimulatePro(on: boolean): void {
  if (!import.meta.env.DEV) return;
  current = on;
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  for (const fn of listeners) fn();
}
