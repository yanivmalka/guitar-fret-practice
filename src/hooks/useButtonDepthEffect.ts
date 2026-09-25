import { useEffect } from 'react';

// Reflect the button-depth preference onto <html> as `data-depth`, next to
// `data-theme` and `data-hand`, so portals and modals pick it up too. CSS
// (styles/31-button-depth.css) draws the raised-button look off this.
export function useButtonDepthEffect(buttonDepth: boolean) {
  useEffect(() => {
    document.documentElement.dataset.depth = buttonDepth ? 'on' : 'off';
  }, [buttonDepth]);
}
