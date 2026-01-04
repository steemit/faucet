import { createSlice } from '@reduxjs/toolkit';
import { generateTrackingId } from '../../helpers/stepLogger.js';

const initialState = {
  username: '',
  password: '',
  token: '',
  countryCode: null,
  trackingId: generateTrackingId(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    guessCountryCode: () => {
      // logic is in saga parts
    },
    setCountryCode: (state, action) => {
      state.countryCode = action.payload;
    },
    setTrackingId: (state, action) => {
      state.trackingId = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setPassword: (state, action) => {
      state.password = action.payload;
    },
    setUsername: (state, action) => {
      state.username = action.payload;
    },
  },
});

export const {
  guessCountryCode,
  setCountryCode,
  setTrackingId,
  setToken,
  setPassword,
  setUsername,
} = userSlice.actions;

export const getTrackingId = (state) => state.user.trackingId;
export const getToken = (state) => state.user.token;
export const getPassword = (state) => state.user.password;
export const getUsername = (state) => state.user.username;

export default userSlice.reducer;
