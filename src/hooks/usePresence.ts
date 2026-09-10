import { useSyncExternalStore } from 'react';
import {
  subscribePresence,
  getPresenceCounts,
  type PresenceCounts,
} from '../utils/presence';

/**
 * Live counts of who's using the app right now — distinct signed-in accounts
 * and connected guests — from the shared Realtime Presence channel. Zeroes
 * until the channel syncs, and forever on a config-less build. The channel
 * itself is started once, app-wide, from <App>.
 */
export function usePresence(): PresenceCounts {
  return useSyncExternalStore(
    subscribePresence,
    getPresenceCounts,
    getPresenceCounts,
  );
}
