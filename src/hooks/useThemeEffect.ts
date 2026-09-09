import { useEffect } from 'react';
import {
  MODE_COLOR_SCHEME, themeAttr, themeBg, type Season, type ThemeMode,
} from '../utils/theme';

// Apply the chosen (season, mode) to <html> (not just inside .app) so
// modals/portals that render outside the normal tree still pick up the right
// token block, and keep the color-scheme / theme-color <meta> tags in sync.
export function useThemeEffect(season: Season, mode: ThemeMode) {
  useEffect(() => {
    document.documentElement.dataset.theme = themeAttr(season, mode);
    const colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (colorScheme) colorScheme.setAttribute('content', MODE_COLOR_SCHEME[mode]);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', themeBg(season, mode));
  }, [season, mode]);
}
