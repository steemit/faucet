import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { FormattedMessage } from 'react-intl';
import { Menu, message } from 'antd';
import UserInfo from './UserInfo.js';
import SignupOptions from './SignupOptions.js';
import SavePassword from './SavePassword.js';
import CreateAccount from './CreateAccount.js';
import Finish from './Finish.js';
import { locales } from '../utils/locales.js';
import getFingerprint from '../utils/fingerprint.js';
import { setLocale, setStep } from '../features/app.js';
import { guessCountryCode, setPassword } from '../features/user.js';
import {
  getPendingClaimedAccounts,
  recordActivityTracker,
} from '../utils/api.js';
import { CHECKPOINTS } from '../../constants.js';
import './Signup.less';

const Signup = ({ logCheckpoint }) => {
  const dispatch = useDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [pendingClaimedAccounts, setPendingClaimedAccounts] = useState(0);
  const [fingerprint, setFingerprint] = useState('');
  const app = useSelector((state) => state.app);
  const user = useSelector((state) => state.user);
  const { locale, steps, step } = app;
  const { countryCode, referrer, trackingId, token, username, password } = user;

  const languageItems = [
    {
      key: 'menu',
      label: locales[locale],
      children: Object.keys(locales).map((key) => ({
        key,
        label: locales[key],
      })),
    },
  ];

  // init state
  useEffect(() => {
    const updateActivityTag = () => {
      const cookieName = app.activityCookieName;
      const expiresTime = app.activityCookieExpiresTime;
      const activityTags = Cookies.get(cookieName);
      if (activityTags !== undefined) {
        // location info
        const hostname = window.location.hostname;
        const locationInfo = hostname.split('.').reverse();
        const domain =
          ['localhost', '127.0.0.1'].indexOf(hostname) === -1
            ? `.${locationInfo[1]}.${locationInfo[0]}`
            : hostname;
        console.log(
          'cookies:',
          activityTags,
          trackingId,
          domain,
          cookieName,
          expiresTime
        );
        Object.keys(activityTags).forEach((tag) => {
          if (activityTags[tag].isVisit === 0) {
            recordActivityTracker({ trackingId, activityTag: tag });
            activityTags[tag].isVisit = 1;
          }
        });
        Cookies.set(cookieName, activityTags, {
          expires: expiresTime,
          domain,
        });
      }
    };

    getPendingClaimedAccounts((res) => {
      if (res && Object.keys(res).length > 0) {
        setPendingClaimedAccounts(Math.max(...Object.values(res)));
      }
    });
    dispatch(guessCountryCode());
    updateActivityTag();
    setFingerprint(JSON.stringify(getFingerprint()));
  }, [dispatch, app.activityCookieName, app.activityCookieExpiresTime, trackingId]);

  const handleSavePassword = (password) => {
    dispatch(setPassword(password));
    logCheckpoint(CHECKPOINTS.password_saved);
    dispatch(setStep('createAccount'));
  };

  const handleMenuClick = (e) => {
    dispatch(setLocale(e.key));
  };

  const stepNumber = steps.indexOf(step);

  return (
    <div className="Signup_main">
      {contextHolder}
      <div className="signup-bg-left" />
      <div className="signup-bg-right" />
      <div className="language-select">
        <Menu
          onClick={handleMenuClick}
          style={{}}
          defaultSelectedKeys={['menu', locale]}
          mode="horizontal"
          items={languageItems}
        />
      </div>
      <div className="Signup__container">
        <div className="Signup__form">
          <div className="Signup__header">
            <object
              data="img/logo-steem.svg"
              type="image/svg+xml"
              id="logo"
              aria-label="logo"
            />
            {step !== 'finish' && (
              // step !== 'checkYourEmail' &&
              <div className="Signup__steps">
                <div
                  className={`Signup__steps-step ${
                    stepNumber === 0 ? 'waiting' : ''
                  } ${stepNumber > 0 ? 'processed' : ''}`}
                />
                <div
                  className={`Signup__steps-step ${
                    stepNumber === 1 ? 'waiting' : ''
                  } ${stepNumber > 1 ? 'processed' : ''}`}
                />
                <div
                  className={`Signup__steps-step ${
                    stepNumber === 2 ? 'waiting' : ''
                  } ${stepNumber > 2 ? 'processed' : ''}`}
                />
                <div
                  className={`Signup__steps-step ${
                    stepNumber === 3 ? 'waiting' : ''
                  } ${stepNumber > 3 ? 'processed' : ''}`}
                />
              </div>
            )}
          </div>

          {step === 'signupOptions' && (
            <div>
              <SignupOptions
                logCheckpoint={logCheckpoint}
                referrer={referrer || undefined}
                pending_claimed_accounts={pendingClaimedAccounts}
                setStep={(stepName) => dispatch(setStep(stepName))}
              />
            </div>
          )}
          {step === 'userInfo' && (
            <div>
              <UserInfo
                countryCode={countryCode}
                locale={locale}
                logCheckpoint={logCheckpoint}
                setStep={(stepName) => dispatch(setStep(stepName))}
                messageApi={messageApi}
              />
            </div>
          )}
          {step === 'savePassword' && (
            <div>
              <h1>
                <FormattedMessage id="save_password" />
              </h1>
              <p className="text" style={{ marginBottom: '16px' }}>
                <FormattedMessage id="save_password_text" />
              </p>
              <SavePassword
                handleSavePassword={handleSavePassword}
                messageApi={messageApi}
                setStep={(stepName) => dispatch(setStep(stepName))}
              />
            </div>
          )}
          {step === 'createAccount' && (
            <div>
              <h1>
                <FormattedMessage id="confirmPassword" />
              </h1>
              <p className="text">
                <FormattedMessage id="confirm_password" />
              </p>
              <p
                className="text"
                style={{
                  marginBottom: '0.875rem',
                }}
              >
                <FormattedMessage id="master_password" />
              </p>
              <CreateAccount
                logCheckpoint={logCheckpoint}
                fingerprint={fingerprint}
                tracking_id={trackingId}
                locale={locale}
                token={token}
                setStep={(stepName) => dispatch(setStep(stepName))}
                goBack={() => dispatch(setStep('savePassword'))}
                messageApi={messageApi}
                username={username}
                password={password}
              />
            </div>
          )}
          {step === 'finish' && (
            <div className="form-content">
              <Finish
                username={username}
                password={password}
                messageApi={messageApi}
              />
            </div>
          )}
        </div>
        <div
          className={`Signup__icons ${
            step === 'signupOptions' ? 'username-icons' : ''
          }`}
        >
          {step === 'signupOptions' && (
            <div>
              <h3>
                <FormattedMessage id="signup_username_right_title" />
              </h3>
              <p
                style={{
                  fontSize: '18px',
                  color: '#ABABAB',
                }}
              >
                <FormattedMessage id="signup_username_right_text" />
              </p>
            </div>
          )}
          {step === 'userInfo' && (
            <img
              src="/img/signup-options.svg"
              id="signup-options"
              aria-label="signup-options"
              alt="signup-options"
            />
          )}
          {step === 'signupOptions' && (
            <img
              src="/img/signup-username.png"
              id="signup-username"
              aria-label="signup-username"
              alt="signup-username"
            />
          )}
          {(step === 'savePassword' || step === 'createAccount') && (
            <object
              data="img/signup-password.svg"
              type="image/svg+xml"
              id="signup-password"
              aria-label="signup-password"
            />
          )}
          {step === 'finish' && (
            <object
              data="img/signup-email-confirmation.svg"
              type="image/svg+xml"
              id="signup-email-confirmation"
              aria-label="signup-email-confirmation"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
