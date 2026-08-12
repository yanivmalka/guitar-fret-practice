# Design: Simplified Navigation Selector Panel

## References

- #[[.kiro/specs/simplified-nav/requirements.md]]
- #[[src/hooks/useGameSettings.ts]]
- #[[src/hooks/useHistory.ts]]

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     App.tsx                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │          SelectorPanel (new)                  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │StringRow│ │ModeToggle│ │FretRangeNeck  │  │  │
│  │  └─────────┘ └──────────┘ └───────────────┘  │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │        DifficultyRoad                    │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  useSelector (hook)│  │  useGameEngine         │  │
│  │  ─ state & persist │  │  ─ unchanged API       │  │
│  │  ─ derive settings │  │                        │  │
│  └──────────────────┘  └────────────────────────┘  │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  useHistory       │  │  useDerivedNotes        │  │
│  │  ─ fresh start    │  │  ─ unchanged            │  │
│  └──────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

The selector panel replaces `StageNav`. A new `useSelector` hook owns the selection state and derives game settings. The existing `useGameEngine` and `useDerivedNotes` hooks remain unchanged — they already accept settings as parameters.

History starts fresh (no migration from old stage-based format). Old history data in localStorage is simply ignored.

---

## 2. New Component: `SelectorPanel`

**File**: `src/components/SelectorPanel.tsx`

A single container component that composes four sub-sections.

### Props

```typescript
interface SelectorPanelProps {
  selector: SelectorState;
  onStringSelect: (stringNum: number) => void;
  onMultiToggle: () => void;
  onModeSelect: (mode: 'byNote' | 'byFret') => void;
  onFretRangeToggle: (half: 'lower' | 'upper') => void;
  onDifficultySelect: (diff: Difficulty) => void;
  isPlaying: boolean;
}
```

When `isPlaying` is true, the panel is dimmed/disabled to prevent accidental changes mid-game (user must stop first).

---

## 3. Sub-Components (inline in SelectorPanel)

These are rendered inline within `SelectorPanel` (not separate files) to keep the flat component directory clean.

### 3.1 StringRow

```
[ E ]  [ A ]  [ D ]  [ G ]  [ B ]  [ E ]  [ Multi ]
  6      5      4      3      2      1
```

- Rendered as a `<div class="selector-strings">` with `<button>` pills.
- Active pill: `class="string-pill active"` → bold text + thick bottom border (3px solid accent color).
- Multi mode: `.multi-active` class on container enables multi-select behavior.
- Each pill shows the note letter in bold. To disambiguate the two E strings, low E (string 6) is on the left and high E (string 1) is on the right — positional context is sufficient (matches standard tuning order).
- Bold text for pill labels: appropriate here because these are compact touch targets that need instant visual scanability. The bold weight makes them feel like tappable controls rather than passive text.

### 3.2 ModeToggle

```
┌──────────────┐  ┌──────────────┐
│  ○ ○         │  │  3  5  7     │
│ ○   ○  By   │  │  ·  ·  · By  │
│  ○ ○  Note   │  │  9 12    Fret│
└──────────────┘  └──────────────┘
```

- Two `<button class="mode-card">` elements.
- Each contains an inline SVG icon (small, ~40×40px) and a label.
- Active card: elevated background, accent border. Inactive: flat, muted.

### 3.3 FretRangeNeck

```
┌─────────────────────────────────────────────────────────┐
│ NUT │ · │   │ · │   │ · │   │ · │   │ · │ :: │ · │   │ · │   │ · │   │ · │   │ · │   │ ◐ │
│     0   3       5       7       9      12     15      17      19      21    body│
│ ◄──────── lower (0-12) ────────►◄──────── upper (12-21) ────────►│
└─────────────────────────────────────────────────────────┘
```

- Single `<svg>` element, viewBox scaled to panel width.
- Two `<rect>` overlay regions act as tap targets (one per half).
- Dot markers rendered as `<circle>` elements at fret positions 3, 5, 7, 9, 12 (double), 15, 17, 19, 21.
- Active half: full opacity. Inactive half: `opacity: 0.3` with desaturated fill.
- A small guitar body silhouette on the right edge (pickup cutaway shape) for visual context.
- Nut rendered as a thicker line on the left edge.

### 3.4 DifficultyRoad

```
  ┌──────┐      ┌──────────┐      ┌──────┐
  │  ●   │ ──→  │  ♮       │ ──→  │ ♯♭   │
  │ Dots  │      │ Naturals  │      │ Full  │
  └──────┘      └──────────┘      └──────┘
```

- Three `<button class="diff-btn">` with SVG arrows connecting them.
- Icons:
  - `●` (filled dot) — represents the dot markers on the fretboard.
  - `♮` (natural sign) — the standard music notation symbol for natural notes.
  - `♯♭` (sharp + flat) — immediately communicates "all accidentals included" = chromatic.
- Active button gets highlighted border/background. Inactive buttons are muted.

---

## 4. New Hook: `useSelector`

**File**: `src/hooks/useSelector.ts`

Encapsulates all selector state, persistence, and derivation logic.

### State Shape

```typescript
type Difficulty = 'dots' | 'naturals' | 'full';

interface SelectorState {
  // String selection
  selectedStrings: number[];   // e.g. [6] or [6, 5] in multi mode
  multiMode: boolean;

  // Mode
  mode: 'byNote' | 'byFret';

  // Fret range
  lowerActive: boolean;   // frets 0–12
  upperActive: boolean;   // frets 12–21

  // Difficulty
  difficulty: Difficulty;
}
```

