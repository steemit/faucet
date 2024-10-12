import enLocale from '../locales/en.json';
import frLocale from '../locales/fr.json';
import zhLocale from '../locales/zh.json';

export const translations = {
  en: enLocale,
  fr: frLocale,
  zh: zhLocale,
};

export const getAvailableLocale = (app) => {
  let locale = app || 'auto';
  // TODO: Test this.
  if (typeof navigator !== 'undefined' && app === 'auto') {
    locale =
      navigator.userLanguage ||
      navigator.language ||
      (navigator.languages && navigator.languages[0]
        ? navigator.languages[0]
        : 'en');
  }
  if (translations[locale.slice(0, 2)]) {
    return locale.slice(0, 2);
  }
  return 'en';
};

export const getTranslations = (app) => translations[getAvailableLocale(app)];
