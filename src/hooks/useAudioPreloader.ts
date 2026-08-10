import { useEffect } from 'react';
import { STAGES } from '../utils/stages';
import {
  preloadOnStartup,
  preloadStage,
  preloadCurrentQuestion,
  preloadAdjacentStages,
  cancelPreload,
  markAudioUnlocked,
} from '../utils/audioPreloader';
import { isAudioReady } from '../utils/audio';

/**
 * Hook that orchestrates audio preloading based on game state.
 * - On mount: triggers startup preload (user's last stage or common notes)
 * - On stage change: preloads new stage's notes + adjacent stages
 * - On new question: ensures current note is top priority
 */
export function useAudioPreloader(
  stageIndex: number,
  running: boolean,
  currentString: number,
  currentFret: number | null,
) {
  // One-time startup preload
  useEffect(() => {
    preloadOnStartup();
  }, []);

  // When AudioContext becomes ready, notify the preloader so it can decode
  useEffect(() => {
    if (isAudioReady()) {
      markAudioUnlocked();
    }
  });

  // On stage change: cancel stale queue, preload new stage, then adjacent
  useEffect(() => {
    const stage = STAGES[stageIndex];
    if (!stage) return;
    cancelPreload();
    preloadStage(stage, 'high');
    preloadAdjacentStages(stageIndex);
  }, [stageIndex]);

  // On new question: ensure current note is highest priority
  useEffect(() => {
    if (running && currentFret !== null) {
      preloadCurrentQuestion(currentString, currentFret);
    }
  }, [running, currentString, currentFret]);
}
