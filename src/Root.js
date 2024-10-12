import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import LocaleWrapper from './containers/LocaleWrapper.js';
import SignupWrapper from './containers/SignupWrapper.js';

const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    Component: LocaleWrapper,
    children: [
      {
        index: true,
        path: '/',
        Component: SignupWrapper,
      },
    ],
  },
]);

const Root = ({ store }) => {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

export default Root;
