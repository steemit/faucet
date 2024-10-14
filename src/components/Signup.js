/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { FormattedMessage } from 'react-intl';
import { Button, Popover } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import FormSignupUserInfo from './Form/Signup/UserInfo.js';
import SignupOptions from './Form/Signup/SignupOptions.js';
import SavePassword from './Form/Signup/SavePassword.js';
import CreateAccount from './Form/Signup/CreateAccount.js';
import Finish from './Finish.js';
import { CHECKPOINTS } from '../../constants.js';
import LanguageItem from './LanguageItem.js';
// import './Signup.less';
import { locales } from '../utils/locales.js';
import {
  getPendingClaimedAccounts,
  recordActivityTracker,
} from '../utils/api.js';
import getTronAddr from '../utils/tron.js';

const Signup = (props) => {
  const [pendingClaimedAccounts, setPendingClaimedAccounts] = useState(0);
  const [password, setPassword] = useState('');
  const [languageItemVisible, setLanguageItemVisible] = useState(false);
  const [tronAddr, setTronAddr] = useState({ pubKey: '', privKey: '' });

  useEffect(() => {
    const {
      user: { trackingId, step },
      queryParams: {
        username: paramUsername,
        email: paramEmail,
        token: paramToken,
        xref: paramXref,
      },
      guessCountryCode,
      setStep,
      setTrackingId,
      logCheckpoint,
    } = props;

    getPendingClaimedAccounts((res) => {
      if (res && Object.keys(res).length > 0) {
        setPendingClaimedAccounts(Math.max(...Object.values(res)));
      }
    });

    guessCountryCode();

    if (paramXref && trackingId !== paramXref) {
      setTrackingId(paramXref);
    }

    if (paramEmail && paramUsername && paramToken) {
      setStep('phoneNumber');
    }

    if (!paramUsername && step === 'signupOptions') {
      logCheckpoint(CHECKPOINTS.signup_start);
    }

    const fetchTronAddr = async () => {
      const addr = await getTronAddr();
      setTronAddr(addr);
    };
    fetchTronAddr();
    updateActivityTag();
  }, [props]);

  const updateActivityTag = () => {
    const cookieName = props.app.activityCookieName;
    const expiresTime = props.app.activityCookieExpiresTime;
    const activityTags = Cookies.getJSON(cookieName);
    const trackingId = props.user.trackingId;
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

  const goBack = () => {
    props.decrementStep();
  };

  const handleFreeSignup = () => {
    props.incrementStep();
    // this is similar with CHECKPOINTS.signup_start
    // props.logCheckpoint(CHECKPOINTS.free_signup_chosen);
  };
  const handleSavePassword = (password) => {
    setPassword(password);
    props.incrementStep();
  };

  const handleSubmitUserInfo = (data) => {
    props.incrementStep();
    props.setUsername(data.username);
    props.setEmail(data.email);
    props.setPhone(data.phoneNumber);
    props.setToken(data.token);
    props.logCheckpoint(CHECKPOINTS.user_created);
  };

  const handleCreateAccount = () => {
    props.incrementStep();
  };

  const {
    app: { locale, steps, signupModalVisible },
    user: {
      username,
      email,
      phoneNumber,
      phoneNumberFormatted,
      countryCode,
      token,
      step,
      prefix,
      referrer,
      trackingId,
    },
    queryParams: {
      username: paramUsername,
      email: paramEmail,
      token: paramToken,
      ref: paramRef,
    },
    setLocale,
    showSignupModal,
    hideSignupModal,
    logCheckpoint,
  } = props;

  const stepNumber = steps.indexOf(step);

  // If param exists in url, prefer that:
  const currentUsername = paramUsername || username;
  const currentEmail = paramEmail || email;
  const currentToken = paramToken || token;
  const currentReferrer = paramRef || referrer;

  return (
    <div className="Signup_main">
      <div className="signup-bg-left" />
      <div className="signup-bg-right" />
      <div className="language-select">
        <Popover
          placement="bottom"
          content={
            <ul className="lp-language-select">
              {Object.keys(locales).map((key) => (
                <LanguageItem
                  key={key}
                  locale={key}
                  setLocale={setLocale}
                  onClick={(e) => {
                    e.preventDefault();
                    setLanguageItemVisible(false);
                  }}
                />
              ))}
            </ul>
          }
          trigger="click"
          visible={languageItemVisible}
          onClick={(e) => {
            e.preventDefault();
            setLanguageItemVisible(true);
          }}
        >
          <Button>
            {locales[locale]}
            <DownOutlined />
          </Button>
        </Popover>
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
                {/* <div
                                        className={`Signup__steps-step ${
                                            stepNumber === 4
                                                ? 'waiting'
                                                : ''
                                        } ${
                                            stepNumber > 4
                                                ? 'processed'
                                                : ''
                                        }`}
                                    /> */}
              </div>
            )}
          </div>

          {step === 'signupOptions' && (
            <div>
              {referrer === 'steemit' && (
                <object
                  data="img/steemit-logo.svg"
                  type="image/svg+xml"
                  id="app-logo"
                  aria-label="logo"
                />
              )}
              <SignupOptions
                signupModalVisible={signupModalVisible}
                hideSignupModal={hideSignupModal}
                showSignupModal={showSignupModal}
                handleFreeSignup={handleFreeSignup}
                logCheckpoint={logCheckpoint}
                referrer={referrer || undefined}
                pending_claimed_accounts={pendingClaimedAccounts}
              />
            </div>
          )}
          {step === 'signupInfo' && (
            <div>
              {referrer === 'steemit' && (
                <object
                  data="img/steemit-logo.svg"
                  type="image/svg+xml"
                  id="app-logo"
                  aria-label="logo"
                />
              )}
              <FormSignupUserInfo
                origin={currentReferrer}
                countryCode={countryCode}
                locale={locale}
                handleSubmitUserInfo={handleSubmitUserInfo}
              />
              {/* <h1>
                                <FormattedMessage id="save_password" />
                            </h1>
                            <p className="text">
                                <FormattedMessage id="save_password_text" />
                            </p>
                            <SavePassword
                                password="asjdhfafdakjshfdjashdfkjashdjkfhaskjhdfkashflsdf"
                                handleSavePassword={handleSavePassword}/> */}
            </div>
          )}
          {step === 'savePassword' && (
            <div>
              {referrer === 'steemit' && (
                <object
                  data="img/steemit-logo.svg"
                  type="image/svg+xml"
                  id="app-logo"
                  aria-label="logo"
                />
              )}
              <h1>
                <FormattedMessage id="save_password" />
              </h1>
              <p className="text" style={{ marginBottom: '16px' }}>
                <FormattedMessage id="save_password_text" />
              </p>
              <SavePassword
                password={password}
                handleSavePassword={handleSavePassword}
              />
            </div>
          )}
          {step === 'createAccount' && (
            <div>
              {referrer === 'steemit' && (
                <object
                  data="img/steemit-logo.svg"
                  type="image/svg+xml"
                  id="app-logo"
                  aria-label="logo"
                />
              )}
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
                goBack={goBack}
                username={username}
                email={email}
                phoneNumber={phoneNumber}
                token={token}
                password={password}
                locale={locale}
                tronAddr={tronAddr}
                handleCreateAccount={handleCreateAccount}
                trackingId={trackingId}
                app={props.app}
              />
            </div>
          )}
          {step === 'finish' && (
            <div className="form-content">
              <Finish
                username={username}
                password={password}
                tronAddr={tronAddr}
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
          {step === 'signupInfo' && (
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
          {step === 'email' && (
            <object
              data="img/signup-email.svg"
              type="image/svg+xml"
              id="signup-email"
              aria-label="signup-email"
            />
          )}
          {step === 'checkYourEmail' && (
            <object
              data="img/signup-email.svg"
              type="image/svg+xml"
              id="signup-email"
              aria-label="signup-email"
            />
          )}
          {step === 'phoneNumber' && (
            <object
              data="img/signup-phone.svg"
              type="image/svg+xml"
              id="signup-phone"
              aria-label="signup-phone"
            />
          )}
          {step === 'confirmPhoneNumber' && (
            <object
              data="img/signup-sms.svg"
              type="image/svg+xml"
              id="signup-sms"
              aria-label="signup-sms"
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
