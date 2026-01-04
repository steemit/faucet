import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Turnstile } from '@marsidev/react-turnstile';
import { Form, Input, Button } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import SendCode from './SendCode.js';
import { setUsername, setToken } from '../features/user.js';
import apiCall from '../utils/api.js';
import { accountNameIsValid, emailValid } from '../../helpers/validator.js';
import badDomains from '../../bad-domains.js';
import Placeholder from './Placeholder.js';
import { CHECKPOINTS } from '../../constants.js';
// import { api } from '@steemit/steem-js';

const UserInfo = ({
  locale,
  logCheckpoint,
  setStep,
  messageApi,
  intl,
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [emailSendCodeTxt, setEmailSendCodeTxt] = useState('');
  const [pendingCreateUser, setPendingCreateUser] = useState(false);
  const [checkUsername, setCheckUsername] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [checkEmailCode, setCheckEmailCode] = useState(false);
  const [formCaptcha, setFormCaptcha] = useState(null);
  const captchaSwitch = useSelector((state) => state.app.captchaSwitch);
  const captchaSiteKey = useSelector((state) => state.app.captchaSiteKey);

  const captchaRenderOptions = {
    language: locale,
    size: 'normal',
  };

  useEffect(() => {
    setEmailSendCodeTxt(intl.formatMessage({ id: 'send_code' }));
  }, [intl]);

  useEffect(() => {
    if (formCaptcha) {
      form.setFieldValue('captcha', formCaptcha);
    }
  }, [formCaptcha, form]);

  const getBtnStatus = () => {
    const captcha = captchaSwitch ? formCaptcha : true;
    return !(
      checkUsername &&
      checkEmail &&
      checkEmailCode &&
      !!captcha
    );
  };

  const validateEmail = (_, value) => {
    if (!value) {
      setCheckEmail(false);
      return Promise.reject(intl.formatMessage({ id: 'error_email_required' }));
    }
    const [email, domain] = value.split('@');
    if (!email || !domain) {
      setCheckEmail(false);
      return Promise.reject(intl.formatMessage({ id: 'error_email_invalid' }));
    }
    if (badDomains.includes(domain)) {
      setCheckEmail(false);
      return Promise.reject(
        intl.formatMessage({ id: 'error_api_domain_blacklisted' })
      );
    }
    try {
      emailValid(value);
    } catch (e) {
      setCheckEmail(false);
      return Promise.reject(intl.formatMessage({ id: e.message }));
    }
    setCheckEmail(true);
    return Promise.resolve();
  };

  const validateUsername = (_, value) => {
    if (!value) {
      setCheckUsername(false);
      return Promise.reject(
        intl.formatMessage({ id: 'error_username_required' })
      );
    }
    try {
      accountNameIsValid(value);
    } catch (e) {
      setCheckUsername(false);
      return Promise.reject(intl.formatMessage({ id: e.message }));
    }
    return new Promise((resolve, reject) => {
      if (window.usernameTimeout) {
        window.clearTimeout(window.usernameTimeout);
      }
      window.usernameTimeout = setTimeout(() => {
        apiCall('/api/check_username', { username: value })
          .then(() => {
            setCheckUsername(true);
            logCheckpoint(CHECKPOINTS.username_checked);
            resolve();
          })
          .catch((error) => {
            setCheckUsername(false);
            reject(intl.formatMessage({ id: error.type }));
          });
      }, 500);
    });
  };

  const validateEmailCode = (_, value) => {
    if (!value) {
      setCheckEmailCode(false);
      return Promise.reject(
        intl.formatMessage({ id: 'error_api_code_required' })
      );
    }
    const email = form.getFieldValue('email');
    return new Promise((resolve, reject) => {
      apiCall('/api/check_email_code', { code: value, email })
        .then(() => {
          setCheckEmailCode(true);
          logCheckpoint(CHECKPOINTS.email_checked);
          resolve();
        })
        .catch((error) => {
          setCheckEmailCode(false);
          reject(intl.formatMessage({ id: error.type }));
        });
    });
  };


  const SendEmailCode = (email) => {
    if (!email) return;
    // clear input error
    form.setFields([
      {
        name: 'email',
        errors: [],
      },
    ]);
    // send email code
    apiCall('/api/request_email', {
      email,
      locale,
    })
      .then(() => {
        messageApi.open({
          type: 'success',
          content: intl.formatMessage({ id: 'success_email_code_sent' }),
        });
      })
      .catch((error) => {
        let errorMessage = intl.formatMessage({ id: error.type });
        // If email domain error and contains allowed domain list, show domain list
        if (
          error.type === 'error_api_email_domain' &&
          error.data &&
          error.data.whiteEmailDomains &&
          Array.isArray(error.data.whiteEmailDomains) &&
          error.data.whiteEmailDomains.length > 0
        ) {
          const domainsList = error.data.whiteEmailDomains.join(', ');
          errorMessage = `${errorMessage} (${domainsList})`;
        }
        form.setFields([
          {
            name: 'email',
            errors: [errorMessage],
          },
        ]);
      });
  };


  const handleFinish = (values) => {
    console.log('form values:', values);
    if (pendingCreateUser) return;
    setPendingCreateUser(true);
    const data = {
      captcha: captchaSwitch ? form.getFieldValue('captcha') : '',
      email: form.getFieldValue('email'),
      emailCode: form.getFieldValue('email_code'),
      username: form.getFieldValue('username'),
    };
    apiCall('/api/create_user', data)
      .then((result) => {
        setPendingCreateUser(false);
        dispatch(setUsername(form.getFieldValue('username')));
        dispatch(setToken(result.token));
        logCheckpoint(CHECKPOINTS.user_info_submitted);
        setStep('savePassword');
      })
      .catch((error) => {
        setPendingCreateUser(false);
        messageApi.open({
          type: 'error',
          content: intl.formatMessage({ id: error.type }),
        });
      });
  };

  return (
    <div className="user-info-wrap">
      <Form
        form={form}
        onFinish={handleFinish}
        className="signup-form"
        autoComplete="off"
      >
        <h2>
          <FormattedMessage id="username" />
        </h2>
        <p className="text">
          <FormattedMessage id="username_know_steemit" />
        </p>
        <Form.Item
          name="username"
          hasFeedback
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'error_username_required',
              }),
              validator: validateUsername,
            },
          ]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder={intl.formatMessage({
              id: 'username',
            })}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
        </Form.Item>
        <Placeholder height="14px" />
        <h2>
          <FormattedMessage id="enter_email" />
        </h2>
        <p className="text">
          <FormattedMessage id="email_description" />
        </p>
        <Form.Item
          name="email"
          hasFeedback
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'error_email_required',
              }),
              validator: validateEmail,
            },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder={intl.formatMessage({
              id: 'email',
            })}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
        </Form.Item>
        <Form.Item
          name="email_code"
          hasFeedback
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'error_api_code_required',
              }),
              validator: validateEmailCode,
            },
          ]}
        >
          <Input
            size="large"
            placeholder={intl.formatMessage({
              id: 'enter_confirmation_code',
            })}
            addonAfter={
              <SendCode
                checked={checkEmail}
                btnText={emailSendCodeTxt}
                onClick={() => SendEmailCode(form.getFieldValue('email'))}
              />
            }
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
        </Form.Item>
        <Placeholder height="14px" />
        {captchaSwitch && (
          <Form.Item
            name="captcha"
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'error_captcha_required' }),
              },
            ]}
          >
            <div className="captcha-wrapper">
              <div className="captcha">
                <Turnstile
                  siteKey={captchaSiteKey}
                  options={captchaRenderOptions}
                  onSuccess={(token) => {
                    setFormCaptcha(token);
                  }}
                  onExpire={() => {
                    console.log('captcha expired');
                    messageApi.open({
                      type: 'warning',
                      content: intl.formatMessage({
                        id: 'error_captcha_expired',
                      }),
                    });
                  }}
                  onError={(captchaError) => {
                    console.log('captcha error:', captchaError);
                    messageApi.open({
                      type: 'error',
                      content: captchaError.message,
                    });
                  }}
                  onTimeout={() => {
                    console.log('captcha timeout');
                    messageApi.open({
                      type: 'warning',
                      content: intl.formatMessage({
                        id: 'error_captcha_timeout',
                      }),
                    });
                  }}
                />
              </div>
            </div>
          </Form.Item>
        )}
        <Form.Item>
          <div className="submit-button-wrapper">
            <div className="submit-button">
              <Button
                className="custom-btn"
                type="primary"
                htmlType="submit"
                size="large"
                loading={pendingCreateUser}
                disabled={getBtnStatus()}
              >
                <FormattedMessage id="continue" />
              </Button>
            </div>
            <div className="signin_redirect">
              <FormattedMessage
                id="username_steemit_login"
                values={{
                  link: (
                    <a
                      href="https://steemit.com/login.html"
                      style={{
                        textDecoration: 'underline',
                      }}
                    >
                      <FormattedMessage id="sign_in" />
                    </a>
                  ),
                }}
              />
            </div>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default injectIntl(UserInfo);
