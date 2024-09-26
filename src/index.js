import { createRoot } from 'react-dom/client';
import store from './store.js';
import Root from './Root.js';

const appElement = document.getElementById('app');
const root = createRoot(appElement);
root.render(<Root store={store} />);
