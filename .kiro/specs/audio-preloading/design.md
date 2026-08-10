# Design: Intelligent Audio Preloading & Caching

## Overview

The current audio system (`src/utils/audio.ts`) lazily fetches individual MP3 samples from a CDN on first play, storing decoded `AudioBuffer` objects in a module-level `cache` map. This design adds two layers on top:

1. **Persistent cache** — a Cache API store (`caches.open('guitar-samples-v1')`) that persists raw MP3 responses across sessions.
2. **Preload scheduler** — a priority queue that fetches samples ahead of time based on stage context, user history, and gameplay state.

The playback functions (`playNote`, `playNoteSingle`, etc.) remain unchanged — they call the same `loadSample(midi)` function, which now checks persistent cache before hitting the network.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Playback layer (unchanged)                             │
│  playNote / playNoteSingle / playNoteSequence           │
│       ↓ calls loadSample(midi)                          │
├─────────────────────────────────────────────────────────┤
│  loadSample(midi) — enhanced                            │
│  1. Check in-memory AudioBuffer cache → return          │
│  2. Check in-flight Promise map → await & return        │
│  3. Check persistent Cache API → decode & return        │
│  4. Fetch from CDN → store in Cache API → decode        │
├─────────────────────────────────────────────────────────┤
│  Preload scheduler (new)                                │
│  - getStageNotes(stage) → midi[]                        │
│  - preloadNotes(midi[], priority) → queues fetches      │
│  - Concurrency-limited (max 4 parallel fetches)         │
│  - Deduplicates with in-flight map                      │
├─────────────────────────────────────────────────────────┤
│  Persistent Cache (Cache API)                           │
│  - Cache name: 'guitar-samples-v1'                      │
│  - Keys: full CDN URLs (e.g. '.../C4.mp3')             │
│  - Values: raw Response (MP3 binary)                    │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### Existing (unchanged)

| Data | Location | Purpose |
|------|----------|---------|
| `cache: Record<string, AudioBuffer>` | Module-level in `audio.ts` | In-memory decoded buffers for current session |
| `openMidi: number[]` | Module-level in `audio.ts` | MIDI numbers for open strings: `[64, 59, 55, 50, 45, 40]` |
| `stageIndex` | localStorage | User's last active stage |

### New

| Data | Location | Purpose |
|------|----------|---------|
| `inFlight: Map<string, Promise<AudioBuffer \| null>>` | Module-level in `audio.ts` | Deduplication map — one fetch per note at a time |
| `CACHE_NAME = 'guitar-samples-v1'` | Constant in `audio.ts` | Persistent cache bucket name |
| `preloadQueue: { midi: number, priority: number }[]` | Module-level in new `audioPreloader.ts` | Prioritized queue of pending preloads |

## Module Changes

### 1. `src/utils/audio.ts` — Enhanced `loadSample` + Cache API

**Current `loadSample`**:
```ts
async function loadSample(midi: number): Promise<AudioBuffer | null> {
  const name = midiName(midi);
  if (cache[name]) return cache[name];
  const buf = await (await fetch(baseUrl + name + '.mp3')).arrayBuffer();
  cache[name] = await getCtx().decodeAudioData(buf);
  return cache[name];
}
```

**New `loadSample`**:
```ts
const inFlight = new Map<string, Promise<AudioBuffer | null>>();

async function loadSample(midi: number): Promise<AudioBuffer | null> {
  const name = midiName(midi);

  // 1. In-memory buffer
  if (cache[name]) return cache[name];

  // 2. Already fetching — await existing promise (dedup)
  if (inFlight.has(name)) return inFlight.get(name)!;

  // 3. Start fetch with persistent cache check
  const promise = loadAndCache(name);
  inFlight.set(name, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(name);
  }
}

async function loadAndCache(name: string): Promise<AudioBuffer | null> {
  const url = baseUrl + name + '.mp3';
  try {
    // Try persistent cache first
    const persistentCache = await caches.open(CACHE_NAME);
    let response = await persistentCache.match(url);

    if (!response) {
      // Fetch from CDN and store in persistent cache
      response = await fetch(url);
      if (response.ok) {
        await persistentCache.put(url, response.clone());
      } else {
        return null;
      }
    }

    const buf = await response.arrayBuffer();
    cache[name] = await getCtx().decodeAudioData(buf);
    return cache[name];
  } catch {
    return null;
  }
}
```

### 2. `src/utils/audioPreloader.ts` — New module

Responsible for:
- Computing which MIDI notes a stage needs
- Scheduling preloads with priority ordering
- Concurrency limiting (max 4 parallel fetches)

```ts
// Key exports:
export function getStageMidiNotes(stage: Stage): number[]
export function preloadStage(stage: Stage, priority?: 'high' | 'low'): void
export function preloadCurrentQuestion(stringNum: number, fret: number): void
export function preloadOnStartup(): void
export function cancelPreload(): void
```

