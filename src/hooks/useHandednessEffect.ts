import { useEffect } from 'react';

// Reflect the left-handed preference onto <html> as `data-hand`, next to
// `data-theme`. CSS keys the fretboard mirror and the chrome side-swap off
// this attribute; setting it on the root (not inside .app) means portals and
// modals pick it up too. `data-hand` is deliberately separate from `dir`:
// language direction and handedness are independent axes.
export function useHandednessEffect(leftHanded: boolean) {
  useEffect(() => {
    document.documentElement.dataset.hand = leftHanded ? 'left' : 'right';
  }, [leftHanded]);
}
