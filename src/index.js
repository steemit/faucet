import React from 'react';
import ReactDOM from 'react-dom';
import { Router, browserHistory } from 'react-router';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { hot } from 'react-hot-loader';
import getTranslations, { getAvailableLocale } from './utils/locales';
import routes from './routes';
import store from './store';

const locale = getAvailableLocale('auto');
const translations = getTranslations('auto');

ReactDOM.render(
    //TODO: remove this wrapper
    <IntlProvider locale={locale} messages={translations}>
        <Provider store={store}>
            <Router routes={routes} history={browserHistory} />
        </Provider>
    </IntlProvider>,
    document.getElementById('app')
);
