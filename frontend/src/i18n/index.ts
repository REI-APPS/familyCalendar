import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS, pt as ptLocale, es as esLocale } from 'date-fns/locale';
import { storage } from '../utils/storage';
import en from './en.json';
import pt from './pt.json';
import es from './es.json';

const LANG_KEY = 'app_language';

export type Lang = 'en' | 'pt' | 'es';
export const SUPPORTED_LANGS: Lang[] = ['en', 'pt', 'es'];

const dateLocales: Record<Lang, Locale> = {
  en: enUS,
  pt: ptLocale,
  es: esLocale,
};

// Synchronous init with default English. We hydrate the persisted language
// asynchronously after mount (see hydrateLanguage below).
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function hydrateLanguage() {
  const saved = await storage.getItem(LANG_KEY, '');
  if (saved && SUPPORTED_LANGS.includes(saved as Lang)) {
    await i18n.changeLanguage(saved);
  }
}

export async function setAppLanguage(lng: Lang) {
  await i18n.changeLanguage(lng);
  await storage.setItem(LANG_KEY, lng);
}

export function currentDateLocale(): Locale {
  const lng = (i18n.language || 'en').slice(0, 2) as Lang;
  return dateLocales[lng] || enUS;
}

export default i18n;
