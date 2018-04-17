/* eslint-disable global-require,import/no-dynamic-require */
import { addLocaleData } from 'react-intl';
import merge from 'lodash/merge';
import availableLocales from '../../helpers/locales.json';
import defaultLocale from '../locales/en.json';

export const translations = {};

Object.keys(availableLocales).forEach(key => {
    const localeImport = require(`../locales/${key}.json`);
    translations[key] = merge({}, defaultLocale, localeImport);
    const localeIntl = require(`react-intl/locale-data/${key}`);
    addLocaleData(localeIntl);
});

export const getAvailableLocale = app => {
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

const getTranslations = app => translations[getAvailableLocale(app)];

export default getTranslations;
