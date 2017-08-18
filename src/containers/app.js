import React from 'react';
import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';
import '../styles/common.less';

const App = ({ children }) => (
  <LocaleProvider locale={enUS}>
    <div className="main">
      {children}
    </div>
  </LocaleProvider>
);

App.propTypes = {
  children: React.PropTypes.element.isRequired,
};

export default App;
