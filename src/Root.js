import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import LocaleWrapper from './containers/LocaleWrapper.js';
import IndexWrapper from './containers/IndexWrapper.js';

const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    Component: LocaleWrapper,
    children: [
      {
        index: true,
        path: '/',
        Component: IndexWrapper,
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
