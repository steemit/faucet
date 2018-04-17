import React from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleProvider } from 'antd';
import '../styles/common.less';

const Locale = props => {
    const { children, app: { translations, antdLocales, locale } } = props;
    const antdLocale = antdLocales[locale] || antdLocales.default;
    return (
        <IntlProvider locale={locale} messages={translations}>
            <LocaleProvider locale={antdLocale}>
                <div className="main">{children}</div>
            </LocaleProvider>
        </IntlProvider>
    );
};

Locale.propTypes = {
    children: React.PropTypes.element.isRequired,
    app: React.PropTypes.shape({
        locale: React.PropTypes.oneOf(['en', 'fr', 'zh']),
        translations: React.PropTypes.object.isRequired,
        antdLocales: React.PropTypes.object.isRequired,
    }).isRequired,
};

export default Locale;
