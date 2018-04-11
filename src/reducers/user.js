import { Record, Map } from 'immutable';

export const User = new Record({
    username: '',
    email: '',
    phoneNumber: '',
    countryCode: null,
    phoneNumberFormatted: '',
    prefix: '',
    referrer: 'steemit',
    token: '',
    completed: false,
    // TODO: schema migration to record user step?
    step: 'username',
});

const GUESS_COUNTRY_CODE = 'user/GUESS_COUNTRY_CODE';
const SET_COUNTRY_CODE = 'user/SET_COUNTRY_CODE';
const INCREMENT_STEP = 'user/INCREMENT_STEP';
const DECREMENT_STEP = 'user/DECREMENT_STEP';
const SET_STEP = 'user/SET_STEP';
const SET_USERNAME = 'user/SET_USERNAME';
const SET_EMAIL = 'user/SET_EMAIL';
const SET_PHONE = 'user/SET_PHONE';
const SET_PHONE_FORMATTED = 'user/SET_PHONE_FORMATTED';
const SET_TOKEN = 'user/SET_TOKEN';
const SET_PREFIX = 'user/SET_PREFIX';
const SET_COMPLETED = 'user/SET_COMPLETED';

/**
 * Init State
 * TODO: Really we should simply lookup the user (from token in url parameter or cookie) in the DB.
 * Prompt them to 'resume' or 'start again'.
 * And load initial state based on that choice.
 * e.g. const user = new User(...userFromDb)
 * This would allow us to have a Single-Page App and do away with static routes entirely.
 * Worth noting that we want to make this change backwards compatible.
 * So that a user with a link to /confirm-email or /create-account can still resume correctly.
 */

const defaultState = new User();

export default function reducer(state = defaultState, action = {}) {
    switch (action.type) {
        case GUESS_COUNTRY_CODE:
            return state;
        case SET_COUNTRY_CODE:
            return state.set(
                'countryCode',
                action.payload.countryCode.location
            );
        case INCREMENT_STEP:
            return state;
        case DECREMENT_STEP:
            return state;
        case SET_USERNAME:
            return state.set('username', action.payload.username);
        case SET_EMAIL:
            return state.set('email', action.payload.email);
        case SET_PHONE:
            return state.set('phoneNumber', action.payload.phone);
        case SET_TOKEN:
            return state.set('token', action.payload.token);
        case SET_STEP:
            return state.set('step', action.payload.step);
        default:
            return state;
    }
}

export const guessCountryCode = () => {
    return {
        type: GUESS_COUNTRY_CODE,
    };
};

export const setCountryCode = countryCode => {
    return {
        type: SET_COUNTRY_CODE,
        payload: { countryCode },
    };
};

export const incrementStep = () => {
    return {
        type: INCREMENT_STEP,
    };
};

export const decrementStep = () => {
    return {
        type: DECREMENT_STEP,
    };
};

export const setStep = step => {
    return {
        type: SET_STEP,
        payload: { step },
    };
};

export const setUsername = username => {
    return {
        type: SET_USERNAME,
        payload: { username },
    };
};

export const setEmail = email => {
    return {
        type: SET_EMAIL,
        payload: { email },
    };
};

export const setPhone = phone => {
    return {
        type: SET_PHONE,
        payload: { phone },
    };
};

export const setToken = token => {
    return {
        type: SET_TOKEN,
        payload: { token },
    };
};

// Selectors
export const getStep = state => {
    return state.user.step;
};
