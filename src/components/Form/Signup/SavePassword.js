/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { message, Button } from 'antd';
// import { key_utils } from '@steemit/steem-js/lib/auth/ecc';
import { CopyToClipboard } from 'react-copy-to-clipboard';

// TODO: Mock key_utils for testing
const key_utils = {
  get_random_key: () => ({ toWif: () => 'P' }),
};

const SavePassword = ({ password, handleSavePassword, intl }) => {
  const [newPassword, setNewPassword] = useState('');
  const [isClickedCopyBtn, setIsClickedCopyBtn] = useState(false);

  useEffect(() => {
    if (password === '') {
      generateWif(true);
    } else {
      setNewPassword(password);
    }
  }, [password]);

  const generateWif = (isFirstTrigger) => {
    const generatedWif = `P${key_utils.get_random_key().toWif()}`;
    if (isFirstTrigger) {
      setNewPassword(generatedWif);
    } else {
      setNewPassword(generatedWif);
      setIsClickedCopyBtn(false);
    }
  };

  const copySuccess = () => {
    setIsClickedCopyBtn(true);
    message.success(intl.formatMessage({ id: 'password_copied' }));
  };

  return (
    <div className="save-password-wrap">
      <div className="password-wrap">{newPassword}</div>
      <CopyToClipboard text={newPassword} onCopy={copySuccess}>
        <Button>
          <FormattedMessage id="copy_password" />
        </Button>
      </CopyToClipboard>
      <Button onClick={() => generateWif(false)}>
        <FormattedMessage id="generate_new_password" />
      </Button>
      <Button
        className="custom-btn"
        type="primary"
        onClick={() => handleSavePassword(newPassword)}
        disabled={!isClickedCopyBtn}
      >
        <FormattedMessage id="continue" />
      </Button>
    </div>
  );
};

export default injectIntl(SavePassword);
