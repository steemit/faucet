import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
// import steem from '@steemit/steem-js';
import appReducer from './features/app.js';
import userReducer from './features/user.js';
import trackingReducer from './features/tracking.js';
import rootSaga from './sagas.js';

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: {
    app: appReducer,
    user: userReducer,
    tracking: trackingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});

if (window.config.STEEMJS_URL) {
  // steem.api.setOptions({ url: window.config.STEEMJS_URL });
}

sagaMiddleware.run(rootSaga);

export default store;
