import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { createStore } from 'redux'

import reducer from './ducks/'

const devtools: any = window['devToolsExtension'] ? window['devToolsExtension']() : (f: any) => f
const store: any = devtools(createStore)(reducer)

import Main from './components/main'
import './index.css'

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <Main />
    </BrowserRouter>
  </Provider>,
  document.getElementById('root') as HTMLElement,
)
