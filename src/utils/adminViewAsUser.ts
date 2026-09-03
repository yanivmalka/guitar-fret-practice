// Admin "view as a regular user" toggle.
//
// An app admin (a row in `public.admins`) can flip this from the Account tab to
// hide every admin-only control and see the app exactly as a non-admin does —
// handy for checking the standard experience from their own account. The switch
// back to admin mode is always offered in the Account tab, gated on the *real*
// admin flag so a non-admin can never surface it.
//
// This is a client-side view change only: it masks the `admin` flag that
// `useAuth()` exposes to the UI. It does NOT change RLS or what the database
// will actually let the account do.
//
// Backed by a tiny external store (not per-hook state) so every independent
// `useAuth()` instance re-renders together the moment it flips, with no reload
// — same rationale as `devSimulatePro`. Unlike that flag this one ships in
// production, so it is not `import.meta.env.DEV`-gated.

const KEY = 'adminViewAsUser';
const listeners = new Set<() => void>();

let current: boolean = (() => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
})();

export function getAdminViewAsUser(): boolean {
  return current;
}

export function subscribeAdminViewAsUser(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function setAdminViewAsUser(on: boolean): void {
  current = on;
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* storage disabled — the in-memory value still drives the UI */ }
  for (const fn of listeners) fn();
}
