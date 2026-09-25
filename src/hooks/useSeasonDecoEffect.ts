import { useEffect } from 'react';

// Reflect the seasonal-backdrop preference onto <html> as `data-deco`, next to
// `data-theme` and `data-depth`. CSS (styles/35-seasonal-backdrop.css) hides
// the snow / flowers / leaves layer when it is 'off'. The inline boot script
// in index.html starts it 'off' before mount (the layer is Pro and the tier is
// not known yet), so it never flashes in for a Free player on load.
export function useSeasonDecoEffect(seasonDeco: boolean) {
  useEffect(() => {
    document.documentElement.dataset.deco = seasonDeco ? 'on' : 'off';
  }, [seasonDeco]);
}
