import React from 'react';
import { Route, IndexRoute } from 'react-router';
import Wrapper from './containers/app';
import Signup from './components/Signup';
import ConfirmEmail from './components/ConfirmEmail';
import CreateAccount from './components/CreateAccount';

export default (
  <Route path="/" component={Wrapper}>
    <IndexRoute component={Signup} />
    <Route path="confirm-email" component={ConfirmEmail} />
    <Route path="create-account" component={CreateAccount} />
  </Route>
);
