import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { App, ConfigProvider } from 'antd';
import { useEffect } from 'react';
import { getCustomDesignToken } from '../styles/custom.js';
import {
  setCaptchaSwitch,
  setCaptchaSiteKey,
  setReferrer,
} from '../features/app.js';
import '../styles/common.less';

// Provide the referrer based on whatever our ref is set to at page load.
// Please take care of the case would cause xss attack
// if we allow any string input.
const referrerMatch = window.location.search.match(/\?ref=([a-zA-Z]*)/);
// design tokens
const designTokens = getCustomDesignToken();
console.log('debug designTokens: ', designTokens);

const LocaleWrapper = () => {
  const dispatch = useDispatch();
  const locale = useSelector((state) => state.app.locale);
  const translations = useSelector((state) => state.app.translations);
  const antdLocales = useSelector((state) => state.app.antdLocales);
  const antdLocale = antdLocales[locale] || antdLocales.default;

  // init app config
  useEffect(() => {
    dispatch(setCaptchaSwitch(window.config.TURNSTILE_SWITCH !== 'OFF'));
    dispatch(setCaptchaSiteKey(window.config.TURNSTILE_SITE_KEY));
    dispatch(setReferrer(referrerMatch ? referrerMatch[1] : 'steemit'));
  }, [dispatch]);

  return (
    <IntlProvider locale={locale} messages={translations}>
      <ConfigProvider locale={antdLocale} theme={designTokens}>
        <App>
          <Outlet />
        </App>
      </ConfigProvider>
    </IntlProvider>
  );
};

export default LocaleWrapper;
