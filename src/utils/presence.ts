// Live "who's using the app right now" counter, via Supabase Realtime Presence.
//
// One shared channel (`community-presence`); every open tab tracks a tiny
// payload announcing whether it's a signed-in user or a guest. `presenceState()`
// then gives us everyone currently connected, which we reduce to two numbers:
//
//   users  — distinct signed-in accounts (deduped by uid, so two tabs of the
//            same account count once)
//   guests — connected tabs with no session
//
// No table, no writes, no schema — Presence state lives only in the Realtime
// server for the life of the connection. Works with the anon key, so guests
// are counted too. A config-less build (`supabase` is null) makes every entry
// point a no-op and the counts stay at zero.
//
// This is a module-level singleton read through `useSyncExternalStore`
// (`src/hooks/usePresence.ts`), the same pattern as `devSimulateTier.ts` —
// `useAuth()` isn't context-backed, so the channel must live outside React and
// be started once, app-wide, from <App>.

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { verror } from './debugLog';

export interface PresenceCounts { users: number; guests: number }

const CHANNEL = 'community-presence';
const listeners = new Set<() => void>();

let snapshot: PresenceCounts = { users: 0, guests: 0 };
let channel: RealtimeChannel | null = null;
let selfUid: string | null = null;
// A per-tab key so two tabs of the same guest are two presence entries.
const tabKey =
  (globalThis.crypto?.randomUUID?.() ?? `tab-${Math.random().toString(36).slice(2)}`);

function emit() {
  for (const fn of listeners) fn();
}

function recompute() {
  if (!channel) return;
  const state = channel.presenceState<{ kind: 'user' | 'guest'; uid?: string }>();
  const uids = new Set<string>();
  let guests = 0;
  let anonUsers = 0;
  for (const entries of Object.values(state)) {
    for (const e of entries) {
      if (e.kind === 'user') {
        if (e.uid) uids.add(e.uid);
        else anonUsers++;
      } else {
        guests++;
      }
    }
  }
  const next: PresenceCounts = { users: uids.size + anonUsers, guests };
  if (next.users !== snapshot.users || next.guests !== snapshot.guests) {
    snapshot = next;
    emit();
  }
}

function trackSelf() {
  if (!channel) return;
  const payload = selfUid
    ? { kind: 'user' as const, uid: selfUid }
    : { kind: 'guest' as const };
  void channel.track(payload);
}

/** Start the presence channel. Idempotent; no-op without Supabase. */
export function startPresence(): void {
  if (channel || !supabase) return;
  channel = supabase.channel(CHANNEL, {
    config: { presence: { key: tabKey } },
  });
  channel
    .on('presence', { event: 'sync' }, recompute)
    .on('presence', { event: 'join' }, recompute)
    .on('presence', { event: 'leave' }, recompute)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') trackSelf();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        verror('[presence] channel status', status);
      }
    });
}

/** Re-announce this tab as a signed-in user or a guest when auth changes. */
export function setPresenceIdentity(user: User | null): void {
  const uid = user?.id ?? null;
  if (uid === selfUid) return;
  selfUid = uid;
  trackSelf();
}

export function stopPresence(): void {
  if (!channel || !supabase) return;
  void supabase.removeChannel(channel);
  channel = null;
}

export function subscribePresence(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function getPresenceCounts(): PresenceCounts {
  return snapshot;
}
