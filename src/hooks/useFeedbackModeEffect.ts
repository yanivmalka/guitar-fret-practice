import { useEffect } from 'react';
import { setSilent as setAudioSilent } from '../utils/audio';
import {
  setSilent as setFeedbackSilent,
  setHapticsEnabled,
  setUiSoundsEnabled,
  type FeedbackMode,
} from '../utils/feedback';

// Feedback mode — a phone-ringer-style switch over how the drill answers back:
//  - 'sound'   — question note, chimes and UI click sounds play; no vibration.
//  - 'vibrate' — no sound at all; a haptic pulse on every button press and on
//                right / wrong answers instead.
//  - 'silent'  — neither sound nor vibration; visual-only. On-screen
//                celebrations still run.
// Mirrors the choice into the audio + feedback subsystems, which each keep
// their own flag read from timer callbacks.
export function useFeedbackModeEffect(mode: FeedbackMode) {
  useEffect(() => {
    const soundOn = mode === 'sound';
    setAudioSilent(!soundOn);
    setFeedbackSilent(!soundOn);
    setUiSoundsEnabled(soundOn);
    setHapticsEnabled(mode === 'vibrate');
  }, [mode]);
}
