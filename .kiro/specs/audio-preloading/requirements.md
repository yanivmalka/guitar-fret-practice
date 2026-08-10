# Requirements: Intelligent Audio Preloading & Caching

## Summary

Preload guitar note sound files intelligently so users never experience audio latency during gameplay. On app load, preload common notes; use user history to prioritize their preferred stage's sounds; cache fetched samples persistently; and when the user switches stages, eagerly fetch that stage's samples in priority order (current question first, then remaining stage notes, then adjacent stages).

## Functional Requirements

### FR-1: Preload common notes on app startup
- On first meaningful app load (after AudioContext unlock), begin fetching the most commonly used note samples in the background.
- "Common notes" = open strings (frets 0) and dot-position frets (3, 5, 7, 9, 12) across all 6 strings.
- This fetch must be non-blocking — the app remains interactive while preloading proceeds.

### FR-2: Use persisted user history to prioritize startup preload
- If the user has previously played stages (detectable via localStorage `stageIndex` or history), determine their last-used stage's note set.
- Preload that stage's full note set before (or instead of) the generic common-notes set.
- Fall back to FR-1 common notes if no history exists.

### FR-3: Persistent audio cache (Cache API)
- Store fetched audio sample files in a persistent browser cache (Cache API or similar) so they survive page reloads and app restarts.
- On subsequent loads, serve samples from cache — no network request needed for previously fetched notes.
- The in-memory `AudioBuffer` cache remains for decoded buffers within a session; the persistent cache stores raw MP3 responses.

### FR-4: Stage-switch preloading
- When the user navigates to a different stage (via picker, arrows, or swipe), immediately begin preloading all note samples required by that stage's configuration (string(s), fret range, filters).
- This preload runs in the background while the game is open/running.

### FR-5: Priority order during gameplay preloading
- When a game session starts or a stage switch occurs, fetch samples in this priority order:
  1. **Immediate**: The specific note for the first/current question (so the user hears it without delay).
  2. **Stage notes**: All other notes in the current stage's valid fret set.
  3. **Adjacent stages**: Notes for the next and previous stages in the curriculum.
- If a note is already in cache (persistent or in-memory), skip it.

### FR-6: Zero perceived latency during gameplay
- The user must not perceive any audio delay when a question is presented.
- If a sample is not yet cached at play time, fetch it on demand (existing behavior) — but the preloading strategy should make this case extremely rare after the first few seconds.

### FR-7: Cache serves in-progress requests
- If a preload fetch is already in-flight for a given note, a gameplay request for the same note must await the existing fetch rather than starting a duplicate request.
- No duplicate network requests for the same sample.

## Non-Functional Requirements

### NFR-1: No impact on initial page load
- Preloading must not start until after the first user interaction (AudioContext unlock) or after the main UI has rendered.
- Network requests for audio should not compete with critical resources (HTML, CSS, JS, fonts).

### NFR-2: Bandwidth-aware
- Preloading fetches should be low-priority (use `fetch` without high-priority hints).
- On slow connections, the app remains usable — preloading is best-effort.

### NFR-3: Cache size management
- The full soundfont for 6 strings × 22 frets = 132 samples (~2–5 KB each) ≈ ~500 KB total.
- This is acceptable for persistent caching — no eviction policy needed for this scale.

### NFR-4: Offline support
- Once all samples for a stage are cached, that stage is fully playable offline (aligns with existing PWA/service-worker architecture).

### NFR-5: No regression on existing audio behavior
- Existing `playNote`, `playNoteSingle`, `playNoteSequence`, and `beep` functions must continue working identically.
- The cache layer is transparent to the playback system.
