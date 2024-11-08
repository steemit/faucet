import { createSlice } from '@reduxjs/toolkit';
import enUS from 'antd/es/locale/en_US.js';
import frFR from 'antd/es/locale/fr_FR.js';
import zhCN from 'antd/es/locale/zh_CN.js';
import { getAvailableLocale, getTranslations } from '../utils/locales.js';

const locale = getAvailableLocale('auto');
const translations = getTranslations(locale);
const antdLocales = {
  en: enUS,
  'zh-cn': zhCN,
  fr: frFR,
  default: enUS,
};

const initialState = {
  locale,
  translations,
  antdLocales,
  referrer: 'steemit',
  steps: [
    'signupOptions',
    'userInfo',
    'savePassword',
    'createAccount',
    'finish',
  ],
  step: 'signupOptions',
  activityCookieName: 'activity_tag',
  activityCookieExpiresTime: 30,
  captchaSwitch: false,
  captchaSiteKey: '',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLocale: (state, action) => {
      state.locale = action.payload;
      state.translations = getTranslations(action.payload);
    },
    setReferrer: (state, action) => {
      state.referrer = action.payload;
    },
    setCaptchaSwitch: (state, action) => {
      state.captchaSwitch = action.payload;
    },
    setCaptchaSiteKey: (state, action) => {
      state.captchaSiteKey = action.payload;
    },
    setStep: (state, action) => {
      state.step = action.payload;
    },
  },
});

export const {
  setLocale,
  setReferrer,
  setCaptchaSwitch,
  setCaptchaSiteKey,
  setStep,
} = appSlice.actions;

export const getSteps = (state) => state.app.steps;
export const getStep = (state) => state.app.step;
export const getReferrer = (state) => state.app.referrer;
export default appSlice.reducer;
