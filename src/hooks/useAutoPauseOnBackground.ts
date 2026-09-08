import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { vlog } from '../utils/debugLog';

// Freeze the game (pause, not stop) whenever the app is backgrounded, hidden,
// or closed, so returning to it resumes exactly where it left off instead of
// resetting. Only actually running sessions pause; already-idle/paused state
// is left alone.
export function useAutoPauseOnBackground(pause: () => void, running: boolean) {
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const runningRef = useRef(running);
  runningRef.current = running;
  useEffect(() => {
    const pauseEverything = () => {
      vlog('[voice] pauseEverything', {
        running: runningRef.current,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
      if (runningRef.current) pauseRef.current();
    };

    // `visibilitychange` → hidden is a noisy signal on desktop: some setups
    // (remote-desktop sessions, an undocked/focused DevTools window, brief
    // OS-level occlusion) flip the tab to "hidden" for a moment while the user
    // is still looking at it. That was freezing the game — and killing Voice
    // mode's microphone — mid-round. Genuinely backgrounding the app (switching
    // tab/app, minimising) keeps it hidden for far longer, so wait a short
    // beat and only pause if it is still hidden. Becoming visible again cancels.
    let hiddenTimer: number | null = null;
    const clearHiddenTimer = () => {
      if (hiddenTimer !== null) { clearTimeout(hiddenTimer); hiddenTimer = null; }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearHiddenTimer();
        hiddenTimer = window.setTimeout(() => {
          hiddenTimer = null;
          if (document.hidden) pauseEverything();
        }, 2000);
      } else {
        clearHiddenTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // `pagehide` means the page is actually being torn down — pause at once.
    const onPageHide = () => { clearHiddenTimer(); pauseEverything(); };
    document.addEventListener('pagehide', onPageHide);

    let removeAppStateListener: (() => void) | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) pauseEverything();
    }).then((handle) => { removeAppStateListener = () => handle.remove(); });
    CapacitorApp.addListener('pause', pauseEverything).then((handle) => {
      const prev = removeAppStateListener;
      removeAppStateListener = () => { prev?.(); handle.remove(); };
    });

    return () => {
      clearHiddenTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pagehide', onPageHide);
      removeAppStateListener?.();
    };
  }, [pause]);
}
