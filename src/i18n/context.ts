import { createContext } from 'react';
import type { Lang } from './translations';

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Looks up `source` (the English text) in the active language's dictionary. */
  t: (source: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
