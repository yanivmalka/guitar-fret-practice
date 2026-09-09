// Guards the one hand-maintained duplication in the seasonal-palette theming:
// `THEME_BG` in src/utils/theme.ts is a copy of each `--bg-0` declared by the
// 12 `[data-theme='<season>-<mode>']` blocks in src/styles/00-tokens.css.
// App.tsx pushes THEME_BG into <meta name="theme-color">, so a retuned --bg-0
// that is not copied across leaves the browser chrome the wrong colour with
// nothing in the UI to hint at it.
//
// No test runner in this repo — run by hand, never part of `npm run build`,
// same spirit as scripts/check-game-progress.mts:
//
//   node --experimental-strip-types scripts/check-theme-tokens.mts
//
// It checks:
//   1. the CSS declares exactly the 12 season × mode blocks (no missing pair,
//      no stray combination), each with a --bg-0,
//   2. THEME_BG has an entry for every one of them and no extra keys,
//   3. every --bg-0 equals its THEME_BG counterpart.
//
// Legacy single-axis blocks (`[data-theme='night'/'day']`) are ignored on
// purpose: they are not part of the (season, mode) matrix.

import { readFileSync } from 'node:fs';

const { SEASONS, THEME_MODES, THEME_BG, themeAttr } =
  await import('../src/utils/theme.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const cssUrl = new URL('../src/styles/00-tokens.css', import.meta.url);
const css = readFileSync(cssUrl, 'utf8')
  // Comments may hold example token values; drop them before parsing.
  .replace(/\/\*[\s\S]*?\*\//g, '');

// ── Pull `--bg-0` out of every [data-theme='<season>-<mode>'] block ──────
const seasonSet = new Set<string>(SEASONS);
const modeSet = new Set<string>(THEME_MODES);
const cssBg = new Map<string, string>();
const blockRe = /\[data-theme=['"]([a-z-]+)['"]\]\s*\{([^}]*)\}/g;
for (const [, attr, body] of css.matchAll(blockRe)) {
  const dash = attr.indexOf('-');
  const season = attr.slice(0, dash);
  const mode = attr.slice(dash + 1);
  // Skip the retained legacy blocks — only the two-axis matrix is checked.
  if (dash < 0 || !seasonSet.has(season) || !modeSet.has(mode)) continue;
  const bg = /(?:^|[;{\s])--bg-0:\s*([^;]+);/.exec(body);
  if (bg) cssBg.set(attr, bg[1].trim().toLowerCase());
  else check(`[data-theme='${attr}'] declares --bg-0`, false);
}

// ── 1. The CSS covers the whole matrix, and nothing outside it ──────────
const expected = SEASONS.flatMap(s => THEME_MODES.map(m => themeAttr(s, m)));
const missingCss = expected.filter(k => !cssBg.has(k));
check(`00-tokens.css declares all ${expected.length} season × mode blocks with a --bg-0`,
  missingCss.length === 0, missingCss.join(', '));
check('00-tokens.css declares no extra season × mode block',
  cssBg.size === expected.length,
  [...cssBg.keys()].filter(k => !expected.includes(k)).join(', '));

// ── 2. THEME_BG covers exactly the same keys ────────────────────────────
const themeKeys = Object.keys(THEME_BG);
const missingTs = expected.filter(k => !(k in THEME_BG));
const extraTs = themeKeys.filter(k => !expected.includes(k));
check('THEME_BG has an entry for every season × mode pair',
  missingTs.length === 0, missingTs.join(', '));
check('THEME_BG has no key outside the matrix', extraTs.length === 0, extraTs.join(', '));

// ── 3. Every --bg-0 matches its THEME_BG counterpart ────────────────────
const mismatches: string[] = [];
for (const key of expected) {
  const fromCss = cssBg.get(key);
  const fromTs = THEME_BG[key]?.trim().toLowerCase();
  if (fromCss === undefined || fromTs === undefined) continue; // already reported
  if (fromCss !== fromTs) mismatches.push(`${key}: css --bg-0 ${fromCss} ≠ THEME_BG ${fromTs}`);
}
check('every --bg-0 equals its THEME_BG value', mismatches.length === 0);
for (const m of mismatches) console.error(`      ${m}`);

console.log(failures === 0
  ? '\nAll theme token checks passed.'
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
