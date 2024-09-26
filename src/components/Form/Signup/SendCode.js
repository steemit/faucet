import React, { PropTypes } from 'react';
import { injectIntl } from 'react-intl';
import { Button } from 'antd';

class SendCode extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getClassName = () => {
    const { sending, checked } = this.props;
    const dynamicList = {
      sending: 'sending',
      checked: 'checked',
    };
    let className = ['send-code'];
    // sending class
    className = this.addOrRemoveClass(dynamicList.sending, className, sending);
    // checked class
    className = this.addOrRemoveClass(dynamicList.checked, className, checked);
    // return
    return className.join(' ');
  };

  addOrRemoveClass = (needle, stack, condition) => {
    const isExist = stack.indexOf(needle);
    if (condition) {
      if (isExist === -1) {
        stack.push(needle);
      }
    } else if (isExist !== -1) {
      stack.slice(isExist, 1);
    }
    return stack;
  };

  render() {
    const { btnText, onClick } = this.props;
    return (
      <Button className={this.getClassName()} onClick={onClick}>
        {btnText}
      </Button>
    );
  }
}

SendCode.propTypes = {
  onClick: PropTypes.func.isRequired,
  btnText: PropTypes.string.isRequired,
  sending: PropTypes.bool.isRequired,
  checked: PropTypes.bool.isRequired,
};

SendCode.defaultProps = {
  btnText: '',
};

export default injectIntl(SendCode);
