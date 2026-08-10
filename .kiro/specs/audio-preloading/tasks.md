# Tasks: Intelligent Audio Preloading & Caching

## Task 1: Add persistent cache and deduplication to `loadSample`

**File**: `src/utils/audio.ts`

1. Add a constant `CACHE_NAME = 'guitar-samples-v1'` at the top of the module.
2. Add a module-level `inFlight` map: `const inFlight = new Map<string, Promise<AudioBuffer | null>>()`.
3. Export a helper `isCached(midi: number): boolean` that returns `true` if the note name is already in the in-memory `cache` object.
4. Export `openMidi` (currently a private `const`) so the preloader module can compute MIDI numbers.
5. Rewrite `loadSample` to:
   - Return immediately from in-memory `cache` if present.
   - If `inFlight` has an entry for this note name, `await` and return it (deduplication).
   - Otherwise, create a promise via a new `loadAndCache(name)` helper, store it in `inFlight`, await it, delete from `inFlight`, and return.
6. Implement `loadAndCache(name: string)`:
   - Open persistent cache via `caches.open(CACHE_NAME)`.
   - Try `persistentCache.match(url)` — if hit, use that response.
   - If miss, `fetch(url)`. If `response.ok`, `persistentCache.put(url, response.clone())`.
   - Decode the response's `arrayBuffer()` via `getCtx().decodeAudioData(buf)`.
   - Store in in-memory `cache[name]` and return.
   - Wrap in try/catch — return `null` on failure (same as current error behavior).
7. If `caches` is undefined (e.g. insecure context), fall back to direct fetch without persistent caching.
8. Export `loadSample` (currently unexported) so the preloader can call it.

## Task 2: Create `src/utils/audioPreloader.ts`

**New file**: `src/utils/audioPreloader.ts`

1. Import `loadSample`, `isCached`, `openMidi` from `./audio`.
2. Import `getValidFrets` from `./music`.
3. Import `STAGES` and `Stage` type from `./stages`.
4. Implement `getStageMidiNotes(stage: Stage): number[]`:
   - Determine active strings: `stage.multiStrings.length > 0 ? stage.multiStrings : [stage.string]`.
   - For each string, call `getValidFrets(str - 1, stage.fretFrom, stage.fretTo, stage.wholeToneOnly, stage.dotsOnly)`.
   - Map each fret to MIDI: `openMidi[str - 1] + fret`.
   - Collect into a `Set<number>` to deduplicate, return as array.
5. Implement a priority queue system:
   - Module-level: `let queue: { midi: number; priority: number }[] = []`, `let activeCount = 0`, `const MAX_CONCURRENT = 4`.
   - `enqueue(midi: number, priority: number)`: skip if `isCached(midi)`, skip if already in queue, push, sort descending by priority, call `processQueue()`.
   - `processQueue()`: while `activeCount < MAX_CONCURRENT && queue.length > 0`, shift item, increment `activeCount`, call `loadSample(item.midi).finally(() => { activeCount--; processQueue(); })`.
6. Export `preloadStage(stage: Stage, priority: 'high' | 'low')`:
   - Get MIDI notes via `getStageMidiNotes(stage)`.
   - Enqueue each with priority value (`high` = 10, `low` = 1).
7. Export `preloadCurrentQuestion(stringNum: number, fret: number)`:
   - Compute MIDI: `openMidi[stringNum - 1] + fret`.
   - Enqueue with priority 100 (highest).
8. Export `preloadOnStartup()`:
   - Read `stageIndex` from localStorage (using `loadSetting` from `./settings`).
   - If valid, call `preloadStage(STAGES[stageIndex], 'high')`.
   - Then enqueue common notes (dot frets × 6 strings) at low priority.
   - If no saved stage, only enqueue common notes at high priority.
9. Export `cancelPreload()`:
   - Clear the queue array (set `queue = []`). In-flight fetches continue — they'll cache their results.

