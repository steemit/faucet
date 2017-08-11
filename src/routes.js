import React from 'react';
import { Route, IndexRoute } from 'react-router';
import Wrapper from './containers/app';
import Signup from './components/Signup';

export default (
  <Route path="/" component={Wrapper}>
    <IndexRoute component={Signup} />
  </Route>
);
