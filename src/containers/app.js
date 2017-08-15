import React from 'react';
import '../styles/common.less';

const App = ({ children }) => (
  <div className="main">
    {children}
  </div>
);

App.propTypes = {
  children: React.PropTypes.element.isRequired,
};

export default App;
