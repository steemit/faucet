import { Map, List } from 'immutable';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';
import getTranslations, { getAvailableLocale } from '../utils/locales';

const SET_LOCALE = 'faucet/locale/set';
const SHOW_SIGNUP_MODAL = 'faucet/locale/showSignupModal';
const HIDE_SIGNUP_MODAL = 'faucet/locale/hideSignupModal';

const locale = getAvailableLocale('auto');
const translations = getTranslations(locale);
const antdLocales = {
    en: enUS,
    fr: frFR,
    default: enUS,
};

const initialState = Map({
    locale,
    translations,
    antdLocales,
    // TODO: add steps for confirm-email and create-account routes.
    steps: List([
        'signupOptions',
        'signupInfo',
        'savePassword',
        'createAccount',
        // 'username',
        // 'email',
        // 'checkYourEmail',
        // user gets email with link to /confirm-email
        // 'phoneNumber',
        // 'confirmPhoneNumber',
        // 'finish',
        // user gets email with link to /create-account
    ]),
    signupModalVisible: false,
});

export default (state = initialState, action = {}) => {
    switch (action.type) {
        case SET_LOCALE:
            return state.merge({
                locale: action.payload.locale,
                translations: getTranslations(action.payload.locale),
            });
        case SHOW_SIGNUP_MODAL:
            return state.merge({
                signupModalVisible: true,
            });
        case HIDE_SIGNUP_MODAL:
            return state.merge({
                signupModalVisible: false,
            });
        default:
            return state;
    }
};

export const setLocale = newLocale => ({
    type: SET_LOCALE,
    payload: { locale: newLocale },
});

export const showSignupModal = () => ({
    type: SHOW_SIGNUP_MODAL,
});

export const hideSignupModal = () => ({
    type: HIDE_SIGNUP_MODAL,
});

// Selectors.
export const getSteps = state => state.app.get('steps');
