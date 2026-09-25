import { loadSetting } from '../utils/settings';
import { detectLanguage } from '../utils/region';
import { isLang, type Lang } from './translations';

// The language the app opens in: the player's stored pick, or — on a first
// launch with nothing stored — the guess from their region. Read-only; the
// LanguageProvider is what remembers the guess.
export function initialLanguage(): Lang {
  const stored = loadSetting<Lang | null>('pref_language', null);
  return isLang(stored) ? stored : detectLanguage();
}
