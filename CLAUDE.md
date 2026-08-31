# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page React + TypeScript PWA that drills guitar fretboard note recognition. Also packaged as an Android app via Capacitor. No backend — all state is client-side (localStorage + in-memory).

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build via Vite
- `npm run lint` — ESLint over the whole repo
- `npm run preview` — serve the production build locally

There is no test suite/runner configured in this repo.

### Android (Capacitor)

The `android/` project is generated, not committed (it's in `.gitignore`). To build the app:

- `npx cap add android` — one-time, regenerates `android/` from `capacitor.config.ts`
- `npm run cap:sync` — `npm run build` then `npx cap sync android` (copies `dist/`, installs plugin native code)
- `npm run android` — `cap:sync` then opens Android Studio

Native plugins in use: `@capacitor/app` and `@capacitor-community/speech-recognition`. The speech plugin's library manifest contributes the `RECORD_AUDIO` permission and the `android.speech.RecognitionService` `<queries>` entry through Gradle manifest merging, so no manual `AndroidManifest.xml` edit is needed after `cap sync`.

Vite `base` is `/guitar-fret-practice/` (GitHub Pages deploy target), and the build embeds `__COMMIT_HASH__`/`__COMMIT_DATE__` globals (from `git rev-parse`/`git log`) shown in the footer — `npm run build` must run inside a git checkout for this to succeed.

## Architecture

The whole app is one page (`src/App.tsx`) composed from a handful of hooks that each own one concern, plus dumb presentational components.

**State/derivation pipeline** (in order, each feeding the next):
1. `useSelector` — the user's raw picks (strings, multi-string mode, byNote/byFret mode, fret-range halves, difficulty). Persists each field to localStorage individually and derives `DerivedSettings` (fret range, time limit, question count, etc.) via a `useMemo`. Also produces `historyKey()`, a string key that scopes history/stats to the current combination of settings.
2. `useDerivedNotes` — turns `DerivedSettings` into concrete note/fret data for rendering (circle-of-fifths note list, active notes, fret-dot positions, valid frets per note).
3. `useGameEngine` — the quiz state machine: countdown timers, asking questions, scoring correctness, by-note vs by-fret question flow. Talks to `useHistory` (records `HistoryEntry` rows keyed by `historyKey()`) and `useScoring` (session score/streak/multiplier). Uses refs (`runningRef`, `sessionRef`, `answeredRef`, etc.) alongside state so timer callbacks always see current values and stale/late callbacks from a previous "session" (incremented on every `start()`/`resume()`) are ignored.
4. `useScoring` — session score, streak, and the fire-multiplier level shown in the UI; reset per round.

**Two quiz modes**, both driven by `useGameEngine`:
- **By fret**: a fret is highlighted, user picks the note from the `NoteCircle` (circle-of-fifths wheel).
- **By note**: a note name is shown, user taps the matching fret(s) on `FretGrid`. A note can occur multiple times in the fret range, so the engine tracks `remainingFrets`/`foundFrets` until all instances are found.

Sharps/flats and circle-of-fifths/alphabetical ordering are handled centrally in `src/utils/music.ts` (`notes` is the master `[string][fret] -> note name` table; `notesMatch`/`displayNote`/`getCofNotes` do all enharmonic/notation conversion — always go through these rather than comparing note strings directly).

**Audio** (`src/utils/audio.ts`): loads guitar note samples from a public soundfont CDN (`gleitz.github.io/midi-js-soundfonts`) via Web Audio, keyed by MIDI note number, with an in-memory buffer cache and `preloadAllSamples()` warmup. `unlockAudio()` must be called from a user gesture (done in `App.tsx`'s `start()`) before playback works on mobile browsers. The PWA service worker (configured in `vite.config.ts`) separately caches these same sample URLs for offline use.

**Voice input** (`src/utils/speech.ts`, `src/hooks/useVoiceAnswer.ts`): an optional answer mode. `getSpeechEngine()` picks one implementation per platform — `WebSpeechEngine` (browser `SpeechRecognition`, needs network, and is unreliable/absent in an installed/standalone PWA), `NativeSpeechEngine` (`@capacitor-community/speech-recognition`, lazily imported so the web bundle never loads it; used inside the Android app), or `NullSpeechEngine` (falls back to tap). The engine only yields raw transcripts; `speechVocab.ts` parses them into a note or fret, and `useVoiceAnswer` routes the result through the same `selectAnswer`/`selectFret` the tap handlers use. Timer/callback values are kept in refs per the repo convention.

**Persistence** (`src/utils/settings.ts`): a thin typed localStorage wrapper (`loadSetting`/`saveSetting`) used by `useSelector`, `App.tsx` preferences, and history. There's no central store — each hook reads/writes its own keys.

**History/stats**: `useHistory` stores per-question `HistoryEntry` records in localStorage, scoped by the `historyKey()` string from `useSelector` so switching string/mode/difficulty combinations doesn't mix stats. `StatsPanel` reads this to render accuracy/timing breakdowns.

## Conventions

- Sound effects and haptics (`src/utils/feedback.ts`) are fired alongside UI actions via a small `click()` wrapper in `App.tsx` — follow that pattern (`playClickSound()` + `haptic.tap()`) when adding new interactive controls.
- Timer-driven game logic prefers refs over state for values read inside `setTimeout`/`setInterval` callbacks, to avoid stale closures; state is kept in sync alongside the ref for rendering. Follow this pattern rather than adding effects that re-derive from state.
