# Design: Custom Stage in Nav Picker

## Overview

The custom stage is a virtual entry — it doesn't live in the `STAGES` array. Instead, it's a UI-level concept: "the user's current settings don't match any built-in stage, so we show a custom entry." The custom stage's existence is derived from `isCustomized` (already computed in `useGameSettings`).

## Data Model

No new data structures needed. Existing state is sufficient:

| State | Source | Purpose |
|-------|--------|---------|
| `isCustomized` | `useGameSettings` | Whether current settings diverge from all built-in stages |
| `customStageName` | `localStorage('customStageName')` | User's chosen name for the custom stage (default: `''` → display as "My Stage") |
| Current settings | `useGameSettings` | The actual custom stage parameters (string, frets, filters, etc.) |

### Custom stage persistence

The custom stage is implicitly persisted because all individual settings are already saved to localStorage (`pref_guitarString`, `pref_fretFrom`, etc.). The name is saved under key `customStageName`. No additional save mechanism needed.

## Component Changes

### 1. Stage Picker (in `App.tsx`)

**Current**: The picker builds `pickerGroups` from built-in stage groups + a "★ My Stages" entry that references `customStages.stages[0]`.

**New behavior**:
- If `isCustomized === true`, prepend a special entry at the top of the picker list:
  ```
  { label: `★ ${customStageName || 'My Stage'}`, isCustom: true, isCurrent: true }
  ```
- This entry is highlighted as current (gets `picker-item-current` class).
- No built-in group gets `picker-item-current` when custom is active.
- Clicking this entry is a no-op (already on custom settings) — just closes the picker.
- If `isCustomized === false`, this entry does NOT appear.

**On reset**: `resetToStage()` restores built-in settings → `isCustomized` becomes `false` → custom entry disappears from picker on next render.

### 2. StageNav title (in `StageNav.tsx`)

**Current**: Always shows `stage.title` from the matched `STAGES[stageIndex]` entry.

**New behavior**:
- Accept a new prop `customTitle: string | null`.
- If `customTitle` is non-null, display it instead of `stage.title`.
- Hide or show "1/1" for the step counter when in custom mode.
- The parts/classes/levels progress indicators can remain showing the last matched built-in stage position (no change needed — they'll just be stale, which is acceptable).

**Passed from App.tsx**:
```tsx
customTitle={isCustomized ? `★ ${customStageName || 'My Stage'}` : null}
```

### 3. Returning to custom stage from a built-in stage

If the user navigates to a built-in stage (via picker or arrows), then opens the picker again — the custom entry should NOT appear (because `isCustomized` is now `false` after `goToStage` applied built-in settings).

However, if the user wants to "go back" to their custom settings, they need to have those settings restored. This requires saving/restoring the custom config:

**Approach**: When `isCustomized` transitions from `true` → `false` (user navigates away), snapshot the custom settings into localStorage under key `customStageSnapshot`. When the user taps the custom entry in the picker:
1. Load `customStageSnapshot` from localStorage
2. Apply all settings from the snapshot
3. This makes `isCustomized === true` again

**When to show the custom entry in picker even if not currently active**:
- If `localStorage('customStageSnapshot')` exists AND `isCustomized === false`, show the custom entry but NOT highlighted as current.
- Tapping it restores the snapshot.

**On reset**: Clear both `customStageName` and `customStageSnapshot` from localStorage.

### 4. Settings panel (no change)

The existing "Custom Stage" section in Settings (rename, reset) remains as-is. It already handles naming and reset.

## State Flow Diagram

```
User changes a setting → isCustomized becomes true
  → Picker shows "★ My Stage" (highlighted)
  → StageNav title shows "★ My Stage"
  → Settings shows rename/reset UI

User taps Reset → resetToStage() called
  → Settings match built-in stage → isCustomized becomes false
  → Picker hides custom entry
  → StageNav shows built-in stage title
  → Clear customStageSnapshot from localStorage

User navigates to built-in stage (arrows/picker)
  → Save current custom settings to customStageSnapshot
  → goToStage applies built-in settings → isCustomized becomes false
  → Picker shows custom entry (not highlighted) if snapshot exists
  → StageNav shows built-in title

User taps custom entry in picker
  → Restore settings from customStageSnapshot
  → isCustomized becomes true again
  → Picker highlights custom entry
  → StageNav shows custom title
```

## Edge Cases

1. **App opened fresh with customized settings persisted**: `isCustomized` computes as `true` on mount → custom entry visible immediately. Works because individual prefs are already loaded from localStorage.

2. **Custom name empty**: Display "My Stage" as default label.

3. **Prev/Next arrows while on custom stage**: These call `goToStage(stageIndex ± 1)` which applies a built-in stage. The snapshot is saved before transitioning. This is acceptable — arrows always navigate built-in stages.
