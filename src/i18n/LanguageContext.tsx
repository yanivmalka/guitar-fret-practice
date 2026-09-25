import { useEffect, useRef, useState, type ReactNode } from 'react';
import { saveSetting } from '../utils/settings';
import { isDictionaryLoaded, loadDictionary, translate, type Lang } from './translations';
import { LanguageContext, type LanguageLoad } from './context';
import { initialLanguage } from './initialLanguage';
import { setSolfegeLanguage } from '../utils/music';

export function LanguageProvider({ children }: { children: ReactNode }) {
  // First launch (no stored choice): open in the language of the player's
  // region and remember it. Written straight to localStorage rather than via
  // saveSetting so an automatic guess never pushes over a language the player
  // chose on another device — sign-in adopts the cloud copy on a fresh device.
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = initialLanguage();
    try { localStorage.setItem('pref_language', JSON.stringify(initial)); } catch { /* ignore */ }
    return initial;
  });
  const [languageLoad, setLanguageLoad] = useState<LanguageLoad>('idle');
  const [, setDictionaryArrived] = useState(0);
  // The most recent pick, so a slow download never lands over a later one.
  const requested = useRef<Lang>(lang);

  // main.tsx preloads the starting language before the first render, but only
  // waits so long; if it had not arrived (or failed), fetch it here and redraw
  // when it does. Until then the English source text shows.
  useEffect(() => {
    if (isDictionaryLoaded(lang)) return;
    let live = true;
    loadDictionary(lang).then(() => { if (live) setDictionaryArrived((n) => n + 1); }, () => {});
    return () => { live = false; };
  }, [lang]);

  // A language that is not downloaded yet is fetched first; the app stays in
  // the current language until it arrives, so it never flashes English.
  const setLang = (l: Lang) => {
    requested.current = l;
    const apply = () => {
      setLangState(l);
      setLanguageLoad('idle');
      saveSetting('pref_language', l);
    };
    if (isDictionaryLoaded(l)) { apply(); return; }
    setLanguageLoad('loading');
    loadDictionary(l).then(
      () => { if (requested.current === l) apply(); },
      () => { if (requested.current === l) setLanguageLoad('failed'); },
    );
  };
  // Set before the children render so every note label this render draws
  // already uses the language's solfège spelling. Idempotent.
  setSolfegeLanguage(lang);
  const t = (source: string) => translate(lang, source);
  return (
    <LanguageContext.Provider value={{ lang, setLang, languageLoad, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
