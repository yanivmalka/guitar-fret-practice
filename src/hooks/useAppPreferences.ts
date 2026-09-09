import { useCallback, useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { NotationMode, OrderMode } from '../utils/music';
import type { VoiceEnginePref } from '../utils/speech';
import type { Season, Theme } from '../utils/theme';
import { NOTE_VOLUME_DEFAULT } from '../utils/audio';
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
  // A plain makeup-gain multiplier. Earlier builds briefly stored a string
  // enum ('low'|'normal'|'high'|'max'); map those forward so a device that set
  // it then isn't stuck on the default.
  const [noteVolume, setNoteVolume] = useState<number>(() => {
    const raw = loadSetting<number | string>('pref_noteVolume', NOTE_VOLUME_DEFAULT);
    if (typeof raw === 'number') return raw;
    return { low: 1.6, normal: 2.6, high: 3.6, max: 4.8 }[raw] ?? NOTE_VOLUME_DEFAULT;
  });
  const [theme, setThemeState] = useState<Theme>(() => loadSetting<Theme>('pref_theme', 'dark'));
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveSetting('pref_theme', t);
  }, []);
  // The seasonal palette axis, orthogonal to `theme` (the light/dim/dark
  // mode). 'winter' reproduces the pre-seasons look. Persists internally,
  // like setTheme.
  const [season, setSeasonState] = useState<Season>(
    () => loadSetting<Season>('pref_season', 'winter'),
  );
  const setSeason = useCallback((s: Season) => {
    setSeasonState(s);
    saveSetting('pref_season', s);
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
    noteVolume, setNoteVolume,
    theme, setTheme,
    season, setSeason,
  };
}
