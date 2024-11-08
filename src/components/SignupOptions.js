import { useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Button } from 'antd';
import { CHECKPOINTS } from '../../constants.js';
import './SignupOptions.less';

const SignupOptions = ({
  logCheckpoint,
  pending_claimed_accounts,
  setStep,
}) => {
  const [pending_claimed_accounts_threshold] = useState(
    window.config.PENDING_CLAIMED_ACCOUNTS_THRESHOLD
      ? parseInt(window.config.PENDING_CLAIMED_ACCOUNTS_THRESHOLD, 10)
      : 50
  );

  const handleSignup = () => {
    logCheckpoint(CHECKPOINTS.signup_start);
    setStep('userInfo');
  };

  const capitalizeFirstLetter = (string) =>
    string.charAt(0).toUpperCase() + string.slice(1);

  return (
    <div className="signup_options_wrap">
      <h1>
        <FormattedMessage id="signup_options" />
      </h1>
      <p>
        <FormattedMessage
          id="signup_options_referrer"
          values={{ referrer: capitalizeFirstLetter('steemit') }}
        />
      </p>
      <p>
        <FormattedMessage id="signup_options_body_1" />
      </p>
      <div
        className={`${
          pending_claimed_accounts >= pending_claimed_accounts_threshold &&
          'claim-account-active'
        } signup-options__buttons`}
      >
        <div className="wrapper">
          <img src="img/free.png" alt="" />
          <div>
            <p>
              <FormattedMessage id="signup_free_tip1" />
            </p>
            <p>
              <FormattedMessage id="signup_free_tip2" />
            </p>
            {pending_claimed_accounts < pending_claimed_accounts_threshold && (
              <p className="special-tip">
                <FormattedMessage id="signup_free_tip3" />
              </p>
            )}
          </div>
          <Button
            type="primary"
            size="large"
            className={`${
              pending_claimed_accounts >= pending_claimed_accounts_threshold &&
              'get-in-register__button'
            } custom-btn`}
            htmlType="button"
            onClick={handleSignup}
            disabled={
              pending_claimed_accounts < pending_claimed_accounts_threshold
            }
          >
            <FormattedMessage id="signup_options_button_free" />
            {pending_claimed_accounts < pending_claimed_accounts_threshold && (
              <span>
                <span className="btn-caveat">
                  <FormattedMessage id="insufficient_places" />
                </span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default injectIntl(SignupOptions);
