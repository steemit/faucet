import PropTypes from 'prop-types';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import LocaleWrapper from './containers/LocaleWrapper.js';
import SignupSteps from './containers/SignupSteps.js';
import CreateAccountSteps from './containers/CreateAccountSteps.js';
import WelcomeSteps from './containers/WelcomeSteps.js';

const Root = ({ store }) => (
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={LocaleWrapper}>
        <IndexRoute component={SignupSteps} />
        <Route path="welcome" component={WelcomeSteps} />
      </Route>
    </Router>
  </Provider>
);

Root.propTypes = {
  store: PropTypes.shape({
    app: PropTypes.object,
    user: PropTypes.object,
  }).isRequired,
};
export default Root;
