import { createSlice } from '@reduxjs/toolkit';
import { generateTrackingId } from '../../helpers/stepLogger.js';

// Provide the referrer based on whatever our ref is set to at page load.
const referrerMatch = window.location.search.match(/\?ref=([a-zA-Z]*)/);

const initialState = {
  username: '',
  email: '',
  phoneNumber: '',
  countryCode: null,
  phoneNumberFormatted: '',
  prefix: '',
  referrer:
    referrerMatch && referrerMatch.length === 2 ? referrerMatch[1] : 'steemit',
  token: '',
  completed: false,
  step: 'signupOptions',
  trackingId: generateTrackingId(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    guessCountryCode: (state) => {
      // logic is in saga parts
    },
    setCountryCode: (state, action) => {
      state.countryCode = action.payload.countryCode;
    },
    incrementStep: (state) => {
      // logic is in saga parts
    },
    decrementStep: (state) => {
      // logic is in saga parts
    },
    setStep: (state, action) => {
      state.step = action.payload.step;
    },
    setUsername: (state, action) => {
      state.username = action.payload.username;
    },
    setEmail: (state, action) => {
      state.email = action.payload.email;
    },
    setPhone: (state, action) => {
      state.phoneNumber = action.payload.phone;
    },
    setPhoneFormatted: (state, action) => {
      state.phoneNumberFormatted = action.payload.phoneNumberFormatted;
    },
    setToken: (state, action) => {
      state.token = action.payload.token;
    },
    setPrefix: (state, action) => {
      state.prefix = action.payload.prefix;
    },
    setCompleted: (state, action) => {
      state.completed = action.payload.completed;
    },
    setTrackingId: (state, action) => {
      state.trackingId = action.payload.trackingId;
    },
  },
});

export const {
  guessCountryCode,
  setCountryCode,
  incrementStep,
  decrementStep,
  setStep,
  setUsername,
  setEmail,
  setPhone,
  setPhoneFormatted,
  setToken,
  setPrefix,
  setCompleted,
  setTrackingId,
} = userSlice.actions;

export const getStep = (state) => state.user.step;
export const getTrackingId = (state) => state.user.trackingId;

export default userSlice.reducer;
