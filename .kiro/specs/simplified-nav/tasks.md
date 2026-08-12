# Tasks: Simplified Navigation Selector Panel

## References

- #[[.kiro/specs/simplified-nav/requirements.md]]
- #[[.kiro/specs/simplified-nav/design.md]]

---

## Task 1: Create `useSelector` hook with state, persistence, and derived settings

**Requirements**: US-1, US-2, US-3, US-4, US-5

**File**: `src/hooks/useSelector.ts`

### Steps

1. Define the `SelectorState` interface and `Difficulty` type.
2. Initialize state from localStorage using `loadSetting` (keys: `sel_strings`, `sel_multi`, `sel_mode`, `sel_lower`, `sel_upper`, `sel_difficulty`).
3. Implement setter functions that update state and persist to localStorage via `saveSetting`.
4. Implement `onStringSelect(stringNum)`:
   - If `multiMode` is false: replace `selectedStrings` with `[stringNum]`.
   - If `multiMode` is true: toggle `stringNum` in the array (no minimum — even 1 is fine).
5. Implement `onMultiToggle()`:
   - Toggle `multiMode`. If turning off, keep only the last-selected string.
6. Implement `onFretRangeToggle(half)`:
   - Toggle the specified half. If toggling off would leave both inactive, no-op.
7. Implement `deriveSettings()` that computes `guitarString`, `multiStrings`, `fretFrom`, `fretTo`, `byNote`, `dotsOnly`, `wholeToneOnly`, `time`, and `maxQuestions` from current state.
   - `multiStrings` is populated only when `multiMode` is true AND 2+ strings are selected; otherwise empty array.
8. Implement `historyKey(state)` function that returns the stable string key for history lookup.
9. Export the hook returning state, setters, derived settings, and `historyKey`.

### Verification

- Build passes (`npm run build`).
- Hook can be instantiated in isolation (no runtime errors on import).

---

## Task 2: Update `useHistory` to use string-based keys

**Requirements**: US-5

**File**: `src/hooks/useHistory.ts`

### Steps

1. Change `allHistory` state type from `Record<number, HistoryEntry[]>` to `Record<string, HistoryEntry[]>`.
2. Update `addEntry` to accept a `key: string` parameter (the history key from `useSelector`).
3. Update `clearStage` to accept a `key: string`.
4. Persist `allHistory` to localStorage under `'selectorHistory'` key on each change.
5. On hook initialization, load from `'selectorHistory'` (old integer-keyed data is ignored — fresh start).
6. Add a `getEntriesForKey(key: string): HistoryEntry[]` helper.

### Verification

- Build passes.
- TypeScript reports no type errors in `useHistory.ts`.

---

## Task 3: Build `SelectorPanel` component — StringRow and ModeToggle

**Requirements**: US-1, US-2

**File**: `src/components/SelectorPanel.tsx`

### Steps

1. Create `SelectorPanel` component with the full props interface.
2. Implement **StringRow** section:
   - Render 7 pills: E(6), A(5), D(4), G(3), B(2), E(1), Multi.
   - Bold text on all pills. Apply `.active` class based on `selector.selectedStrings` and `selector.multiMode`.
   - Wire `onClick` to `onStringSelect` / `onMultiToggle`.
3. Implement **ModeToggle** section:
   - Render two cards with inline SVG icons (circle-of-fifths sketch for "By Note", number grid for "By Fret").
   - Apply `.active` class based on `selector.mode`.
   - Wire `onClick` to `onModeSelect`.
4. Export default `SelectorPanel`.

### Verification

- Build passes.
- Component renders without crashing (confirm via `npm run dev` in browser).

---

## Task 4: Build `SelectorPanel` — FretRangeNeck SVG

**Requirements**: US-3

**File**: `src/components/SelectorPanel.tsx` (add to existing component)

### Steps

1. Create an inline SVG with `viewBox="0 0 400 60"` (approximate — tunable).
2. Draw the fretboard background (wood-colored rectangle).
3. Draw the nut as a thick white/cream vertical line on the left edge.
4. Draw fret lines at proportional positions for frets 1–21.
5. Draw dot markers as circles at frets 3, 5, 7, 9, 12 (double dot), 15, 17, 19, 21.
6. Draw a small guitar body silhouette (rounded shape) on the right edge.
7. Overlay two transparent `<rect>` elements as tap targets:
   - Left half: frets 0–12. Right half: frets 12–21.
   - Each has `onClick` wired to `onFretRangeToggle`.
8. Apply `.inactive` class (opacity + desaturation) to the half that is not active based on `selector.lowerActive` / `selector.upperActive`.

### Verification

- Build passes.
- Visual inspection: SVG renders correctly at mobile width (~375px) and tablet width (~768px).
- Tapping each half toggles its state visually.

---

