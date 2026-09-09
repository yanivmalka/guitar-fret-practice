# Seasonal palettes

Add four **seasonal colour palettes** (winter / spring / summer / autumn) as an
axis orthogonal to the existing light/dim/dark **mode** (`dark` / `night` /
`day`). The two axes combine into **12** `data-theme` values.

- Branch: `claude/seasonal-palettes` (off `origin/main` @ `b141b62`).
- Design reference (all 12 combos on the home screen):
  <https://claude.ai/code/artifact/b5ef3f24-2fee-48bc-887b-46e258d962ea>

---

## Architecture decision

Two independent preferences, **not** one flat 12-value enum:

| pref key      | values                                   | new? |
|---------------|------------------------------------------|------|
| `pref_theme`  | `dark` \| `night` \| `day` (the *mode*)  | no — unchanged |
| `pref_season` | `winter` \| `spring` \| `summer` \| `autumn` | **yes**, defaults to `winter` |

`useThemeEffect(season, mode)` sets `document.documentElement.dataset.theme` to
`` `${season}-${mode}` `` (e.g. `data-theme="autumn-night"`). Each of the 12
strings has its own token block in `src/styles/00-tokens.css`.

Why this shape:

- **No migration.** `pref_theme` keeps its three original values. A user who
  never touches the new picker gets `pref_season` = `winter`, and
  `winter-dark` is byte-for-byte the old `:root` dark palette, so nothing
  changes for them.
- **Two simple selectors** in Settings instead of one 12-way control.
- Sync already treats settings as an opaque blob — `pref_season` just joins
  the synced-keys set.

`mode` owns the lightness family (surfaces, text, `color-scheme`); `season`
owns the hue personality (accent, warm/cool bias of surfaces, the functional
`--gold` / `--amber` / `--success` / `--danger` tints). They are tuned per
combo, not layered mechanically — a spring accent needs different saturation
on a day ground than on a night ground.

---

## What the skeleton already does (committed on this branch)

| File | Change |
|------|--------|
| `src/utils/theme.ts` | New `ThemeMode` + `Season` types, `SEASONS`, `THEME_MODES`, `themeAttr()`, `MODE_COLOR_SCHEME`, `THEME_BG` (12 entries) + `themeBg()`. `Theme` kept as an alias of `ThemeMode`; `THEMES` / `THEME_COLOR_SCHEME` kept as legacy aliases so un-migrated call sites compile. |
| `src/hooks/useThemeEffect.ts` | Signature is now `(season, mode)`; writes the combined `data-theme`, drives `color-scheme` off the mode and `theme-color` off `themeBg()`. |
| `src/hooks/useAppPreferences.ts` | Adds `season` / `setSeason`, backed by `pref_season` (persists internally, like `setTheme`). |
| `src/App.tsx` | Destructures `season` / `setSeason`; `useThemeEffect(season, theme)`; passes both to `GeneralSettingsSection`. |
| `src/components/settings/sections/GeneralSettingsSection.tsx` | New "Season" `SettingCard` with a 4-way `PickRow`, right after the Theme card. |
| `src/i18n/translations.ts` | `he` entries: Season / Winter / Spring / Summer / Autumn + the help line. |
| `src/utils/settingsSync.ts` | `pref_season` added to `SYNCED_KEYS`. |
| `src/styles/00-tokens.css` | The two `[data-theme='night'/'day']` blocks replaced by **12** `[data-theme='<season>-<mode>']` blocks, plus legacy `night` / `day` blocks retained (they mirror `summer-night` / `winter-day`) for the standalone design labs. |

`npx tsc -b`, `npm run build`, and ESLint on the changed files (except the
pre-existing ref warnings in `App.tsx`) all pass.

---

## What still needs doing

### 1. Palette refinement (the real work)
The 11 non-`winter-dark` blocks are a first careful pass, not final. For each:

- **Text contrast.** `--text-0` / `--text-1` on `--bg-0` / `--bg-2`; the
  chip/button text (`--text-2` on `--surface-border`); the day modes'
  `--text-3` on `--bg-1`. Aim for WCAG AA (4.5:1 body, 3:1 large).
- **Functional colours stay readable.** `--success` / `--danger` /
  `--amber` are used by the mastery heatmap and the correct/wrong feedback;
  they must not disappear into a seasonal ground.
- **`--accent` visibility** on `--bg-0` *and* as a fill behind
  `--accent-ink` text (the Start button, the answered note).
- **`--pick-accent`** — the selector's selection ring. Keep it distinct
  from `--accent` where the season's accent is warm (summer-day points it
  at a sea-blue on purpose).

Quick preview without the picker: in DevTools set
`document.documentElement.dataset.theme = 'summer-day'` (etc.), or use the
new Settings → Season control.

### 2. The two-axis picker UX
Right now it is two stacked `PickRow`s (Theme, then Season). Decide whether
that is enough or whether it should be a combined swatch grid. Check it in
**both** LTR and RTL (`he`) — `PickRow` already handles direction, but eyeball
the 4-across Season row on a narrow phone.

### 3. `--bg-0` ↔ `THEME_BG` sync
`THEME_BG` in `theme.ts` is a hand-copy of each block's `--bg-0`. If you
retune a `--bg-0`, update both. (Optional: a `scripts/check-*.mts` diff that
parses the CSS and asserts equality.)

### 4. Design labs on legacy names
`src/design-preview/` and `src/stats-redesign/` still emit bare
`data-theme="light"` / `"night"`. Left working via the retained legacy
blocks. Migrate them to season-mode names only if you want the labs to
exercise the new palettes; otherwise leave as-is.

### 5. Supabase
**No migration needed.** `user_settings.data` is a free-form JSON blob;
`pref_season` rides along. Confirm a round-trip: set a season, sign in on a
second device, verify it adopts.

### 6. Screenshots / sign-off
Run the app (`npm run dev`), walk the 12 combos on the home screen and on the
drill/by-note screen (the `FretGrid` equaliser is the most colour-sensitive
surface), compare against the design-reference artifact, adjust.

### 7. PR
Target `main`. Suggested title: *Seasonal palettes: four season × three mode
themes*. Call out in the body that `winter-dark` == the old default (no
change for existing users) and that no DB migration is required.

---

## Notes / constraints from the codebase

- Never branch on the theme string directly in components — everything reads
  the CSS custom properties. The only TS that knows the 12 names is
  `theme.ts` + `useThemeEffect.ts`.
- New CSS goes in the matching numbered partial under `src/styles/`; theme
  tokens specifically live in `00-tokens.css`.
- New user-facing copy needs a `he` entry in `src/i18n/translations.ts`.
- There is no test runner. `scripts/check-*.mts` are hand-run; none covers
  theming today.
