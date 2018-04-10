import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { createStore, applyMiddleware, compose } from 'redux'
import createSagaMiddleware from 'redux-saga'
 
import reducer from './ducks/'

const devtools: any = window['devToolsExtension'] ? window['devToolsExtension']() : (f: any) => f
const store: any = devtools(createStore)(reducer)

const sagaMiddleware = createSagaMiddleware(

)

const composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] || compose
const middleware = composeEnhancers(applyMiddleware(sagaMiddleware))

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
