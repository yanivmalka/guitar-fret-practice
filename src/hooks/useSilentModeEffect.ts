import { useEffect } from 'react';
import { setSilent as setAudioSilent } from '../utils/audio';
import { setSilent as setFeedbackSilent } from '../utils/feedback';

// Silent mode: mute the drill's content audio (question note + correct chime +
// celebration tones) while keeping UI clicks, haptics and on-screen
// celebrations. Mirrors the flag into the audio + feedback subsystems.
export function useSilentModeEffect(silentMode: boolean) {
  useEffect(() => {
    setAudioSilent(silentMode);
    setFeedbackSilent(silentMode);
  }, [silentMode]);
}
