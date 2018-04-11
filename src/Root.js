import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Router, browserHistory, Route, IndexRoute } from 'react-router';
import { Provider } from 'react-redux';
// Containers
import LocaleWrapper from './containers/LocaleWrapper';
import SignupSteps from './containers/SignupSteps';
import CreateAccountSteps from './containers/CreateAccountSteps';
import ConfirmEmail from './components/ConfirmEmail';

const Root = ({ store }) => (
    <Provider store={store}>
        <Router history={browserHistory}>
            <Route path="/" component={LocaleWrapper}>
                <IndexRoute component={SignupSteps} />
                <Route path="create-account" component={CreateAccountSteps} />
                <Route path="confirm-email" component={ConfirmEmail} />
            </Route>
        </Router>
    </Provider>
);

Root.propTypes = {
    store: PropTypes.object.isRequired,
};

export default Root;
