// Theme selection has two orthogonal axes that combine into one
// `data-theme="<season>-<mode>"` string on <html> (set in App.tsx from the
// `pref_theme` + `pref_season` settings; see src/hooks/useThemeEffect.ts):
//
//   • mode   — 'dark' (the original app look, and the default), 'night'
//              (warmer / dimmer, for a dark room), 'day' (light).
//   • season — 'winter' (the default; reproduces the pre-seasons look),
//              'spring', 'summer', 'autumn'.
//
// The 12 resulting token blocks live in src/styles/00-tokens.css.
//
// `pref_theme` keeps its original 'dark' | 'night' | 'day' values, so no
// migration is needed; `pref_season` is new and defaults to 'winter'.

export type ThemeMode = 'dark' | 'night' | 'day';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

// Back-compat alias: `Theme` used to name the mode axis. Kept so existing
// imports keep compiling while call sites migrate to `ThemeMode`.
export type Theme = ThemeMode;

export const THEME_MODES: readonly ThemeMode[] = ['dark', 'night', 'day'];
export const SEASONS: readonly Season[] = ['winter', 'spring', 'summer', 'autumn'];

export const DEFAULT_MODE: ThemeMode = 'dark';
export const DEFAULT_SEASON: Season = 'winter';

// The `data-theme` attribute value for a (season, mode) pair.
export function themeAttr(season: Season, mode: ThemeMode): string {
  return `${season}-${mode}`;
}

// color-scheme depends only on the mode: 'day' is light; 'dark' and 'night'
// are both dark-family, so mobile browsers must not auto-re-tint them.
export const MODE_COLOR_SCHEME: Record<ThemeMode, 'dark' | 'light'> = {
  dark: 'dark',
  night: 'dark',
  day: 'light',
};

// Primary background per (season, mode), kept here so App.tsx can push it
// into <meta name="theme-color"> without re-reading the CSS tokens. Each
// value mirrors the `--bg-0` of the matching block in
// src/styles/00-tokens.css — keep the two in sync.
export const THEME_BG: Record<string, string> = {
  'winter-dark': '#1a1a2e', 'winter-night': '#0f1320', 'winter-day': '#eef2f8',
  'spring-dark': '#14201a', 'spring-night': '#12140d', 'spring-day': '#f1f7f0',
  'summer-dark': '#241009', 'summer-night': '#16110b', 'summer-day': '#fff2c9',
  'autumn-dark': '#201410', 'autumn-night': '#170e09', 'autumn-day': '#f8f1e6',
};

export function themeBg(season: Season, mode: ThemeMode): string {
  return THEME_BG[themeAttr(season, mode)] ?? THEME_BG['winter-dark'];
}

// ── Legacy exports ────────────────────────────────────────────────────
// Kept so un-migrated call sites (which still think in a single 3-value
// axis) go on compiling. New code should use THEME_MODES / MODE_COLOR_SCHEME
// / themeBg() instead.
export const THEMES = THEME_MODES;
export const THEME_COLOR_SCHEME = MODE_COLOR_SCHEME;
