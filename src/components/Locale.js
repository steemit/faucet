import React, { Component } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleProvider } from 'antd';
import '../styles/common.less';

export default class Locale extends Component {
    static propTypes = {
        children: React.PropTypes.element.isRequired,
        app: React.PropTypes.shape({
            locale: React.PropTypes.oneOf(['en', 'fr', 'zh']),
            translations: React.PropTypes.object.isRequired,
            antdLocales: React.PropTypes.object.isRequired,
        }),
    };

    render() {
        const {
            children,
            app: { translations, antdLocales, locale },
        } = this.props;
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
