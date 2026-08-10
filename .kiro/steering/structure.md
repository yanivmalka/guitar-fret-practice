# Project Structure

```
src/
├── main.tsx              # React entry point (renders App into #root)
├── App.tsx               # Root component — orchestrates all game logic and UI
├── index.css             # All styles (single CSS file, no CSS modules)
├── env.d.ts              # Vite client type declarations
├── components/
│   ├── FretGrid.tsx      # Fret board grid for "By Note" mode interactions
│   ├── NoteCircle.tsx    # Circle-of-fifths / alphabetical note selector for "By Fret" mode
│   ├── Onboarding.tsx    # First-run onboarding wizard
│   ├── Settings.tsx      # Settings panel (filters, fret range, accidentals, etc.)
│   ├── StageNav.tsx      # Stage navigation bar (prev/next, title, suggestions)
│   └── StatsPanel.tsx    # Per-stage accuracy and timing statistics display
├── hooks/
│   ├── useCustomStages.ts  # CRUD for user-created custom stages (localStorage)
│   ├── useDerivedNotes.ts  # Derives active note set, fret dots, circle layout from settings
│   ├── useGameEngine.ts    # Core game loop: timers, question picking, answer validation
│   ├── useGameSettings.ts  # Stage/setting state management with localStorage persistence
│   └── useHistory.ts       # Per-stage history tracking (correct/wrong/skipped entries)
└── utils/
    ├── audio.ts          # Web Audio API playback, MIDI soundfont sample loading
    ├── feedback.ts       # Click sounds, haptic feedback (Capacitor vibration API)
    ├── music.ts          # Music theory data: note arrays, circle-of-fifths, accidental helpers
    ├── settings.ts       # localStorage load/save helpers
    └── stages.ts         # Stage definitions and generation logic (~86 stages)
```

## Architecture Patterns

- **Single-page app** — one root `App.tsx` component, no router
- **Custom hooks for logic** — game engine, settings, history, and derived state are encapsulated in `src/hooks/`
- **Utility modules** — pure functions and constants live in `src/utils/`
- **Flat component directory** — all components are siblings under `src/components/`, no nesting
- **No external state library** — state is managed with React `useState`/`useRef`/`useCallback` and persisted to `localStorage`
- **No CSS framework** — raw CSS in a single `index.css` file
- **Compile-time constants** — git metadata injected via Vite `define` config
