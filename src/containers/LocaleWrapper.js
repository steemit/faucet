import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { ConfigProvider } from 'antd';
// import '../styles/common.less';

const LocaleWrapper = () => {
  const locale = useSelector((state) => state.app.locale);
  const translations = useSelector((state) => state.app.translations);
  const antdLocales = useSelector((state) => state.app.antdLocales);

  const antdLocale = antdLocales[locale] || antdLocales.default;

  return (
    <IntlProvider locale={locale} messages={translations}>
      <ConfigProvider locale={antdLocale}>
        <div className="main">
          <Outlet />
        </div>
      </ConfigProvider>
    </IntlProvider>
  );
};

export default LocaleWrapper;
