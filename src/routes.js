import React from 'react';
import { Route, IndexRoute } from 'react-router';
import LocaleWrapper from './containers/LocaleWrapper';
//import Signup from './components/Signup';
import SignupSteps from './containers/SignupSteps';
import CreateAccount from './components/CreateAccount';
import ConfirmEmail from './components/ConfirmEmail';

export default (
    <Route path="/" component={LocaleWrapper}>
        <IndexRoute component={SignupSteps} />
        <Route path="create-account" component={CreateAccount} />
        <Route path="confirm-email" component={ConfirmEmail} />
    </Route>
);
