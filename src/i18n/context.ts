import { createContext } from 'react';
import type { Lang } from './translations';

/** State of the download behind the latest `setLang` to a not-yet-loaded language. */
export type LanguageLoad = 'idle' | 'loading' | 'failed';

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  languageLoad: LanguageLoad;
  /** Looks up `source` (the English text) in the active language's dictionary. */
  t: (source: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
