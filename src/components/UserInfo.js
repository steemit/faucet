import React, { useEffect, useState, useRef, useImperativeHandle } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { FormattedMessage, injectIntl } from 'react-intl';
// import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Button, message, Modal } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import SendCode from './SendCode.js';
import apiCall from '../utils/api.js';
import getFingerprint from '../utils/fingerprint.js';
import { accountNameIsValid, emailValid } from '../../helpers/validator.js';
import badDomains from '../../bad-domains.js';
import Placeholder from './Placeholder.js';
// import { api } from '@steemit/steem-js';
import 'react-phone-number-input/style.css';

// TODO: Mock ReCAPTCHA for testing
const ReCAPTCHA = () => <div />;

const AntdInputForPhoneNumber = React.forwardRef((props, ref) => {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => {
    return inputRef.current.input;
  }, []);
  return <Input {...props} ref={inputRef} />;
});

const UserInfo = ({
  locale,
  intl,
  handleSubmitUserInfo,
  origin,
  countryCode,
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [email_send_code_txt, setEmailSendCodeTxt] = useState('');
  const [prefix, setPrefix] = useState(null);
  const [phone_code_sending, setPhoneCodeSending] = useState(false);
  const [phone_send_code_txt, setPhoneSendCodeTxt] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [pending_create_user, setPendingCreateUser] = useState(false);
  const [check_username, setCheckUsername] = useState(false);
  const [check_email, setCheckEmail] = useState(false);
  const [check_email_code, setCheckEmailCode] = useState(false);
  const [check_phone, setCheckPhone] = useState(false);
  const [check_phone_code, setCheckPhoneCode] = useState(false);
  const [change_locale_to, setChangeLocaleTo] = useState(locale);
  const [recaptcha_modal_visible, setRecaptchaModalVisible] = useState(false);
  const [phone_recaptcha, setPhoneRecaptcha] = useState(null);

  useEffect(() => {
    setFingerprint(JSON.stringify(getFingerprint()));
    setEmailSendCodeTxt(intl.formatMessage({ id: 'send_code' }));
    setPhoneSendCodeTxt(intl.formatMessage({ id: 'send_code' }));
  }, []);

  useEffect(() => {
    if (locale !== change_locale_to) {
      clearGoogleRecaptcha();
    }
  }, [locale]);

  const getBtnStatus = () => {
    const recaptcha =
      window.config.RECAPTCHA_SWITCH !== 'OFF'
        ? form.getFieldValue('recaptcha')
        : true;
    return !(
      check_username &&
      check_email &&
      check_email_code &&
      check_phone &&
      check_phone_code &&
      !!recaptcha
    );
  };

  const clearGoogleRecaptcha = () => {
    // remove google recaptcha
    for (
      let i = document.getElementsByTagName('script').length - 1;
      i >= 0;
      i -= 1
    ) {
      const scriptNode = document.getElementsByTagName('script')[i];
      if (scriptNode.src.includes('recaptcha')) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
    }
    delete window.grecaptcha;
    delete window.onloadcallback;
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
      apiCall('/api/check_phone_code', { code: value, phoneNumber })
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
    if (!check_phone) return;
    if (phone_code_sending) return;
    if (window.config.RECAPTCHA_SWITCH !== 'OFF') {
      setRecaptchaModalVisible(true);
    } else {
      SendPhoneCode();
    }
  };

  const SendPhoneCode = () => {
    if (phone_code_sending) return;
    // clear input error
    form.setFields([
      {
        name: 'phone',
        errors: [],
      },
    ]);
    // set sending status
    setPhoneCodeSending(true);
    // api call
    apiCall('/api/request_sms', {
      phoneNumber: form.getFieldValue('phone'),
      locale,
      phone_recaptcha,
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
            name: 'phone',
            errors: [intl.formatMessage({ id: error.type })],
          },
        ]);
        setPhoneCodeSending(false);
      });
  };

  const handleFinish = (values) => {
    console.log('form values:', values);
    if (pending_create_user) return;
    setPendingCreateUser(true);
    const data = {
      recaptcha:
        window.config.RECAPTCHA_SITE_KEY !== ''
          ? form.getFieldValue('recaptcha')
          : '',
      email: form.getFieldValue('email'),
      emailCode: form.getFieldValue('email_code'),
      phoneNumber: `+${form.getFieldValue('phone')}`,
      phoneCode: form.getFieldValue('phone_code'),
      username: form.getFieldValue('username'),
    };
    apiCall('/api/create_user', data)
      .then((result) => {
        setPendingCreateUser(false);
        data.token = result.token;
        handleSubmitUserInfo(data);
      })
      .catch((error) => {
        setPendingCreateUser(false);
        message.error(intl.formatMessage({ id: error.type }));
      });
  };

  const hideRecaptchaModal = () => {
    setRecaptchaModalVisible(false);
  };

  return (
    <div className="user-info-wrap">
      {contextHolder}
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
                checked={check_email}
                btnText={email_send_code_txt}
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
            disabled={phone_code_sending}
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
                checked={check_phone}
                btnText={phone_send_code_txt}
                onClick={() => SendPhoneCodeWrapper()}
              />
            }
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
        </Form.Item>
        <Placeholder height="14px" />
        {window.config.RECAPTCHA_SWITCH !== 'OFF' && (
          <Form.Item>
            <div className="recaptcha-wrapper">
              <div className="recaptcha">
                <ReCAPTCHA
                  ref={(el) => {
                    this.captcha = el;
                  }}
                  sitekey={window.config.RECAPTCHA_SITE_KEY}
                  type="image"
                  size="normal"
                  hl={change_locale_to === 'zh' ? 'zh_CN' : 'en'}
                  onChange={() => {}}
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
                loading={pending_create_user}
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
        open={recaptcha_modal_visible}
        onCancel={hideRecaptchaModal}
        footer={null}
        closable={false}
      >
        {recaptcha_modal_visible === true && (
          <ReCAPTCHA
            ref={(el) => {
              this.captcha = el;
            }}
            sitekey={window.config.RECAPTCHA_SITE_KEY}
            type="image"
            size="normal"
            hl={change_locale_to === 'zh' ? 'zh_CN' : 'en'}
            onChange={(recaptcha) => {
              setPhoneRecaptcha(recaptcha);
              setRecaptchaModalVisible(false);
              SendPhoneCode();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default injectIntl(UserInfo);
