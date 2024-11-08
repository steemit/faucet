import { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Button } from 'antd';
// import { key_utils } from '@steemit/steem-js/lib/auth/ecc';
import { CopyToClipboard } from 'react-copy-to-clipboard';

// TODO: Mock key_utils for testing
const key_utils = {
  get_random_key: () => ({ toWif: () => 'P1234567890' }),
};

const SavePassword = ({ handleSavePassword, messageApi, intl }) => {
  const [newPassword, setNewPassword] = useState('');
  const [isClickedCopyBtn, setIsClickedCopyBtn] = useState(false);

  useEffect(() => {
    generateWif(true);
  }, []);

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
    messageApi.open({
      type: 'success',
      content: intl.formatMessage({ id: 'password_copied' }),
    });
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
