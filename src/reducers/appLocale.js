import getTranslations, { getAvailableLocale } from '../utils/locales';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';

// Actions
const SET_LOCALE = 'faucet/locale/set';
const SET_TRANSLATIONS = 'faucet/translations/set';

// Init State
// TODO: init Immutable Record here.
const locale = getAvailableLocale('auto');
const locales = {
    en: 'English',
    fr: 'Français',
    zh: '简体中文',
};
const translations = getTranslations(locale);
const antdLocales = { en: enUS, fr: frFR, default: enUS };

const initialState = {
    locale,
    locales,
    translations,
    antdLocales,
};

// Reducer.
export default (state = initialState, action = {}) => {
    switch (action.type) {
        case SET_LOCALE:
            const translations = getTranslations(action.payload.locale);
            return {
                ...state,
                locale: action.payload.locale,
                translations: translations,
            };
        default:
            return state;
    }
};

export const setLocale = locale => {
    return {
        type: SET_LOCALE,
        payload: { locale },
    };
};
