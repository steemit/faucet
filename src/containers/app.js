import React, { Component } from 'react';
import '../styles/common.less';

export default class Wrapper extends Component {
  static propTypes = {
    children: React.PropTypes.element.isRequired,
  };

  render() {
    return (
      <div className="main">
        {this.props.children}
      </div>
    );
  }
}
