import { useEffect } from 'react';
import { THEME_BG, THEME_COLOR_SCHEME, type Theme } from '../utils/theme';

// Apply the chosen theme to <html> (not just inside .app) so modals/portals
// that render outside the normal tree still pick up the right token block, and
// keep the color-scheme / theme-color <meta> tags in sync.
export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (colorScheme) colorScheme.setAttribute('content', THEME_COLOR_SCHEME[theme]);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', THEME_BG[theme]);
  }, [theme]);
}
