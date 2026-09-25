import { useEffect } from 'react';

// Reflect the seasonal-backdrop preference onto <html> as `data-deco`, next to
// `data-theme` and `data-depth`. CSS (styles/35-seasonal-backdrop.css) hides
// the snow / flowers / leaves layer when it is 'off'. The inline boot script
// in index.html sets the same attribute before mount, so an 'off' pick never
// flashes the decoration on load.
export function useSeasonDecoEffect(seasonDeco: boolean) {
  useEffect(() => {
    document.documentElement.dataset.deco = seasonDeco ? 'on' : 'off';
  }, [seasonDeco]);
}
