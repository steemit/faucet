import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { App, ConfigProvider } from 'antd';
import { getCustomDesignToken } from '../styles/custom.js';
import '../styles/common.less';

const designTokens = getCustomDesignToken();
console.log('debug designTokens: ', designTokens);

const LocaleWrapper = () => {
  const locale = useSelector((state) => state.app.locale);
  const translations = useSelector((state) => state.app.translations);
  const antdLocales = useSelector((state) => state.app.antdLocales);

  const antdLocale = antdLocales[locale] || antdLocales.default;

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
