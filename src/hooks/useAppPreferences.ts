import { useCallback, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { NotationMode, OrderMode } from '../utils/music';
import type { VoiceEnginePref } from '../utils/speech';
import type { Theme } from '../utils/theme';
import { DEFAULT_MASTERY_WINDOW, type MasteryWindow } from '../utils/mastery';

type AnswerMode = 'tap' | 'voice';

// Global display / behaviour preferences, each backed by its own `pref_*`
// localStorage key (read once at mount, exactly as before). The setters are the
// raw state setters — call sites still persist with `saveSetting` alongside the
// setter, unchanged — except `setTheme`, which persists internally (it always
// did). `guitarString` is deliberately NOT here: it is synced from
// derivedSettings via an effect + clamp in App.
export function useAppPreferences() {
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation, setNotation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('pref_order', 'fifths'));
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() => loadSetting('pref_answerMode', 'tap'));
  const [voiceEnginePref, setVoiceEnginePref] = useState<VoiceEnginePref>(
    () => loadSetting('pref_voiceEngine', 'auto'),
  );
  const [showScore, setShowScore] = useState(() => loadSetting('pref_showScore', true));
  const [showMastery, setShowMastery] = useState(() => loadSetting('pref_showMastery', true));
  const [masteryWindow, setMasteryWindow] = useState<MasteryWindow>(
    () => loadSetting('pref_masteryWindow', DEFAULT_MASTERY_WINDOW),
  );
  const [silentMode, setSilentMode] = useState(() => loadSetting('pref_silentMode', false));
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(() =>
    loadSetting('pref_leaderboardOptOut', false),
  );
  const [theme, setThemeState] = useState<Theme>(() => loadSetting<Theme>('pref_theme', 'dark'));
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveSetting('pref_theme', t);
  }, []);

  return {
    byString, setByString,
    notation, setNotation,
    order, setOrder,
    answerMode, setAnswerMode,
    voiceEnginePref, setVoiceEnginePref,
    showScore, setShowScore,
    showMastery, setShowMastery,
    masteryWindow, setMasteryWindow,
    silentMode, setSilentMode,
    leaderboardOptOut, setLeaderboardOptOut,
    theme, setTheme,
  };
}
