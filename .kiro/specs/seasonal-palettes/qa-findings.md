# Seasonal palettes — QA findings

Final QA of the four-seasons feature after `claude/seasonal-palettes-a` /
`-b` / `-c` / `-d` were folded back together and `origin/main` was merged in.
PR branch: `claude/seasonal-palettes-pr`.

## Method

- **Integration**: four `--no-ff` merges of the sub-branches into a clean
  line off `c4805b4`, then `origin/main` merged in. `tsc -b`,
  `npm run build`, `npm run lint` (0 errors) and
  `scripts/check-theme-tokens.mts` all pass.
- **Visual**: automated screenshot pass (headless Chrome, 430×932 @2x) over
  **all 12** (season × mode) combos, on the home screen and both drill
  modes — the Note-by-Fret wheel and the Fret-by-Note grid.
- **Contrast**: WCAG contrast ratios computed for every one of the 12 token
  blocks, for the pairs the spec's §1 calls out (text on surfaces, accent on
  bg, accent-ink on accent, functional colours on bg, pick-accent vs accent,
  heat-unplayed vs surface).
- **Reference**: compared against the design-reference artifact
  `b5ef3f24-2fee-48bc-887b-46e258d962ea`. Note the shipped palettes
  deliberately diverge from that mock where branches -a/-b/-c/-d refined
  contrast and pick-accent distinctness — the mock is the starting point,
  not the target.

## Not covered — needs a manual / interactive pass

- **Round-results screen** and **mastery overlays** (note-circle + the
  `ProgressPanel` fretboard heatmap) — both need seeded game history;
  driving them headless was too brittle to trust.
- **RTL (`he`)** layout of the new `AppearancePicker` (branch -c). Only an
  LTR screenshot of the settings menu was captured.
- **Cross-device sync** round-trip for `pref_season` — needs a real Google
  sign-in.

---

## Findings

`P2` = worth fixing before this reaches users · `P3` = polish / follow-up.

### 1. [P3] `autumn-dark` — `--pick-accent` was ≈ `--accent`  ✅ fixed here

Home screen, Selector pick controls (string / mode / difficulty). The old
value `#e0913f` is a dimmer shade of the same orange as `--accent`
(`#ff8a3d`), so the selection ring did not read as a distinct signal — the
exact case spec §1 warns about for warm-accent seasons. Sibling blocks
`autumn-night` / `autumn-day` were already given contrasting pick-accents by
branch -b; `autumn-dark` was missed.

**Fix applied** in the `autumn-dark` block of `00-tokens.css`:
`--pick-accent: #e0913f` → `#c9a15a` (matches `autumn-night`; a muted gold
that separates cleanly from the bright orange accent).

### 2. [P3] `summer-dark` — `--pick-accent` was ≈ `--accent`  ✅ fixed here

Home screen. The old value `#40c9d9` and `--accent` `#23d6c4` are both
cyan/turquoise; the "Dots" border (pick-accent) and the Play ring (accent)
looked like one colour. `summer-night` already leans bluer with `#5fbfd9`.

**Fix applied** in the `summer-dark` block of `00-tokens.css`:
`--pick-accent: #40c9d9` → `#5fbfd9` (matches `summer-night`; bluer, away
from the green-teal accent).

### 3. [P2] Day modes — `--text-2` below AA body contrast on card surfaces

| combo        | `--text-2` on `--bg-2` |
|--------------|------------------------|
| `winter-day` | 3.95 : 1 |
| `spring-day` | 3.72 : 1 |
| `summer-day` | 4.14 : 1 |
| `autumn-day` | 3.99 : 1 |

All below the 4.5 : 1 body target (baseline `winter-dark` is 6.6 : 1). In the
**shipped** UI `--text-2` is only used for bold chip labels and the burger
icon — large text, ≥ 3 : 1, which all four pass — so this is not a live AA
failure today. But any future body-copy use of `--text-2` on a day ground
would fail. These match the design-reference values. Left for discussion
(touches 4 blocks): if `--text-2` is ever promoted to body text, darken it
~6–8 % in the four day blocks.

### 4. [P2] Day modes — very low surface separation (washed-out cards)

`spring-day` and `autumn-day` worst; `winter-day` / `summer-day` milder.
`--bg-0` / `--bg-2` / `--surface-border` sit within ~4–6 % lightness of each
other, so cards and the note-circle barely detach from the page ground
(clearly visible in the home screenshots). Matches the design-reference
palette exactly — a design-intent question, not a merge regression. If more
card definition is wanted, nudge `--surface-border` darker, e.g. `spring-day`
`#d0e0ce` → ~`#c2d6bf`, `autumn-day` `#ded0b8` → ~`#d0bfa0`.

### 5. [P2] `autumn-night` — generally murky / low contrast

Home + both drills. `--bg-0 #170e09` / `--bg-2 #1d110b` / `--bg-3 #281710` /
`--surface-border #3c2a1c` are all near-black warm browns; the string pills
and mode-card outlines nearly disappear against the ground — noticeably
worse than `autumn-dark`, which has more surface lift. `--pick-accent
#c9a15a` is also very dim on this ground. Matches the design-reference
values; the weakest of the 12. Suggest lifting `--surface-border` toward
`#4a3524` and `--bg-3` toward `#301d13`. Left for discussion — multi-token.

### 6. [P3] Mastery equaliser bars are theme-independent (pre-existing)

`masteryColor()` in `src/utils/mastery.ts` returns hard-coded `hsl()`
(red → green → grey), so the FretGrid / NoteCircle mastery overlay does
**not** tint per season. A bright `hsl` bar and its `100%` label sit
off-palette on the warm (`summer-night`, `autumn-*`) and light (`*-day`)
grounds, and the pale label is hard to read on day grounds. This is
**pre-existing** and deliberate (the code comment: "colour alone carries the
signal"), not introduced by the seasonal work — but the seasonal grounds
make the mismatch more visible. The separate `ProgressPanel` heatmap *does*
use `--heat-unplayed` / `--amber` / `--success` and is theme-aware. No change
proposed; flagged for awareness. Not visually verified with seeded data.

### 7. [P3] `--heat-unplayed` barely separates from `--bg-2` in some blocks

`winter-day` Δ≈8, `autumn-night` Δ≈10, `autumn-day` Δ≈10 (RGB distance; the
`winter-dark` baseline is Δ≈38). If a whole mastery grid is unplayed it may
read as blank. The design-reference is also low here, so likely intentional
(unplayed = recede). Verify against the `ProgressPanel` overlay with real
data before changing.

---

## Verified OK

- **`winter-dark` is byte-identical** to the pre-seasons `:root` dark
  palette — checked against `origin/main`: `--bg-0 #1a1a2e`, `--accent #0ff`,
  `--success #34e07a`, `--danger #ff5470`, `--heat-unplayed #24244a`,
  `--pick-accent #4af`. Existing users on the defaults see no change.
- `check-theme-tokens.mts`: all 12 `--bg-0` ↔ `THEME_BG` in sync; exactly
  the 12 season × mode blocks, no stray or missing pair.
- `--text-0` / `--text-1` / `--accent` on `--bg-0`, and `--accent-ink` on
  `--accent`: pass in all 12 combos.
- `winter-night`, `spring-dark/night/day`, `summer-night`, `autumn-night`,
  `autumn-day` — `--pick-accent` is a distinct hue from that block's
  `--accent` (branches -a / -b refinements working as intended).
- `tsc -b`, `npm run build`, `npm run lint` (0 errors) on the merged branch.
