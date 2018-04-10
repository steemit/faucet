import { Map } from 'immutable';
import { generateTrackingId } from '../../helpers/stepLogger';

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
const SET_TRACKING_ID = 'user/SET_TRACKING_ID';

const defaultState = Map({
    username: '',
    email: '',
    phoneNumber: '',
    countryCode: null,
    phoneNumberFormatted: '',
    prefix: '',
    referrer: 'steemit',
    token: '',
    completed: false,
    step: 'username',
    trackingId: generateTrackingId()
});

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
        case SET_PHONE_FORMATTED:
            return state.set(
                'phoneNumberFormatted',
                action.payload.phoneNumberFormatted
            );
        case SET_TOKEN:
            return state.set('token', action.payload.token);
        case SET_STEP:
            return state.set('step', action.payload.step);
        case SET_PREFIX:
            return state.set('prefix', action.payload.prefix);
        case SET_COMPLETED:
            return state.set('prefix', action.payload.completed);
        case SET_TRACKING_ID:
            return state.set('trackingId', action.payload.trackingId);
        default:
            return state;
    }
}

export const guessCountryCode = () => ({
    type: GUESS_COUNTRY_CODE
});

export const setCountryCode = countryCode => ({
    type: SET_COUNTRY_CODE,
    payload: { countryCode }
});

export const incrementStep = () => ({
    type: INCREMENT_STEP
});

export const decrementStep = () => ({
    type: DECREMENT_STEP
});

export const setStep = step => ({
    type: SET_STEP,
    payload: { step }
});

export const setUsername = username => ({
    type: SET_USERNAME,
    payload: { username }
});

export const setEmail = email => ({
    type: SET_EMAIL,
    payload: { email }
});

export const setPhone = phone => ({
    type: SET_PHONE,
    payload: { phone }
});

export const setPhoneFormatted = phoneNumberFormatted => ({
    type: SET_PHONE_FORMATTED,
    payload: { phoneNumberFormatted }
});

export const setToken = token => ({
    type: SET_TOKEN,
    payload: { token }
});

export const setPrefix = prefix => ({
    type: SET_PREFIX,
    payload: { prefix }
});

export const setCompleted = completed => ({
    type: SET_COMPLETED,
    payload: { completed }
});

export const setTrackingId = trackingId => ({
    type: SET_TRACKING_ID,
    payload: { trackingId }
});

// Selectors
export const getStep = state => state.user.get('step');
export const getTrackingId = state => state.user.get('trackingId');
