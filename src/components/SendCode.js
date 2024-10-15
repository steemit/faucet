import { useState } from 'react';
import { injectIntl } from 'react-intl';
import { Button } from 'antd';

const SendCode = ({ btnText = '', onClick, sending, checked }) => {
  const getClassName = () => {
    const dynamicList = {
      sending: 'sending',
      checked: 'checked',
    };
    let className = ['send-code'];
    // sending class
    className = addOrRemoveClass(dynamicList.sending, className, sending);
    // checked class
    className = addOrRemoveClass(dynamicList.checked, className, checked);
    // return
    return className.join(' ');
  };

  const addOrRemoveClass = (needle, stack, condition) => {
    const isExist = stack.indexOf(needle);
    if (condition) {
      if (isExist === -1) {
        stack.push(needle);
      }
    } else if (isExist !== -1) {
      stack.splice(isExist, 1); // 修正了这里的 slice 为 splice
    }
    return stack;
  };

  return (
    <Button className={getClassName()} onClick={onClick}>
      {btnText}
    </Button>
  );
};

export default injectIntl(SendCode);
