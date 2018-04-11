import { Record, Map, List } from 'immutable';
import getTranslations, { getAvailableLocale } from '../utils/locales';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';

const SET_LOCALE = 'faucet/locale/set';
const SET_TRANSLATIONS = 'faucet/translations/set';

export const App = new Record({
    locale: '',
    locales: {
        en: 'English',
        fr: 'Français',
        zh: '简体中文',
    },
    translations: {},
    antdLocales: {},
    // TODO: add steps for confirm-email and create-account routes.
    steps: List([
        'username',
        'email',
        'checkYourEmail',
        // user gets email with link to /confirm-email
        'phoneNumber',
        'confirmPhoneNumber',
        'finish',
        // user gets email with link to /create-account
    ]),
});

const locale = getAvailableLocale('auto');
const translations = getTranslations(locale);
const antdLocales = {
    en: enUS,
    fr: frFR,
    default: enUS,
};

const initialState = new App({
    locale,
    translations,
    antdLocales,
});

export default (state = initialState, action = {}) => {
    switch (action.type) {
        case SET_LOCALE:
            const translations = getTranslations(action.payload.locale);
            return state.merge({
                locale: action.payload.locale,
                translations: translations,
            });
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

// Selectors.
export const getSteps = state => {
    return state.app.steps;
};
