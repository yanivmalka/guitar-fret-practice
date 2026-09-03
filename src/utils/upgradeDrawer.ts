// A tiny module-level channel so a locked <ProGate> anywhere in the tree can
// open the `upgrade` drawer section (design .kiro/specs/free-pro-tiering §2.5).
// App.tsx owns the drawer state and registers the handler on mount; ProGate
// just calls `openUpgrade()`. Mirrors the `setSyncUser` singleton in
// utils/sync.ts rather than threading a callback prop through every gate.

type Handler = () => void;

let handler: Handler | null = null;

/** App.tsx registers a handler that sets `drawerSection = 'upgrade'`; passes
 *  `null` on unmount. */
export function registerUpgradeHandler(h: Handler | null): void {
  handler = h;
}

/** Open the Pro upsell drawer section. No-op if nothing is registered yet
 *  (e.g. Supabase unconfigured, so the section does not exist). */
export function openUpgrade(): void {
  handler?.();
}
