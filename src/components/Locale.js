import React, { Component } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleProvider } from 'antd';
import '../styles/common.less';

export default class Locale extends Component {
    static propTypes = {
        children: React.PropTypes.element.isRequired,
        locale: React.PropTypes.string.isRequired,
        // TODO: Describe shape here.
        translations: React.PropTypes.string.isRequired,
        // TODO: Describe shape here.
        antdLocales: React.PropTypes.string.isRequired,
    };

    render() {
        const { locale, children, translations, antdLocales } = this.props;
        const antdLocale = antdLocales[locale] || antdLocales.default;
        return (
            <IntlProvider locale={locale} messages={translations}>
                <LocaleProvider locale={antdLocale}>
                    <div className="main">{children}</div>
                </LocaleProvider>
            </IntlProvider>
        );
    }
}
