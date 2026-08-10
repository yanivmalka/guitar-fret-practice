import { loadSample, isCached, isAudioReady, prefetchToPersistentCache, openMidi } from './audio';
import { getValidFrets } from './music';
import { STAGES } from './stages';
import type { Stage } from './stages';
import { loadSetting } from './settings';

const MAX_CONCURRENT = 4;
let activeCount = 0;
let queue: { midi: number; priority: number }[] = [];
let unlocked = false;

/** Call after AudioContext is unlocked to allow queue processing */
export function markAudioUnlocked() {
  if (unlocked) return; // already unlocked — no-op
  unlocked = true;
  processQueue();
}

/** Compute all MIDI note numbers a stage can produce */
export function getStageMidiNotes(stage: Stage): number[] {
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

function enqueue(midi: number, priority: number) {
  // Skip if already decoded in memory
  if (isCached(midi)) return;
  // Avoid duplicates in queue
  if (queue.some(q => q.midi === midi)) return;
  queue.push({ midi, priority });
  queue.sort((a, b) => b.priority - a.priority);
  processQueue();
}

function processQueue() {
  // If audio isn't unlocked yet, prefetch to persistent cache only
  if (!unlocked) {
    processQueuePersistentOnly();
    return;
  }

  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    if (isCached(item.midi)) continue; // might have been cached while queued
    activeCount++;
    loadSample(item.midi).finally(() => {
      activeCount--;
      processQueue();
    });
  }
}

/** Pre-unlock: fetch into persistent cache without decoding */
function processQueuePersistentOnly() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    if (isCached(item.midi)) continue;
    activeCount++;
    prefetchToPersistentCache(item.midi).finally(() => {
      activeCount--;
      if (!unlocked) {
        processQueuePersistentOnly();
      } else {
        processQueue();
      }
    });
  }
}

/** Preload all notes for a stage */
export function preloadStage(stage: Stage, priority: 'high' | 'low') {
  const priorityValue = priority === 'high' ? 10 : 1;
  const midiNotes = getStageMidiNotes(stage);
  for (const midi of midiNotes) {
    enqueue(midi, priorityValue);
  }
}

/** Ensure the current question's note is loaded with highest priority */
export function preloadCurrentQuestion(stringNum: number, fret: number) {
  const midi = openMidi[stringNum - 1] + fret;
  enqueue(midi, 100);
}

/** Common dot-fret notes across all strings (startup fallback) */
function getCommonMidiNotes(): number[] {
  const dotFrets = [0, 3, 5, 7, 9, 12];
  const midiNotes: number[] = [];
  for (let s = 0; s < 6; s++) {
    for (const f of dotFrets) {
      midiNotes.push(openMidi[s] + f);
    }
  }
  return midiNotes;
}

/** Preload on app startup: user's last stage first, then common notes */
export function preloadOnStartup() {
  const stageIndex = loadSetting<number>('stageIndex', 0);
  const stage = STAGES[stageIndex];

  if (stage) {
    // Preload user's last-used stage at high priority
    preloadStage(stage, 'high');
  }

  // Backfill common notes at low priority
  const commonNotes = getCommonMidiNotes();
  for (const midi of commonNotes) {
    enqueue(midi, stage ? 1 : 10); // high priority if no stage history
  }
}

/** Cancel pending preloads (in-flight requests continue to completion) */
export function cancelPreload() {
  queue = [];
}

/** Preload adjacent stages at low priority */
export function preloadAdjacentStages(stageIndex: number) {
  if (stageIndex > 0) {
    preloadStage(STAGES[stageIndex - 1], 'low');
  }
  if (stageIndex < STAGES.length - 1) {
    preloadStage(STAGES[stageIndex + 1], 'low');
  }
}

/** Check if AudioContext is ready — delegates to audio module */
export { isAudioReady };
