# Tasks: Custom Stage in Nav Picker

## Task 1: Add snapshot save/restore logic to `useGameSettings`

**File**: `src/hooks/useGameSettings.ts`

1. Add a `saveCustomSnapshot()` function that writes all current settings to `localStorage('customStageSnapshot')` as a JSON object (`{ guitarString, fretFrom, fretTo, dotsOnly, wholeToneOnly, byNote, multiStrings, time, accidental, order }`).
2. Add a `restoreCustomSnapshot()` function that reads `customStageSnapshot` from localStorage and applies each setting via the existing setters. Returns `true` if snapshot existed, `false` otherwise.
3. Add a `clearCustomSnapshot()` function that removes `customStageSnapshot` from localStorage.
4. Add a `hasCustomSnapshot` derived boolean: `localStorage.getItem('customStageSnapshot') !== null`.
5. In `goToStage`: before applying the new stage, if `isCustomized === true`, call `saveCustomSnapshot()`.
6. In `resetToStage`: after restoring defaults, call `clearCustomSnapshot()` and also remove `customStageName` from localStorage.
7. Export `restoreCustomSnapshot`, `hasCustomSnapshot`, and `clearCustomSnapshot` from the hook return.

## Task 2: Update StageNav to accept and display custom title

**File**: `src/components/StageNav.tsx`

1. Add prop `customTitle: string | null` to the `Props` interface.
2. In the center text section: if `customTitle` is non-null, render `customTitle` instead of `stage.title`.
3. When `customTitle` is set, show step counter as "★" or hide it (instead of "X / Y").
4. No changes to arrows, swipe, progress indicators, or suggestion logic.

## Task 3: Update picker in App.tsx to show custom stage entry

**File**: `src/App.tsx`

1. Import `hasCustomSnapshot` and `restoreCustomSnapshot` from `useGameSettings` (add to destructured return).
2. In the `pickerGroups` memo, add custom stage entry logic:
   - If `isCustomized === true`: prepend `{ label: '★ ' + (customStageName || 'My Stage'), indices: [], isCustom: true }` to the list. Mark it as current.
   - Else if `hasCustomSnapshot === true`: prepend the same entry but NOT marked as current.
   - Otherwise: don't add the entry.
3. In the picker `onClick` handler for the custom entry:
   - If already customized (`isCustomized`): just close the picker (no-op).
   - If not customized but snapshot exists: call `restoreCustomSnapshot()`, then close the picker.
4. Remove the old "★ My Stages" logic that referenced `customStages.stages[0]` (the old `useCustomStages` approach is replaced by this simpler mechanism).

## Task 4: Pass customTitle prop from App to StageNav

**File**: `src/App.tsx`

1. Compute `customTitle`:
   ```tsx
   const customTitle = isCustomized ? `★ ${customStageName || 'My Stage'}` : null;
   ```
2. Pass `customTitle={customTitle}` to the `<StageNav>` component.

## Task 5: Clean up old `useCustomStages` usage (optional simplification)

**Files**: `src/App.tsx`, `src/hooks/useCustomStages.ts`

1. Remove the `useCustomStages()` hook call from App.tsx.
2. Remove the `savingCustom`, `customName`, `handleSaveCustom` state and handlers that used the old multi-stage custom system.
3. Keep `useCustomStages.ts` file for now (future paid multi-stage feature) but remove its usage from App.
4. The Settings panel "Custom Stage" section (rename/reset) remains — it already works with `customStageName` and `resetToStage`.

## Task 6: Update resetToStage to clear custom name

**File**: `src/hooks/useGameSettings.ts`

1. In `resetToStage`, after restoring settings, also:
   - Call `saveSetting('customStageName', '')` to clear the name.
   - Call `clearCustomSnapshot()` to remove the snapshot.
2. This ensures the picker entry disappears and the StageNav title reverts.

## Task 7: Verify and build

1. Run `npm run build` to confirm no type errors.
2. Manual verification checklist:
   - [ ] Change a setting (e.g. fret range) → picker shows "★ My Stage" at top, highlighted
   - [ ] StageNav title shows "★ My Stage"
   - [ ] Navigate to a built-in stage via arrows → custom entry still in picker (not highlighted)
   - [ ] Tap custom entry in picker → settings restored, title shows custom name again
   - [ ] Rename custom stage in Settings → picker and title update
   - [ ] Press Reset → custom entry disappears, title shows built-in stage
