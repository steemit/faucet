import React, { useEffect, useState, useRef, useImperativeHandle } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Turnstile } from '@marsidev/react-turnstile';
import { Form, Input, Button, Modal } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import SendCode from './SendCode.js';
import { setUsername, setToken } from '../features/user.js';
import apiCall from '../utils/api.js';
import { accountNameIsValid, emailValid } from '../../helpers/validator.js';
import badDomains from '../../bad-domains.js';
import Placeholder from './Placeholder.js';
import { CHECKPOINTS } from '../../constants.js';
// import { api } from '@steemit/steem-js';
import 'react-phone-number-input/style.css';

const AntdInputForPhoneNumber = React.forwardRef((props, ref) => {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => {
    return inputRef.current.input;
  }, []);
  return <Input {...props} ref={inputRef} />;
});

const UserInfo = ({
  locale,
  countryCode,
  logCheckpoint,
  setStep,
  messageApi,
  intl,
}) => {
  const dispatch = useDispatch();
  const refOfTurnstileInModal = React.useRef();
  const [form] = Form.useForm();
  const [emailSendCodeTxt, setEmailSendCodeTxt] = useState('');
  const [phoneCodeSending, setPhoneCodeSending] = useState(false);
  const [phoneSendCodeTxt, setPhoneSendCodeTxt] = useState('');
  const [pendingCreateUser, setPendingCreateUser] = useState(false);
  const [checkUsername, setCheckUsername] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [checkEmailCode, setCheckEmailCode] = useState(false);
  const [checkPhone, setCheckPhone] = useState(false);
  const [checkPhoneCode, setCheckPhoneCode] = useState(false);
  const [captchaModalVisible, setCaptchaModalVisible] = useState(false);
  const [phoneCaptcha, setPhoneCaptcha] = useState(null);
  const [formCaptcha, setFormCaptcha] = useState(null);
  const captchaSwitch = useSelector((state) => state.app.captchaSwitch);
  const captchaSiteKey = useSelector((state) => state.app.captchaSiteKey);

  const captchaRenderOptions = {
    language: locale,
    size: 'normal',
  };

  useEffect(() => {
    setEmailSendCodeTxt(intl.formatMessage({ id: 'send_code' }));
    setPhoneSendCodeTxt(intl.formatMessage({ id: 'send_code' }));
  }, []);

  useEffect(() => {
    if (phoneCaptcha) {
      SendPhoneCode();
    }
  }, [phoneCaptcha]);

  useEffect(() => {
    if (formCaptcha) {
      form.setFieldValue('captcha', formCaptcha);
    }
  }, [formCaptcha]);

  const getBtnStatus = () => {
    const captcha = captchaSwitch ? formCaptcha : true;
    return !(
      checkUsername &&
      checkEmail &&
      checkEmailCode &&
      checkPhone &&
      checkPhoneCode &&
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

  const validatePhone = (_, value) => {
    if (!value) {
      setCheckPhone(false);
      return Promise.reject(intl.formatMessage({ id: 'error_phone_required' }));
    }
    if (!isValidPhoneNumber(value)) {
      setCheckPhone(false);
      return Promise.reject(
        intl.formatMessage({ id: 'error_api_phone_invalid' })
      );
    }
    setCheckPhone(true);
    logCheckpoint(CHECKPOINTS.phone_checked);
    return Promise.resolve();
  };

  const validatePhoneCode = (_, value) => {
    return new Promise((resolve, reject) => {
      if (!value) {
        setCheckPhoneCode(false);
        return reject(intl.formatMessage({ id: 'error_api_code_required' }));
      }
      if (value.length !== 6) {
        setCheckPhoneCode(false);
        return reject(
          intl.formatMessage({ id: 'error_api_phone_code_invalid' })
        );
      }
      const phoneNumber = form.getFieldValue('phone');
      apiCall('/api/check_phone_code', {
        code: value,
        phoneNumber,
      })
        .then(() => {
          setCheckPhoneCode(true);
          return resolve();
        })
        .catch((error) => {
          setCheckPhoneCode(false);
          return reject(intl.formatMessage({ id: error.type }));
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
        form.setFields([
          {
            name: 'email',
            errors: [intl.formatMessage({ id: error.type })],
          },
        ]);
      });
  };

  const SendPhoneCodeWrapper = () => {
    if (!checkPhone) return;
    if (phoneCodeSending) return;
    if (captchaSwitch) {
      refOfTurnstileInModal.current?.reset();
      setCaptchaModalVisible(true);
    } else {
      SendPhoneCode();
    }
  };

  const SendPhoneCode = () => {
    if (phoneCodeSending) return;
    // clear input error
    form.setFields([
      {
        name: 'phone_code',
        errors: [],
      },
    ]);
    // set sending status
    setPhoneCodeSending(true);
    // api call
    apiCall('/api/request_sms', {
      phoneNumber: form.getFieldValue('phone'),
      locale,
      phoneCaptcha,
    })
      .then(() => {
        messageApi.open({
          type: 'success',
          content: intl.formatMessage({ id: 'success_phone_code_sent' }),
        });
        setPhoneCodeSending(false);
      })
      .catch((error) => {
        form.setFields([
          {
            name: 'phone_code',
            errors: [intl.formatMessage({ id: error.type })],
          },
        ]);
        setCheckPhoneCode(false);
        setPhoneCodeSending(false);
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
      phoneNumber: form.getFieldValue('phone'),
      phoneCode: form.getFieldValue('phone_code'),
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

  const hideCaptchaModal = () => {
    setCaptchaModalVisible(false);
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
        <h2>
          <FormattedMessage id="enter_phone" />
        </h2>
        <p className="text">
          <FormattedMessage id="phone_description" />
        </p>
        <Form.Item
          name="phone"
          hasFeedback
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'error_phone_required',
              }),
              validator: validatePhone,
            },
          ]}
        >
          <PhoneInput
            placeholder={intl.formatMessage({
              id: 'enter_phone',
            })}
            defaultCountry={
              countryCode === null ? 'US' : countryCode.toUpperCase()
            }
            international
            withCountryCallingCode
            inputComponent={AntdInputForPhoneNumber}
            size="large"
            disabled={phoneCodeSending}
          />
        </Form.Item>
        <Form.Item
          name="phone_code"
          hasFeedback
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'error_api_code_required',
              }),
              validator: validatePhoneCode,
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
                checked={checkPhone}
                btnText={phoneSendCodeTxt}
                onClick={() => SendPhoneCodeWrapper()}
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
      <Modal
        title={null}
        open={captchaModalVisible}
        onCancel={hideCaptchaModal}
        footer={null}
        closable={false}
      >
        <Turnstile
          ref={refOfTurnstileInModal}
          siteKey={captchaSiteKey}
          options={captchaRenderOptions}
          onSuccess={(token) => {
            setPhoneCaptcha(token);
            hideCaptchaModal();
          }}
          onExpire={() => {
            messageApi.open({
              type: 'warning',
              content: intl.formatMessage({ id: 'error_captcha_expired' }),
            });
          }}
          onError={(captchaError) => {
            messageApi.open({
              type: 'error',
              content: captchaError.message,
            });
          }}
        />
      </Modal>
    </div>
  );
};

export default injectIntl(UserInfo);
