import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

const store = createStore(
  window.devToolsExtension && window.devToolsExtension(),
  applyMiddleware(thunk),
);

export default store;
