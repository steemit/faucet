import React from 'react';
import { LocaleProvider } from 'antd';
import { IntlProvider } from 'react-intl';
import enUS from 'antd/lib/locale-provider/en_US';
import getTranslations, { getAvailableLocale } from '../utils/locales';
import '../styles/common.less';

const App = ({ children }) => {
  const locale = getAvailableLocale('auto');
  const translations = getTranslations('auto');
  return (
    <IntlProvider locale={locale} messages={translations}>
      <LocaleProvider locale={enUS}>
        <div className="main">
          {children}
        </div>
      </LocaleProvider>
    </IntlProvider>
  );
};

App.propTypes = {
  children: React.PropTypes.element.isRequired,
};

export default App;
