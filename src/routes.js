import React from 'react';
import { Route, IndexRoute } from 'react-router';
import LocaleWrapper from './containers/LocaleWrapper';
import SignupSteps from './containers/SignupSteps';
import CreateAccount from './containers/CreateAccountSteps';
import ConfirmEmail from './components/ConfirmEmail';

export default (
    <Route path="/" component={LocaleWrapper}>
        <IndexRoute component={SignupSteps} />
        <Route path="create-account" component={CreateAccount} />
        <Route path="confirm-email" component={ConfirmEmail} />
        <Route path="create-account" component={CreateAccount} />
    </Route>
);
