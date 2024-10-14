import { useEffect, useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, injectIntl } from 'react-intl';
// import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Button, message, Modal } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import SendCode from './SendCode.js';
import apiCall from '../../../utils/api.js';
import getFingerprint from '../../../utils/fingerprint.js';
import {
  accountNameIsValid,
  emailValid,
} from '../../../../helpers/validator.js';
import badDomains from '../../../../bad-domains.js';
import Placeholder from '../../Placeholder.js';

// TODO: Mock ReCAPTCHA for testing
const ReCAPTCHA = () => <div />;

const UserInfo = (props) => {
  const [username, setUsername] = useState(null);
  const [email, setEmail] = useState(null);
  const [email_code, setEmailCode] = useState(null);
  const [email_code_sending, setEmailCodeSending] = useState(false);
  const [email_send_code_txt, setEmailSendCodeTxt] = useState('');
  const [phone, setPhone] = useState(null);
  const [rawPhone, setRawPhone] = useState(null);
  const [prefix, setPrefix] = useState(null);
  const [phone_code, setPhoneCode] = useState(null);
  const [phone_code_sending, setPhoneCodeSending] = useState(false);
  const [phone_send_code_txt, setPhoneSendCodeTxt] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [pending_create_user, setPendingCreateUser] = useState(false);
  const [check_username, setCheckUsername] = useState(false);
  const [check_email, setCheckEmail] = useState(false);
  const [check_email_code, setCheckEmailCode] = useState(false);
  const [check_phone_code, setCheckPhoneCode] = useState(false);
  const [change_locale_to, setChangeLocaleTo] = useState(props.locale);
  const [recaptcha_modal_visible, setRecaptchaModalVisible] = useState(false);
  const [phone_recaptcha, setPhoneRecaptcha] = useState(null);

  useEffect(() => {
    setFingerprint(JSON.stringify(getFingerprint()));
    setEmailSendCodeTxt(props.intl.formatMessage({ id: 'send_code' }));
    setPhoneSendCodeTxt(props.intl.formatMessage({ id: 'send_code' }));
  }, []);

  useEffect(() => {
    if (props.locale !== change_locale_to) {
      // ... 更新状态逻辑 ...
      clearGoogleRecaptcha();
    }
  }, [props.locale]);

  const getBtnStatus = () => {
    const recaptcha =
      window.config.RECAPTCHA_SWITCH !== 'OFF'
        ? props.form.getFieldValue('recaptcha')
        : true;
    return !(
      check_username &&
      check_email &&
      check_email_code &&
      !!rawPhone &&
      check_phone_code &&
      !!recaptcha
    );
  };

  const getPhoneMasks = () => ({
    cn: '... .... ....',
  });

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

  const validateAccountNameIntl = (rule, value, callback) => {
    try {
      accountNameIsValid(value);
      setCheckUsername(true);
    } catch (e) {
      setCheckUsername(false);
      callback(props.intl.formatMessage({ id: e.message }));
    }
    callback();
  };
  const validateEmail = (rule, value, callback) => {
    if (!value) {
      setCheckEmail(false);
      return;
    }
    try {
      emailValid(value);
      setCheckEmail(true);
    } catch (e) {
      setCheckEmail(false);
      callback(props.intl.formatMessage({ id: e.message }));
    }
    callback();
  };

  const validateEmailDomain = (rule, value, callback) => {
    if (value) {
      const [email, domain] = value.split('@'); // eslint-disable-line no-unused-vars
      if (domain && badDomains.includes(domain)) {
        setCheckEmail(true);
        // callback(
        //     'This domain name is blacklisted, please provide another email'
        // );
        callback();
      } else {
        if (domain) {
          setCheckEmail(true);
        }
        callback();
      }
    } else {
      setCheckEmail(false);
      callback();
    }
  };

  const validateUsername = (rule, value, callback) => {
    if (value) {
      if (window.usernameTimeout) {
        window.clearTimeout(window.usernameTimeout);
      }
      const { intl } = props;
      window.usernameTimeout = setTimeout(() => {
        apiCall('/api/check_username', { username: value })
          .then(() => {
            setUsername(value);
            setCheckUsername(true);
            callback();
          })
          .catch((error) => {
            setCheckUsername(false);
            callback(intl.formatMessage({ id: error.type }));
          });
      }, 500);
    } else {
      setCheckUsername(false);
      callback();
    }
  };

  const validateEmailCode = (rule, value, callback) => {
    if (value) {
      const { intl, form } = props;
      const email = form.getFieldValue('email');
      apiCall('/api/check_email_code', { code: value, email })
        .then(() => {
          setCheckEmailCode(true);
          callback();
        })
        .catch((error) => {
          setCheckEmailCode(false);
          callback(intl.formatMessage({ id: error.type }));
        });
    } else {
      setCheckEmailCode(false);
      callback();
    }
  };

  const validatePhoneRequired = (rule, value, callback) => {
    const { intl } = props;
    setTimeout(() => {
      if (rawPhone) {
        callback();
      } else {
        callback(intl.formatMessage({ id: 'error_api_phone_required' }));
      }
    });
  };

  const validatePhoneCode = (rule, value, callback) => {
    if (value) {
      const { intl, form } = props;
      if (value.length !== 6) {
        setCheckPhoneCode(false);
        callback(intl.formatMessage({ id: 'error_api_phone_code_invalid' }));
        return;
      }
      const phoneNumber = `+${form.getFieldValue('phone')}`;
      apiCall('/api/check_phone_code', { code: value, phoneNumber })
        .then(() => {
          setCheckPhoneCode(true);
          callback();
        })
        .catch((error) => {
          setCheckPhoneCode(false);
          callback(intl.formatMessage({ id: error.type }));
        });
    } else {
      setCheckPhoneCode(false);
      callback();
    }
  };

  const SendEmailCode = (email) => {
    if (email_code_sending) return;
    const { intl, locale } = props;
    setEmailCodeSending(true);
    apiCall('/api/request_email_new', {
      email,
      locale,
    })
      .then(() => {
        props.form.setFields({
          email: {
            value: email,
          },
        });
        window.email_code_count_seconds = 60;
        window.email_code_interval = setInterval(() => {
          if (window.email_code_count_seconds === 0) {
            clearInterval(window.email_code_interval);
            setEmailSendCodeTxt(
              intl.formatMessage({
                id: 'send_code',
              })
            );
            setEmailCodeSending(false);
            return;
          }
          window.email_code_count_seconds -= 1;
          setEmailSendCodeTxt(`${window.email_code_count_seconds} s`);
        }, 1000);
      })
      .catch((error) => {
        props.form.setFields({
          email: {
            value: email,
            errors: [new Error(intl.formatMessage({ id: error.type }))],
          },
        });
        window.email_code_count_seconds = 0;
        clearInterval(window.email_code_interval);
        setEmailSendCodeTxt(
          intl.formatMessage({
            id: 'send_code',
          })
        );
        setEmailCodeSending(false);
      });
  };

  const SendPhoneCodeWrapper = () => {
    if (!rawPhone) return;
    if (phone_code_sending) return;
    if (window.config.RECAPTCHA_SWITCH !== 'OFF') {
      setRecaptchaModalVisible(true);
    } else {
      SendPhoneCode();
    }
  };

  const SendPhoneCode = () => {
    if (phone_code_sending) return;
    const { intl, locale } = props;
    setPhoneCodeSending(true);
    apiCall('/api/request_sms_new', {
      phoneNumber: rawPhone,
      prefix,
      locale,
      phone_recaptcha,
    })
      .then(() => {
        props.form.setFields({
          phone: {
            value: phone,
          },
        });
        window.phone_code_count_seconds = 60;
        window.phone_code_interval = setInterval(() => {
          if (window.phone_code_count_seconds === 0) {
            clearInterval(window.phone_code_interval);
            setPhoneSendCodeTxt(
              intl.formatMessage({
                id: 'send_code',
              })
            );
            setPhoneCodeSending(false);
            return;
          }
          window.phone_code_count_seconds -= 1;
          setPhoneSendCodeTxt(`${window.phone_code_count_seconds} s`);
        }, 1000);
      })
      .catch((error) => {
        props.form.setFields({
          phone: {
            value: phone,
            errors: [new Error(intl.formatMessage({ id: error.type }))],
          },
        });
        window.phone_code_count_seconds = 0;
        clearInterval(window.phone_code_interval);
        setPhoneSendCodeTxt(
          intl.formatMessage({
            id: 'send_code',
          })
        );
        setPhoneCodeSending(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pending_create_user) return;
    setPendingCreateUser(true);
    const { form, intl, handleSubmitUserInfo } = props;
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
    apiCall('/api/create_user_new', data)
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

  const {
    form: { getFieldDecorator, getFieldValue },
    intl,
    origin,
    countryCode,
  } = props;

  return (
    <div className="user-info-wrap">
      <Form onSubmit={handleSubmit} className="signup-form">
        <h2>
          <FormattedMessage id="username" />
        </h2>
        <p className="text">
          <FormattedMessage id="username_know_steemit" />
        </p>
        <Form.Item hasFeedback>
          {getFieldDecorator('username', {
            normalize: this.normalizeUsername,
            validateFirst: true,
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'error_username_required',
                }),
              },
              { validator: validateAccountNameIntl },
              { validator: validateUsername },
            ],
          })(
            <Input
              prefix={<UserOutlined />}
              placeholder={intl.formatMessage({
                id: 'username',
              })}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          )}
        </Form.Item>
        <Placeholder height="14px" />
        <h2>
          <FormattedMessage id="enter_email" />
        </h2>
        <p className="text">
          <FormattedMessage id="email_description" />
        </p>
        <Form.Item hasFeedback>
          {getFieldDecorator('email', {
            validateFirst: true,
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'error_email_required',
                }),
              },
              {
                validator: validateEmailDomain,
                message: intl.formatMessage({
                  id: 'error_api_domain_blacklisted',
                }),
              },
              { validator: validateEmail },
            ],
          })(
            <Input
              prefix={<MailOutlined />}
              placeholder={intl.formatMessage({
                id: 'email',
              })}
              disabled={email_code_sending}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          )}
        </Form.Item>
        <Form.Item hasFeedback>
          {getFieldDecorator('email_code', {
            validateFirst: true,
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'error_api_code_required',
                }),
              },
              {
                validator: validateEmailCode,
              },
            ],
          })(
            <Input
              className="feedback"
              placeholder={intl.formatMessage({
                id: 'enter_confirmation_code',
              })}
              addonAfter={
                <SendCode
                  checked={check_email}
                  sending={email_code_sending}
                  btnText={email_send_code_txt}
                  onClick={() => SendEmailCode(getFieldValue('email'))}
                />
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          )}
        </Form.Item>
        <Placeholder height="14px" />
        <h2>
          <FormattedMessage id="enter_phone" />
        </h2>
        <p className="text">
          <FormattedMessage id="phone_description" />
        </p>
        <Form.Item hasFeedback>
          {getFieldDecorator('phone', {
            validateFirst: true,
            rules: [
              {
                validator: validatePhoneRequired,
                message: intl.formatMessage({
                  id: 'error_phone_required',
                }),
              },
            ],
          })(
            <PhoneInput
              country={countryCode === null ? 'us' : countryCode.toLowerCase()}
              placeholder={intl.formatMessage({
                id: 'enter_phone',
              })}
              masks={getPhoneMasks()}
              disabled={phone_code_sending}
              onChange={(phone, data) => {
                const prefix = data.dialCode;
                const tmpCountryCode = data.countryCode;
                setPhone(phone);
                setRawPhone(phone.slice(data.dialCode.length));
                setPrefix(`${prefix}_${tmpCountryCode}`);
              }}
            />
          )}
        </Form.Item>
        <Form.Item hasFeedback>
          {getFieldDecorator('phone_code', {
            normalize: this.normalizeUsername,
            validateFirst: true,
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'error_api_code_required',
                }),
              },
              {
                validator: validatePhoneCode,
              },
            ],
          })(
            <Input
              className="feedback"
              placeholder={intl.formatMessage({
                id: 'enter_confirmation_code',
              })}
              addonAfter={
                <SendCode
                  checked={!!rawPhone}
                  sending={phone_code_sending}
                  btnText={phone_send_code_txt}
                  onClick={() => SendPhoneCodeWrapper()}
                />
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          )}
        </Form.Item>
        <Placeholder height="14px" />
        {window.config.RECAPTCHA_SWITCH !== 'OFF' && (
          <Form.Item>
            <div className="recaptcha-wrapper">
              <div className="recaptcha">
                {getFieldDecorator('recaptcha', {
                  rules: [{}],
                  validateTrigger: '',
                })(
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
                )}
              </div>
            </div>
          </Form.Item>
        )}
        {origin === 'steemit' && (
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
        )}
      </Form>
      <Modal
        title={null}
        visible={recaptcha_modal_visible}
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

export default Form.create()(injectIntl(UserInfo));
