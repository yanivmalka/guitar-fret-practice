import { useState, type ReactNode } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { translate, type Lang } from './translations';
import { LanguageContext } from './context';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadSetting<Lang>('pref_language', 'en'));
  const setLang = (l: Lang) => {
    setLangState(l);
    saveSetting('pref_language', l);
  };
  const t = (source: string) => translate(lang, source);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
