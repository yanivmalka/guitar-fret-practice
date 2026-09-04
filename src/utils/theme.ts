// Theme selection. 'dark' is the original app look (and the default);
// 'night' is a warmer, dimmer palette for a fully dark room; 'day' is a
// light palette. See src/styles/00-tokens.css for the actual token
// values each one drives via `data-theme` on <html>.
export type Theme = 'dark' | 'night' | 'day';

export const THEMES: readonly Theme[] = ['dark', 'night', 'day'];

// Primary background per theme, kept here so App.tsx can push it into
// <meta name="theme-color"> without re-reading the CSS tokens.
export const THEME_BG: Record<Theme, string> = {
  dark: '#1a1a2e',
  night: '#14100c',
  day: '#f4f5fb',
};

// 'dark' and 'night' are both dark-family palettes (mobile browsers should
// not auto-re-tint their low-saturation colors); only 'day' is light.
export const THEME_COLOR_SCHEME: Record<Theme, 'dark' | 'light'> = {
  dark: 'dark',
  night: 'dark',
  day: 'light',
};
