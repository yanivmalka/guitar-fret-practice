import { useEffect, useState } from 'react';
import { saveSetting } from '../utils/settings';
import type { NotationMode } from '../utils/music';
import type { SpeechNotation } from '../utils/speechVocab';
import { resetSpeechEngine, type VoiceEnginePref } from '../utils/speech';
import { getActiveProfile, isProfileReady, templateCounts } from '../utils/voiceProfile';
import { profileVocabId } from '../utils/voiceProfileVocab';

interface Params {
  notation: NotationMode;
  showVoiceCalibration: boolean;
  setVoiceEnginePref: (p: VoiceEnginePref) => void;
}

// Owns the voice-engine calibration epoch and the stored-profile summary shown
// in Settings. The epoch is bumped whenever the selected speech engine must be
// re-picked — a preference change here, a calibration session ending
// (VoiceCalibration.onProfileChanged), or a restored cloud profile
// (useCloudSync). useVoiceAnswer takes the epoch as `engineEpoch`.
export function useVoiceProfileSummary({
  notation, showVoiceCalibration, setVoiceEnginePref,
}: Params) {
  const [voiceEngineEpoch, setVoiceEngineEpoch] = useState(0);
  const bumpVoiceEngineEpoch = () => setVoiceEngineEpoch((n) => n + 1);
  // Summary of the stored personal voice profile, shown in Settings so it is
  // obvious that recordings exist and can be extended.
  const [voiceProfileStat, setVoiceProfileStat] = useState<
    { enabled: boolean; count: number } | null
  >(null);

  const pickVoiceEngine = (p: VoiceEnginePref) => {
    setVoiceEnginePref(p);
    saveSetting('pref_voiceEngine', p);
    resetSpeechEngine();
    bumpVoiceEngineEpoch();
  };

  // Refresh the voice-profile summary on mount and whenever a calibration
  // session ends or the engine preference changes.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const active = getActiveProfile();
      if (!active) { if (alive) setVoiceProfileStat({ enabled: false, count: 0 }); return; }
      try {
        const counts = await templateCounts(active, profileVocabId(notation as SpeechNotation), true);
        const count = Object.values(counts).reduce((s, v) => s + v, 0);
        if (alive) setVoiceProfileStat({ enabled: isProfileReady(), count });
      } catch {
        if (alive) setVoiceProfileStat(null);
      }
    })();
    return () => { alive = false; };
  }, [showVoiceCalibration, voiceEngineEpoch, notation]);

  return { voiceProfileStat, pickVoiceEngine, voiceEngineEpoch, bumpVoiceEngineEpoch };
}