### Derived Game Settings

```typescript
interface DerivedSettings {
  guitarString: number;        // Math.max(...selectedStrings) — highest string number = lowest pitch
  multiStrings: number[];      // selectedStrings if multi & length > 1, else []
  fretFrom: number;            // 0 if lowerActive, 12 if only upper
  fretTo: number;              // 21 if upperActive, 12 if only lower
  byNote: boolean;             // mode === 'byNote'
  dotsOnly: boolean;           // difficulty === 'dots'
  wholeToneOnly: boolean;      // difficulty === 'naturals'
  time: number;                // see time table below
  maxQuestions: number;        // dots: 15, naturals: 20, full: 25
  accidental: AccidentalMode;  // preserved from existing user pref
  order: OrderMode;            // preserved from existing user pref
}
```

### Multi-Mode Behavior

- When `multiMode` is true and only 1 string is selected: `multiStrings` is empty (game plays on just that one string — same as single-select mode). No restrictions on number of selections.
- When `multiMode` is true and 2+ strings are selected: `multiStrings` contains all selected strings, and the game randomizes between them.
- Turning multi OFF: keep only the most recently selected string.

### Time Calculation

| Difficulty | Lower (0–12) | Upper (12–21) | Both (0–21) |
|------------|--------------|---------------|-------------|
| Dots       | 8            | 7             | 8           |
| Naturals   | 6            | 6             | 7           |
| Full       | 5            | 5             | 5           |

### Persistence

Each selector dimension is stored as a separate localStorage key:
- `sel_strings` → `number[]`
- `sel_multi` → `boolean`
- `sel_mode` → `'byNote' | 'byFret'`
- `sel_lower` → `boolean`
- `sel_upper` → `boolean`
- `sel_difficulty` → `Difficulty`

Uses existing `loadSetting`/`saveSetting` helpers from `src/utils/settings.ts`.

---

## 5. History (Fresh Start)

No migration from old stage-based history. The new system uses a simple string key derived from the selector state:

```typescript
function historyKey(state: SelectorState): string {
  const strings = [...state.selectedStrings].sort().join(',');
  const fret = `${state.lowerActive ? '0' : '12'}-${state.upperActive ? '21' : '12'}`;
  const mode = state.mode;
  const diff = state.difficulty;
  return `${strings}|${fret}|${mode}|${diff}`;
}
```

This produces keys like `"6|0-12|byFret|dots"` or `"5,6|0-21|byNote|full"`.

`useHistory` is updated to use string keys. Old integer-keyed data is left in localStorage but never read.

---

## 6. Integration with App.tsx

### Removed
- `import StageNav` and its rendering.
- `stageIndex`, `goToStage`, `applyStage` from `useGameSettings` (or simply unused).
- Stage picker overlay.
- Swipe-to-navigate touch listeners.
- `stages.ts` — the `STAGES` array and all stage generation/grouping logic.
- `useCustomStages` hook and related UI.

### Added
- `import SelectorPanel` rendered above the game area (where StageNav was).
- `useSelector()` hook instantiated in App, its `derivedSettings` spread into `useGameEngine` and `useDerivedNotes`.
- When any selector changes while `running === true`, call `engine.stop()` automatically.

### Retained
- `useGameEngine` — no API changes, still receives settings object.
- `useDerivedNotes` — no changes.
- `Settings` component — still controls accidental mode, order, notation, time override.
- `StatsPanel` — updated to use new history key.

---

## 7. CSS Design Tokens

Added to `src/index.css`:

```css
/* Selector Panel */
.selector-panel { ... }
.selector-strings { display: flex; gap: 6px; justify-content: center; }
.string-pill { 
  padding: 8px 14px; 
  border-radius: 20px; 
  font-weight: 700; 
  border: none;
  background: var(--pill-bg, #222);
  color: var(--pill-text, #aaa);
  transition: all 0.15s;
}
.string-pill.active { 
  color: #fff; 
  border-bottom: 3px solid var(--accent, #4af); 
}
.mode-card { ... }
.mode-card.active { background: var(--card-active-bg); border: 2px solid var(--accent); }
.fret-neck svg { width: 100%; }
.fret-half { cursor: pointer; transition: opacity 0.2s; }
.fret-half.inactive { opacity: 0.3; filter: saturate(0.3); }
.diff-btn { ... }
.diff-btn.active { border-color: var(--accent); background: var(--card-active-bg); }
```

---

## 8. Data Flow Diagram

```
User taps selector
       │
       ▼
SelectorPanel ──callback──▶ useSelector (update state + persist)
                                │
                                ▼
                         derive settings
                                │
                    ┌───────────┼──────────┐
                    ▼           ▼          ▼
            useDerivedNotes  useGameEngine  useHistory
                    │           │           │
                    ▼           ▼           ▼
              NoteCircle /   game loop   StatsPanel
              FretGrid
```

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Multi mode with only 1 string selected | Works fine — game plays on that one string (equivalent to single-select) |
| Both fret halves deselected (impossible) | Prevent: tapping the only active half is a no-op |
| Game running + selector tap | Auto-stop game, apply new settings, reset stats panel |
| History key has no entries | Stats panel shows "No data yet" |