**`getStageMidiNotes(stage)`**:
Uses `getValidFrets` from `music.ts` + `openMidi` from `audio.ts` to compute all possible MIDI numbers for a stage configuration:
```ts
function getStageMidiNotes(stage: Stage): number[] {
  const strings = stage.multiStrings.length > 0 ? stage.multiStrings : [stage.string];
  const midiSet = new Set<number>();
  for (const str of strings) {
    const frets = getValidFrets(str - 1, stage.fretFrom, stage.fretTo, stage.wholeToneOnly, stage.dotsOnly);
    for (const f of frets) {
      midiSet.add(openMidi[str - 1] + f);
    }
  }
  return [...midiSet];
}
```

**Priority queue processing**:
```ts
const MAX_CONCURRENT = 4;
let activeCount = 0;
let queue: { midi: number; priority: number }[] = [];

function enqueue(midi: number, priority: number) {
  // Skip if already cached (in-memory)
  if (isCached(midi)) return;
  // Avoid duplicates in queue
  if (queue.some(q => q.midi === midi)) return;
  queue.push({ midi, priority });
  queue.sort((a, b) => b.priority - a.priority); // higher priority first
  processQueue();
}

async function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    activeCount++;
    loadSample(item.midi).finally(() => { activeCount--; processQueue(); });
  }
}
```

### 3. `src/hooks/useAudioPreloader.ts` — New hook

Bridges React lifecycle with the preloader:

```ts
export function useAudioPreloader(stageIndex: number, running: boolean, currentString: number, currentFret: number | null) {
  // On mount: trigger startup preload (common notes or last-used stage)
  useEffect(() => { preloadOnStartup(); }, []);

  // On stage change: preload new stage's notes
  useEffect(() => {
    const stage = STAGES[stageIndex];
    if (stage) preloadStage(stage, 'high');
  }, [stageIndex]);

  // On new question: ensure current note is top priority
  useEffect(() => {
    if (running && currentFret !== null) {
      preloadCurrentQuestion(currentString, currentFret);
    }
  }, [running, currentString, currentFret]);
}
```

### 4. Integration in `App.tsx`

Add the hook call:
```tsx
useAudioPreloader(stageIndex, running, guitarString, currentFret);
```

## Preload Strategy by Scenario

### App startup (no history)
1. Wait for AudioContext unlock (first user tap)
2. Preload dot-fret notes for all 6 strings: frets [0, 3, 5, 7, 9, 12] × 6 strings = 36 samples

### App startup (with history)
1. Read `stageIndex` from localStorage
2. Compute MIDI notes for that stage via `getStageMidiNotes`
3. Preload those notes first (typically 5–22 samples)
4. Then backfill common notes as low-priority

### Stage switch
1. `cancelPreload()` — clear any pending low-priority queue items
2. Compute new stage's MIDI notes
3. Enqueue all at high priority
4. Enqueue adjacent stages (stageIndex ± 1) at low priority

### During gameplay (question presented)
1. The specific note for the current question is fetched with highest priority
2. Since `loadSample` checks in-memory cache first, this is typically instant (already preloaded)
3. If somehow not preloaded, it's fetched on demand (same as current behavior, but with persistent cache benefit)

## Cache API Considerations

- **Cache name versioning**: `guitar-samples-v1` — if the CDN URL structure changes, bump to `v2` and optionally delete `v1` in the service worker.
- **No expiration needed**: MIDI soundfont samples are static assets — they never change for a given URL.
- **Service worker compatibility**: The existing Workbox service worker handles app shell caching. The audio Cache API usage is separate and doesn't conflict (different cache names, different URL patterns).
- **Fallback**: If Cache API is unavailable (rare, private browsing on some browsers), fall back to fetch-only (current behavior). The in-memory cache still works within a session.

## Edge Cases

1. **AudioContext not yet unlocked**: `preloadOnStartup` only fetches raw MP3 into persistent cache — it doesn't decode to AudioBuffer until AudioContext is available. Decoding happens on first `loadSample` call after unlock.
   - Actually simpler: just defer all preloading until after `unlockAudio()` is called (which is on first user tap in the onboarding/start flow).

2. **User switches stages rapidly**: `cancelPreload()` clears the queue on each switch, so only the latest stage's notes get priority. In-flight fetches complete normally (they'll be cached regardless).

3. **Offline with cold cache**: First-time offline user has no cached samples — audio simply won't play (existing behavior). The PWA service worker doesn't cache CDN audio by default. After one online session with preloading, subsequent offline use works.

4. **Concurrent decode calls**: `decodeAudioData` can handle multiple concurrent calls. The `inFlight` map ensures we don't fetch the same URL twice, but parallel decodes for different notes are fine.
