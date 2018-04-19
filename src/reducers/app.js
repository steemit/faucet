import { Map, List } from 'immutable';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';
import getTranslations, { getAvailableLocale } from '../utils/locales';

const SET_LOCALE = 'faucet/locale/set';

const locale = getAvailableLocale('auto');
const translations = getTranslations(locale);
const antdLocales = {
    en: enUS,
    fr: frFR,
    default: enUS
};

const initialState = Map({
    locale,
    translations,
    antdLocales,
    // TODO: add steps for confirm-email and create-account routes.
    steps: List([
        'username',
        'email',
        'checkYourEmail',
        // user gets email with link to /confirm-email
        'phoneNumber',
        'confirmPhoneNumber',
        'finish'
        // user gets email with link to /create-account
    ])
});

export default (state = initialState, action = {}) => {
    switch (action.type) {
        case SET_LOCALE:
            return state.merge({
                locale: action.payload.locale,
                translations: getTranslations(action.payload.locale)
            });
        default:
            return state;
    }
};

export const setLocale = newLocale => ({
    type: SET_LOCALE,
    payload: { locale: newLocale }
});

// Selectors.
export const getSteps = state => state.app.get('steps');
