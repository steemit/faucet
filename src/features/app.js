import { createSlice } from '@reduxjs/toolkit';
import enUS from 'antd/lib/locale-provider/en_US';
import frFR from 'antd/lib/locale-provider/fr_FR';
import getTranslations, { getAvailableLocale } from '../utils/locales.js';

const locale = getAvailableLocale('auto');
const translations = getTranslations(locale);
const antdLocales = {
  en: enUS,
  fr: frFR,
  default: enUS,
};

const initialState = {
  locale,
  translations,
  antdLocales,
  steps: [
    'signupOptions',
    'signupInfo',
    'savePassword',
    'createAccount',
    'finish',
  ],
  signupModalVisible: false,
  activityCookieName: 'activity_tag',
  activityCookieExpiresTime: 30,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLocale: (state, action) => {
      state.locale = action.payload.locale;
      state.translations = getTranslations(action.payload.locale);
    },
    showSignupModal: (state) => {
      state.signupModalVisible = true;
    },
    hideSignupModal: () => {
      state.signupModalVisible = false;
    },
  },
});

export const { setLocale, showSignupModal, hideSignupModal } = appSlice.actions;

export const getSteps = (state) => state.app.steps;

export default appSlice.reducer;
