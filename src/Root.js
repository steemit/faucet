import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import LocaleWrapper from './containers/LocaleWrapper.js';
import SignupWrapper from './containers/SignupWrapper.js';

const Root = ({ store }) => (
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={LocaleWrapper}>
        <IndexRoute component={SignupWrapper} />
      </Route>
    </Router>
  </Provider>
);

export default Root;
