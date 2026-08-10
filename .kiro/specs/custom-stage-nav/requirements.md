# Requirements: Custom Stage in Nav Picker

## Summary

When the user's settings diverge from any built-in stage (i.e. `isCustomized === true`), show the custom stage as an entry in the stage picker overlay. When settings are reset back to a built-in stage, remove the custom entry from the picker.

## Functional Requirements

### FR-1: Auto-detect custom stage
- When the current settings don't match any built-in stage (`isCustomized === true`), the system treats the current configuration as "the custom stage."
- There is only ONE custom stage slot (free tier). No explicit "Save" action is required — customization is automatic.

### FR-2: Show custom stage in stage picker
- The stage picker overlay must include a "★ My Stage" entry (or the user's custom name if renamed).
- It must appear as a distinct item — visually separated from built-in stage groups (e.g. at the top or bottom of the list).
- The entry must show the custom stage name (defaulting to "My Stage" if unnamed).

### FR-3: Custom stage is auto-selected in picker
- When `isCustomized === true`, the custom stage entry in the picker must be highlighted as the current/active item.
- Built-in stage entries must NOT be highlighted when the custom stage is active.

### FR-4: Navigating to custom stage from picker
- Tapping the custom stage entry in the picker applies the saved custom settings and closes the picker.
- This must work even if the user navigated away to a built-in stage and wants to return.

### FR-5: Remove custom stage on reset
- When the user presses "Reset" (which calls `resetToStage` and restores built-in defaults), the custom entry must disappear from the picker.
- The picker reverts to showing only built-in stages with the matched stage highlighted.

### FR-6: Custom stage name persists
- The custom stage name (set via the rename UI in Settings) must persist across sessions (localStorage).
- The picker entry uses this persisted name.

### FR-7: StageNav title reflects custom stage
- When `isCustomized === true`, the StageNav center title should show the custom stage name (e.g. "★ My Stage") instead of a built-in stage title.
- Step counter (X/Y) is hidden or shows "1/1" since there's only one custom stage.

## Non-Functional Requirements

### NFR-1: No regression on built-in navigation
- Prev/Next arrows, swipe, and picker behavior for built-in stages must remain unchanged.
- The custom entry is separate from the indexed stage list — it does NOT get an index in the `STAGES` array.

### NFR-2: Single custom stage limit
- Only one custom stage exists at a time (free tier constraint).
- Future: multiple saved custom stages for paid users — but this spec covers single-slot only.
