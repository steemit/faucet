import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import BaseWrapper from './containers/BaseWrapper.js';
import IndexWrapper from './containers/IndexWrapper.js';

const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    Component: BaseWrapper,
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
