# Requirements: Simplified Navigation Selector Panel

## Overview

Replace the 86-stage linear navigation (StageNav arrows/swipe/picker) with a visual selector panel that lets users directly choose their practice parameters: string(s), mode, fret range, and difficulty. Game settings are derived from these selections — no stage index lookup required.

---

## User Stories

### US-1: String Selection

**As a** guitarist practicing fretboard memorization,
**I want to** select which string(s) to practice using clearly labeled pills,
**so that** I can focus on one string at a time or combine multiple strings without scrolling through stages.

**Acceptance Criteria:**

- [ ] Display 7 selectable pills in a row: `E` (6), `A` (5), `D` (4), `G` (3), `B` (2), `E` (1), and `Multi`.
- [ ] Each pill shows the string's note letter in bold with a rounded-rectangle shape.
- [ ] Single-select mode by default: tapping a string pill deselects the previous one.
- [ ] When `Multi` is toggled ON, tapping string pills adds/removes them from a multi-select set (any number of selections is valid, including 1).
- [ ] Active pill(s) have a thick colored underline; inactive pills appear dimmed.
- [ ] When `Multi` is toggled OFF, revert to single-select with the last tapped string active.
- [ ] Selection persists across app reloads (localStorage).

---

### US-2: Mode Toggle

**As a** user,
**I want to** choose between "By Fret" and "By Note" quiz modes via two side-by-side cards,
**so that** I can quickly see and switch the direction of the quiz.

**Acceptance Criteria:**

- [ ] Display two equal-width cards side by side: "By Note" (left) and "By Fret" (right).
- [ ] "By Note" card shows a mini circle icon with some notes visually lit and others dimmed.
- [ ] "By Fret" card shows a mini number-grid icon with some numbers lit and others dimmed.
- [ ] Exactly one card is active at a time (radio behavior). Active card is highlighted; inactive is muted.
- [ ] Tapping an inactive card switches the mode immediately.
- [ ] Selection persists across app reloads.

---

### US-3: Fret Range Selection

**As a** user,
**I want to** select fret ranges by tapping halves of a guitar-neck illustration,
**so that** I intuitively understand which part of the fretboard I'm practicing.

**Acceptance Criteria:**

- [ ] Display a horizontal guitar neck SVG spanning the full width of the selector panel.
- [ ] The SVG emphasizes the fretboard (frets, dot markers at 3, 5, 7, 9, 12, 15, 17, 19, 21) and shows a small portion of the guitar body near the first pickup on the right edge.
- [ ] The neck is split into two tappable halves: frets 0–12 (left) and frets 12–21 (right).
- [ ] Multi-select: at least one half must remain active. Tapping the only active half does nothing (cannot deselect both).
- [ ] Active half is highlighted (full opacity/color). Inactive half is dimmed.
- [ ] When both halves active, the effective fret range is 0–21.
- [ ] When only 0–12 active, effective range is 0–12. When only 12–21, effective range is 12–21.
- [ ] Dot markers (fret inlays) are visible on the SVG for both halves.
- [ ] Selection persists across app reloads.

---

### US-4: Difficulty Progression

**As a** user,
**I want to** select a difficulty level from a "road to mastery" visual,
**so that** I can progressively challenge myself and see my mastery at a glance.

**Acceptance Criteria:**

- [ ] Display three difficulty buttons in a horizontal row with connecting arrows between them (left to right progression): `●` Dots → `♮` Naturals → `♯♭` Full.
- [ ] "Dots" = landmark frets only (dot positions: 0, 3, 5, 7, 9, 12, 15, 17, 19, 21).
- [ ] "Naturals" = natural notes A–G, no sharps/flats.
- [ ] "Full" = full chromatic (all 12 notes).
- [ ] Exactly one difficulty is active at a time (radio behavior).
- [ ] Selection persists across app reloads.

---

### US-5: Derive Game Settings from Selections

**As a** developer,
**I want** the game engine to receive settings derived directly from the selector panel state,
**so that** no stage index lookup or STAGES array traversal is needed.

**Acceptance Criteria:**

- [ ] The following settings are computed from selector state:
  - `guitarString`: primary string number (lowest numbered in multi-select, or the single selected).
  - `multiStrings`: array of selected strings when Multi mode active; empty array otherwise.
  - `fretFrom` / `fretTo`: derived from active fret range half/halves (0, 12, or 21 boundaries).
  - `byNote`: `true` if "By Note" mode card active, `false` for "By Fret".
  - `dotsOnly`: `true` if difficulty = Dots.
  - `wholeToneOnly`: `true` if difficulty = Naturals.
  - Neither dotsOnly nor wholeToneOnly: difficulty = Full.
  - `time`: computed from difficulty + fret range (Dots: 8s, Naturals: 6s, Full: 5s — adjusted for upper frets).
  - `maxQuestions`: Dots: 15, Naturals: 20, Full: 25.
- [ ] Changing any selector immediately updates the game settings (no "apply" button needed).
- [ ] If the game is running when a selector changes, stop the current session and reset.

---

### US-6: Remove Old Linear Navigation

**As a** developer,
**I want to** remove the old StageNav component and its supporting infrastructure,
**so that** the codebase is simplified and there is no confusion between old and new navigation.

**Acceptance Criteria:**

- [ ] The `StageNav` component is removed from rendering in `App.tsx`.
- [ ] Swipe-to-navigate (touchstart/touchend) listeners for stage switching are removed.
- [ ] `stageIndex`, `goToStage`, `applyStage`, stage chevron arrows, and stage picker overlay are no longer used for navigation.
- [ ] The `STAGES` array and stage generation logic (`stages.ts`) can be removed entirely — no longer needed.
- [ ] The selector panel is rendered in the space previously occupied by StageNav.

---

## Non-Functional Requirements

- **Performance**: Selector panel renders without perceptible delay; no expensive computations on each tap.
- **Responsiveness**: Layout adapts to mobile portrait (primary target), tablet, and desktop widths.
- **Persistence**: All selector states saved to localStorage individually, restored on app load.
- **Offline**: No network dependency for selector panel (all assets inline or bundled).