## Task 5: Build `SelectorPanel` — DifficultyRoad

**Requirements**: US-4

**File**: `src/components/SelectorPanel.tsx` (add to existing component)

### Steps

1. Render three buttons in a flex row with SVG arrow connectors between them.
2. Each button shows: text icon (`●` / `♮` / `♯♭`) and label ("Dots" / "Naturals" / "Full").
3. Active button gets `.active` class (highlighted border/background).
4. Wire `onClick` to `onDifficultySelect`.

### Verification

- Build passes.
- Visual: three buttons with arrows, active state highlights correctly.

---

## Task 6: Integrate `useSelector` and `SelectorPanel` into `App.tsx`

**Requirements**: US-5, US-6

**File**: `src/App.tsx`

### Steps

1. Import `useSelector` and `SelectorPanel`.
2. Instantiate `useSelector()` in `App`.
3. Replace `<StageNav ... />` with `<SelectorPanel ... />` passing selector state and callbacks.
4. Feed `useSelector`'s `derivedSettings` into `useDerivedNotes` and `useGameEngine` instead of the old `useGameSettings` values.
5. When `derivedSettings` change while `running === true`, call `engine.stop()`.
6. Update `start()` to use derived `maxQuestions`, `time`, and `byNote` from selector.
7. Update `StatsPanel` usage to pass the new history key.
8. Remove `StageNav` import and the stage picker overlay code.
9. Remove swipe-to-navigate `useEffect` (touchstart/touchend for stage switching).

### Verification

- Build passes (`npm run build`).
- Lint passes (`npm run lint`).
- App loads in browser: selector panel visible, game starts and plays correctly with each combination.

---

## Task 7: Add CSS styles for the selector panel

**Requirements**: US-1, US-2, US-3, US-4

**File**: `src/index.css`

### Steps

1. Add `.selector-panel` container styles (padding, flex-column, gap).
2. Add `.selector-strings` row styles (flex, gap, center-aligned, wrap for small screens).
3. Add `.string-pill` base and `.string-pill.active` styles (rounded, bold, underline on active).
4. Add `.mode-cards` row and `.mode-card` / `.mode-card.active` styles.
5. Add `.fret-neck` container and SVG-internal class styles (`.fret-half`, `.fret-half.inactive`).
6. Add `.difficulty-road` row styles, `.diff-btn`, `.diff-btn.active`, arrow connector styles.
7. Add `.selector-panel.disabled` style (pointer-events: none, opacity: 0.5) for when game is running.
8. Ensure responsive behavior: on screens < 360px, pills shrink; on tablet+, panel gets max-width constraint.

### Verification

- Build passes.
- Visual inspection at 375px and 768px widths — no overflow, readable text, touch targets ≥ 44px.

---

## Task 8: Remove old StageNav infrastructure

**Requirements**: US-6

**Files**: `src/components/StageNav.tsx`, `src/App.tsx`, `src/hooks/useGameSettings.ts`, `src/utils/stages.ts`, `src/hooks/useCustomStages.ts`

### Steps

1. Delete `src/components/StageNav.tsx`.
2. Delete `src/utils/stages.ts`.
3. Delete `src/hooks/useCustomStages.ts`.
4. In `App.tsx`: remove all remaining references to `StageNav`, `goToStage`, stage picker overlay, `getStageGroups`, `useCustomStages`.
5. In `useGameSettings.ts`: remove `stageIndex`, `goToStage`, `applyStage`, `syncStageToSettings`, `findMatchingStage`, `resetToStage`, custom snapshot logic. Keep only settings that are still used by the Settings panel (accidental, order, notation, time overrides) or remove the hook entirely if `useSelector` fully replaces it.
6. In `useGameEngine.ts`: remove `switchStage` function and its callers.
7. Clean up any unused imports across touched files.

### Verification

- Build passes with no unused-variable errors (TypeScript strict mode).
- Lint passes.
- App runs without errors in browser.

---

## Task 9: End-to-end verification and polish

**Requirements**: All

### Steps

1. Run `npm run build` — confirm zero errors.
2. Run `npm run lint` — confirm zero warnings/errors.
3. Test in browser (`npm run dev`):
   - Select each string individually → game plays for that string.
   - Enable Multi, select 2+ strings → game randomizes between them.
   - Multi with 1 string → game plays on that one string normally.
   - Toggle mode → UI switches between NoteCircle and FretGrid correctly.
   - Toggle fret halves → questions respect the selected range.
   - Switch difficulty → question pool changes (dots only / naturals / full).
   - Changing selector mid-game stops the game.
   - Reload page → all selections persist.
4. Fix any visual polish issues (spacing, colors, transitions).

### Verification

- All acceptance criteria from requirements.md are met.
- No console errors or warnings.
- Build + lint clean.
