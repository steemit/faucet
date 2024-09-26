import availableLocales from '../../helpers/locales.json';
import defaultLocale from '../locales/en.json' with { type: 'json' };

export const translations = {};

Object.keys(availableLocales).forEach((key) => {
  import(`../locales/${key}.json`, { with: { type: 'json' } }).then(
    (localeImport) => {
      translations[key] = {
        ...defaultLocale,
        ...localeImport.default,
      };
    }
  );
});

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

const getTranslations = (app) => translations[getAvailableLocale(app)];

export default getTranslations;
