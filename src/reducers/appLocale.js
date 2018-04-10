import getTranslations, { getAvailableLocale } from '../utils/locales';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';

// Actions
const SET_LOCALE = 'faucet/locale/set';
const SET_TRANSLATIONS = 'faucet/translations/set';

// Init State
// TODO: init Immutable Record here.
const initLocale = getAvailableLocale('auto');
const translations = getTranslations(initLocale);
const antdLocales = { en: enUS, fr: frFR, default: enUS };

const initialState = {
    locale: initLocale,
    translations: translations,
    antdLocales: antdLocales,
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
    debugger;
    return {
        type: SET_LOCALE,
        payload: { locale: locale },
    };
};
