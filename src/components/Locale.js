import React from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleProvider } from 'antd';
import '../styles/common.less';

const Locale = props => {
    const { children, translations, antdLocales, locale } = props;
    const antdLocale = antdLocales[locale] || antdLocales.default;
    return (
        <IntlProvider locale={locale} messages={translations}>
            <LocaleProvider locale={antdLocale}>
                <div className="main">{children}</div>
            </LocaleProvider>
        </IntlProvider>
    );
};

/* eslint react/forbid-prop-types: 0 */
Locale.propTypes = {
    children: React.PropTypes.element.isRequired,
    locale: React.PropTypes.oneOf(['en', 'fr', 'zh']).isRequired,
    translations: React.PropTypes.object.isRequired,
    antdLocales: React.PropTypes.object.isRequired,
};

export default Locale;