## Task 3: Create `src/hooks/useAudioPreloader.ts`

**New file**: `src/hooks/useAudioPreloader.ts`

1. Import `useEffect` from React.
2. Import `preloadOnStartup`, `preloadStage`, `preloadCurrentQuestion`, `cancelPreload` from `../utils/audioPreloader`.
3. Import `STAGES` from `../utils/stages`.
4. Export `useAudioPreloader(stageIndex: number, running: boolean, currentString: number, currentFret: number | null)`:
   - `useEffect(() => { preloadOnStartup(); }, [])` — one-time startup preload.
   - `useEffect` on `[stageIndex]`:
     - Call `cancelPreload()` to clear stale queue.
     - Call `preloadStage(STAGES[stageIndex], 'high')`.
     - Compute adjacent stages (`stageIndex - 1`, `stageIndex + 1`) — if valid, `preloadStage(STAGES[adj], 'low')`.
   - `useEffect` on `[running, currentString, currentFret]`:
     - If `running && currentFret !== null`, call `preloadCurrentQuestion(currentString, currentFret)`.

## Task 4: Integrate `useAudioPreloader` into `App.tsx`

**File**: `src/App.tsx`

1. Import `useAudioPreloader` from `./hooks/useAudioPreloader`.
2. Identify the relevant state values already available in App: `stageIndex`, `running`, `guitarString`, `currentFret`.
3. Add the hook call near other hook invocations:
   ```tsx
   useAudioPreloader(stageIndex, running, guitarString, currentFret);
   ```
4. Ensure `currentFret` is accessible — it comes from `useGameEngine`'s returned state. If not directly available, expose it or use the equivalent value.

## Task 5: Remove old `preloadAllSamples` usage

**File**: `src/utils/audio.ts`

1. The existing `preloadAllSamples()` function fetches ALL 6×19 = 114 samples in one shot with no prioritization.
2. Keep the function (it may be referenced elsewhere) but mark it as deprecated with a comment.
3. Search for any call sites of `preloadAllSamples` in the codebase — if called from App.tsx or elsewhere, remove those calls (the new `useAudioPreloader` hook replaces this behavior).

## Task 6: Handle AudioContext-not-yet-unlocked edge case

**File**: `src/utils/audioPreloader.ts`

1. `preloadOnStartup` should check if AudioContext can be created (the `getCtx()` call won't fail, but decoding needs it).
2. Strategy: preload into persistent cache (fetch + store raw response) even before AudioContext is unlocked. Decoding into AudioBuffer happens lazily on first `loadSample` call during gameplay.
3. Add an alternative path in `loadAndCache`: if `audioCtx` is null or suspended, still fetch and persist to Cache API, but skip `decodeAudioData` — just store in persistent cache without populating in-memory `cache`. On next `loadSample` call (when AudioContext is ready), it'll find the persistent cache hit and decode.
4. Alternatively (simpler): only start preloading after `unlockAudio()` is called. Since the app requires a user tap to start, this is guaranteed to happen before gameplay. Add a module-level `let unlocked = false` flag in the preloader, set it when `unlockAudio` is called, and gate `processQueue` on it.

## Task 7: Build verification

1. Run `npm run build` — confirm no TypeScript errors.
2. Run `npm run lint` — confirm no lint warnings from new files.
3. Manual verification checklist:
   - [ ] Open app → Network tab shows background fetches for common/stage notes after first tap
   - [ ] Navigate to a different stage → new set of fetches begins
   - [ ] Start a game → first note plays instantly (no visible delay)
   - [ ] Reload the page → no network fetches for previously loaded notes (served from Cache API)
   - [ ] Open DevTools → Application → Cache Storage → `guitar-samples-v1` contains MP3 entries
   - [ ] Rapidly switch stages → no duplicate requests, previous queue is cancelled
   - [ ] Disable network after preloading → notes still play from cache
