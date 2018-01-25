/* eslint-disable global-require,import/no-dynamic-require */
import { addLocaleData } from 'react-intl';
import availableLocales from '../../helpers/locales.json';

export const translations = {};
Object.keys(availableLocales).forEach((key) => {
  const localeImport = require(`../locales/${key}.json`);
  translations[key] = localeImport;
  const localeIntl = require(`react-intl/locale-data/${key}`);
  addLocaleData(localeIntl);
});

export const getAvailableLocale = (appLocale) => {
  let locale = appLocale || 'auto';

  if (typeof navigator !== 'undefined' && appLocale === 'auto') {
    locale =
      navigator.userLanguage ||
      navigator.language ||
      (navigator.languages && navigator.languages[0] ? navigator.languages[0] : 'en');
  }

  if (translations[locale.slice(0, 2)]) {
    return locale.slice(0, 2);
  }

  return 'en';
};

const getTranslations = appLocale => translations[getAvailableLocale(appLocale)];

export default getTranslations;
