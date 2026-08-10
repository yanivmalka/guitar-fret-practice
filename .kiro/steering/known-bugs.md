---
inclusion: manual
---

# Known Bugs

## BUG-001: No sound until navigation button is clicked

**Status**: Fixed

**Fix**: Added `ctx.resume()` to `playClickSound` in `feedback.ts`. Added `unlockAudio()` export to `audio.ts` and call it in the Play button handler in `App.tsx`.

---

## BUG-002: Statistics don't reflect partial sessions accurately

**Status**: Fixed

**Fix**: `StatsPanel` now accepts `maxQuestions` prop and uses `Math.max(total, maxQuestions)` as the score denominator. Filter row shows `answered/maxQuestions`. App passes `stage.maxQuestions`.

---

## IDEA-001: Rethink navigation — divide stages by string

**Status**: Brainstorm / Future

**Description**: Consider reorganizing navigation around a per-string mastery concept instead of a flat 86-stage list. Primary nav = pick a string, then progress through difficulty tiers within that string.

---

## BUG-003: Question selection is not balanced — same fret/note repeats too often

**Status**: Fixed

**Fix**: Replaced `pickSmartFret` with a proper Fisher-Yates shuffle-bag. Every valid fret appears exactly once in random order before reshuffling. Removed the `failedFretsRef` priority path that was causing near-immediate repeats. Only avoidance: if the last-asked fret would be first in a new bag, it's moved to the back.

---

## BUG-004: Stage navigation loops back to String 6 (frets 0–12) instead of advancing

**Status**: Fixed

**Fix**: `applyStage` now sets `fretFrom`, `fretTo`, and `time` from the target stage (previously it skipped these to "preserve user prefs"). This ensures `syncStageToSettings` always matches the correct stage after navigation.

---

## BUG-005: Clicking "Alpha" or "Fifths" untoggles "By String"

**Status**: Fixed

**Fix**: Removed `setByString(false)` calls from the Fifths and Alpha order chip `onClick` handlers in `App.tsx`. Order and By String are now independent.
