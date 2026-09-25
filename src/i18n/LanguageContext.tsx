import { useState, type ReactNode } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { isLang, translate, type Lang } from './translations';
import { LanguageContext } from './context';
import { detectLanguage } from '../utils/region';
import { setSolfegeLanguage } from '../utils/music';

export function LanguageProvider({ children }: { children: ReactNode }) {
  // First launch (no stored choice): open in the language of the player's
  // region and remember it. Written straight to localStorage rather than via
  // saveSetting so an automatic guess never pushes over a language the player
  // chose on another device — sign-in adopts the cloud copy on a fresh device.
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = loadSetting<Lang | null>('pref_language', null);
    if (isLang(stored)) return stored;
    const guess = detectLanguage();
    try { localStorage.setItem('pref_language', JSON.stringify(guess)); } catch { /* ignore */ }
    return guess;
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    saveSetting('pref_language', l);
  };
  // Set before the children render so every note label this render draws
  // already uses the language's solfège spelling. Idempotent.
  setSolfegeLanguage(lang);
  const t = (source: string) => translate(lang, source);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
