import enLocale from '../locales/en.json';
import frLocale from '../locales/fr.json';
import zhLocale from '../locales/zh_CN.json';

export const translations = {
  en: enLocale,
  fr: frLocale,
  'zh-cn': zhLocale,
};

export const locales = {
  en: 'English',
  'zh-cn': '简体中文',
  fr: 'Français',
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
  locale = locale.toLowerCase();
  if (translations[locale]) {
    return locale;
  }
  return 'en';
};

export const getTranslations = (locale) => translations[locale];
