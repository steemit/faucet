import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import steem from '@steemit/steem-js';
import appLocale from './reducers/appLocale';
import step from './reducers/appLocale';

const reducers = combineReducers({
    appLocale,
    step,
});

if (window.config.STEEMJS_URL) {
    steem.api.setOptions({ url: window.config.STEEMJS_URL });
}

const store = createStore(
    reducers,
    window.devToolsExtension && window.devToolsExtension(),
    applyMiddleware(thunk)
);

export default store;
