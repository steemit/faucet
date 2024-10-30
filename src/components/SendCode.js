import { useState, useEffect } from 'react';
import { injectIntl } from 'react-intl';
import { Button } from 'antd';

const COUNT_SECONDS = 3;

const SendCode = ({ btnText = '', onClick, checked }) => {
  const [className, setClassName] = useState(['send-code']);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const newClassName = ['send-code'];
    if (checked) newClassName.push('checked');
    if (sending) newClassName.push('sending');
    setClassName(newClassName);
  }, [checked, sending]);

  useEffect(() => {
    if (countdown > 0) {
      setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setSending(false);
    }
  }, [countdown]);

  const handleClick = () => {
    if (countdown > 0) return;
    setSending(true);
    setCountdown(COUNT_SECONDS);
    onClick();
  };

  return (
    <Button
      className={className.join(' ')}
      onClick={handleClick}
      disabled={!checked}
    >
      {sending ? `${countdown} s` : btnText}
    </Button>
  );
};

export default injectIntl(SendCode);
