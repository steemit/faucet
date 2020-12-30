import React, { PropTypes } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Button, Icon, message } from 'antd';
import SendCode from './SendCode';
import apiCall from '../../../utils/api';
import getFingerprint from '../../../../helpers/fingerprint';
// import Loading from '../../../widgets/Loading';
import { accountNameIsValid, emailValid } from '../../../../helpers/validator';
import badDomains from '../../../../bad-domains';
import Placeholder from '../../Placeholder';

class UserInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            username: null,
            email: null,
            email_code: null,
            email_code_sending: false,
            email_send_code_txt: '',
            phone: null,
            rawPhone: null,
            prefix: null,
            phone_code: null,
            phone_code_sending: false,
            phone_send_code_txt: '',
            fingerprint: '',
            query: '',
            pending_create_user: false,
            check_username: false,
            check_email: false,
            check_email_code: false,
            check_phone_code: false,
            change_locale_to: this.props.locale,
        };
    }

    componentWillMount() {
        this.setState({
            fingerprint: JSON.stringify(getFingerprint()),
            email_send_code_txt: this.props.intl.formatMessage({
                id: 'send_code',
            }),
            phone_send_code_txt: this.props.intl.formatMessage({
                id: 'send_code',
            }),
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.locale !== nextProps.locale) {
            this.clearGoogleRecaptcha();
        }
    }

    componentWillUnmount() {
        // remove interval
        clearInterval(window.email_code_interval);
        clearInterval(window.phone_code_interval);
        // remove google recaptcha
        // this.clearGoogleRecaptcha();
    }

    getBtnStatus = () => {
        const {
            check_username,
            check_email,
            check_email_code,
            check_phone_code,
            rawPhone,
        } = this.state;
        const recaptcha = window.config.RECAPTCHA_SWITCH !== 'OFF' ?
            this.props.form.getFieldValue('recaptcha'):
            true;
        return !(
            check_username &&
            check_email &&
            check_email_code &&
            !!rawPhone &&
            check_phone_code &&
            !!recaptcha
        );
    };

    getPhoneMasks = () => ({
        cn: '... .... ....',
    });

    clearGoogleRecaptcha = () => {
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
    }

    validateAccountNameIntl = (rule, value, callback) => {
        try {
            accountNameIsValid(value);
            this.setState({
                check_username: true,
            });
        } catch (e) {
            this.setState({
                check_username: false,
            });
            callback(this.props.intl.formatMessage({ id: e.message }));
        }
        callback();
    };
    validateEmail = (rule, value, callback) => {
        if (!value) {
            this.setState({
                check_email: false,
            });
            return;
        }
        try {
            emailValid(value);
            this.setState({
                check_email: true,
            });
        } catch (e) {
            this.setState({
                check_email: false,
            });
            callback(this.props.intl.formatMessage({ id: e.message }));
        }
        callback();
    };

    validateEmailDomain = (rule, value, callback) => {
        if (value) {
            const [email, domain] = value.split('@'); // eslint-disable-line no-unused-vars
            if (domain && badDomains.includes(domain)) {
                this.setState({
                    check_email: false,
                });
                callback(
                    'This domain name is blacklisted, please provide another email'
                );
            } else {
                if (domain) {
                    this.setState({
                        check_email: true,
                    });
                }
                callback();
            }
        } else {
            this.setState({
                check_email: false,
            });
            callback();
        }
    };

    validateUsername = (rule, value, callback) => {
        if (value) {
            if (window.usernameTimeout) {
                window.clearTimeout(window.usernameTimeout);
            }
            const { intl } = this.props;
            window.usernameTimeout = setTimeout(() => {
                apiCall('/api/check_username', { username: value })
                    .then(() => {
                        this.setState({
                            username: value,
                            check_username: true,
                        });
                        callback();
                    })
                    .catch(error => {
                        this.setState({
                            check_username: false,
                        });
                        callback(intl.formatMessage({ id: error.type }));
                    });
            }, 500);
        } else {
            this.setState({
                check_username: false,
            });
            callback();
        }
    };

    validateEmailCode = (rule, value, callback) => {
        if (value) {
            const { intl, form } = this.props;
            const email = form.getFieldValue('email');
            if (value.length < 6) {
                callback();
                return;
            }
            apiCall('/api/check_email_code', { code: value, email })
                .then(() => {
                    this.setState({
                        check_email_code: true,
                    });
                    callback();
                })
                .catch(error => {
                    this.setState({
                        check_email_code: false,
                    });
                    callback(intl.formatMessage({ id: error.type }));
                });
        } else {
            this.setState({
                check_email_code: false,
            });
            callback();
        }
    };

    validatePhoneRequired = (rule, value, callback) => {
        const { intl } = this.props;
        setTimeout(() => {
            if (this.state.rawPhone) {
                callback();
            } else {
                callback(intl.formatMessage({ id: 'error_api_phone_required' }));
            }
        });
    };

    validatePhoneCode = (rule, value, callback) => {
        if (value) {
            const { intl, form } = this.props;
            const phoneNumber = `+${form.getFieldValue('phone')}`;
            if (value.length < 6) {
                callback();
                return;
            }
            apiCall('/api/check_phone_code', { code: value, phoneNumber })
                .then(() => {
                    this.setState({
                        check_phone_code: true,
                    });
                    callback();
                })
                .catch(error => {
                    this.setState({
                        check_phone_code: false,
                    });
                    callback(intl.formatMessage({ id: error.type }));
                });
        } else {
            this.setState({
                check_phone_code: false,
            });
            callback();
        }
    };

    SendEmailCode = email => {
        if (this.state.email_code_sending) return;
        const { intl, locale } = this.props;
        this.setState({
            email_code_sending: true,
        });
        apiCall('/api/request_email_new', {
            email,
            locale,
        })
            .then(() => {
                this.props.form.setFields({
                    email: {
                        value: email,
                    },
                });
                window.email_code_count_seconds = 60;
                window.email_code_interval = setInterval(() => {
                    if (window.email_code_count_seconds === 0) {
                        clearInterval(window.email_code_interval);
                        this.setState({
                            email_send_code_txt: intl.formatMessage({
                                id: 'send_code',
                            }),
                            email_code_sending: false,
                        });
                        return;
                    }
                    window.email_code_count_seconds -= 1;
                    this.setState({
                        email_send_code_txt: `${
                            window.email_code_count_seconds
                        } s`,
                    });
                }, 1000);
            })
            .catch(error => {
                this.props.form.setFields({
                    email: {
                        value: email,
                        errors: [
                            new Error(intl.formatMessage({ id: error.type })),
                        ],
                    },
                });
                window.email_code_count_seconds = 0;
                clearInterval(window.email_code_interval);
                this.setState({
                    email_send_code_txt: intl.formatMessage({
                        id: 'send_code',
                    }),
                    email_code_sending: false,
                });
            });
    };

    SendPhoneCode = () => {
        if (this.state.phone_code_sending) return;
        const { intl, locale } = this.props;
        const { phone, rawPhone, prefix } = this.state;
        this.setState({
            phone_code_sending: true,
        });
        apiCall('/api/request_sms_new', {
            phoneNumber: rawPhone,
            prefix,
            locale,
        })
            .then(() => {
                this.props.form.setFields({
                    phone: {
                        value: phone,
                    },
                });
                window.phone_code_count_seconds = 60;
                window.phone_code_interval = setInterval(() => {
                    if (window.phone_code_count_seconds === 0) {
                        clearInterval(window.phone_code_interval);
                        this.setState({
                            phone_send_code_txt: intl.formatMessage({
                                id: 'send_code',
                            }),
                            phone_code_sending: false,
                        });
                        return;
                    }
                    window.phone_code_count_seconds -= 1;
                    this.setState({
                        phone_send_code_txt: `${
                            window.phone_code_count_seconds
                        } s`,
                    });
                }, 1000);
            })
            .catch(error => {
                this.props.form.setFields({
                    phone: {
                        value: phone,
                        errors: [
                            new Error(intl.formatMessage({ id: error.type })),
                        ],
                    },
                });
                window.phone_code_count_seconds = 0;
                clearInterval(window.phone_code_interval);
                this.setState({
                    phone_send_code_txt: intl.formatMessage({
                        id: 'send_code',
                    }),
                    phone_code_sending: false,
                });
            });
    };

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.pending_create_user) return;
        this.setState({
            pending_create_user: true,
        });
        const { form, intl, handleSubmitUserInfo } = this.props;
        const data = {
            recaptcha: window.config.RECAPTCHA_SITE_KEY !== '' ? form.getFieldValue('recaptcha') : '',
            email: form.getFieldValue('email'),
            emailCode: form.getFieldValue('email_code'),
            phoneNumber: `+${form.getFieldValue('phone')}`,
            phoneCode: form.getFieldValue('phone_code'),
            username: form.getFieldValue('username'),
        };
        apiCall('/api/create_user_new', data)
            .then(result => {
                this.setState({
                    pending_create_user: false,
                });
                data.token = result.token;
                handleSubmitUserInfo(data);
            })
            .catch(error => {
                this.setState({
                    pending_create_user: false,
                });
                message.error(intl.formatMessage({ id: error.type }));
            });
    };

    render() {
        const {
            form: { getFieldDecorator, getFieldValue },
            intl,
            origin,
            countryCode,
        } = this.props;
        return (
            <div className="user-info-wrap">
                <Form onSubmit={this.handleSubmit} className="signup-form">
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
                                { validator: this.validateAccountNameIntl },
                                { validator: this.validateUsername },
                            ],
                        })(
                            <Input
                                prefix={<Icon type="user" />}
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
                                    validator: this.validateEmailDomain,
                                    message: intl.formatMessage({
                                        id: 'error_api_domain_blacklisted',
                                    }),
                                },
                                { validator: this.validateEmail },
                            ],
                        })(
                            <Input
                                prefix={<Icon type="mail" />}
                                placeholder={intl.formatMessage({
                                    id: 'email',
                                })}
                                disabled={this.email_code_sending}
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
                                    validator: this.validateEmailCode,
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
                                        checked={this.state.check_email}
                                        sending={this.state.email_code_sending}
                                        btnText={this.state.email_code_sending ? this.state.email_send_code_txt : intl.formatMessage({ id: 'send_code' })}
                                        onClick={() =>
                                            this.SendEmailCode(
                                                getFieldValue('email')
                                            )
                                        }
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
                                    validator: this.validatePhoneRequired,
                                    message: intl.formatMessage({
                                        id: 'error_phone_required',
                                    }),
                                },
                            ],
                        })(
                            <PhoneInput
                                country={
                                    countryCode === null
                                        ? 'us'
                                        : countryCode.toLowerCase()
                                }
                                placeholder={intl.formatMessage({
                                    id: 'enter_phone',
                                })}
                                masks={this.getPhoneMasks()}
                                disabled={this.phone_code_sending}
                                onChange={(phone, data) => {
                                    const prefix = data.dialCode;
                                    const tmpCountryCode = data.countryCode;
                                    this.setState({
                                        phone,
                                        rawPhone: phone.slice(
                                            data.dialCode.length
                                        ),
                                        prefix: `${prefix}_${tmpCountryCode}`,
                                    });
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
                                    validator: this.validatePhoneCode,
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
                                        checked={!!this.state.rawPhone}
                                        sending={this.state.phone_code_sending}
                                        btnText={this.state.phone_code_sending ? this.state.phone_send_code_txt : intl.formatMessage({ id: 'send_code' })}
                                        onClick={() => this.SendPhoneCode()}
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
                    { window.config.RECAPTCHA_SWITCH !== 'OFF' && <Form.Item>
                        <div className="recaptcha-wrapper">
                            <div className="recaptcha">
                                {getFieldDecorator('recaptcha', {
                                    rules: [{}],
                                    validateTrigger: '',
                                })(
                                    <ReCAPTCHA
                                        ref={el => {
                                            this.captcha = el;
                                        }}
                                        sitekey={
                                            window.config.RECAPTCHA_SITE_KEY
                                        }
                                        type="image"
                                        size="normal"
                                        hl={this.state.change_locale_to === 'zh' ? 'zh_CN' : 'en'}
                                        onChange={() => {}}
                                    />
                                )}
                            </div>
                        </div>
                    </Form.Item>}
                    {origin === 'steemit' && (
                        <Form.Item>
                            <div className="submit-button-wrapper">
                                <div className="submit-button">
                                    <Button
                                        className="custom-btn"
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        loading={this.state.pending_create_user}
                                        disabled={this.getBtnStatus()}
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
            </div>
        );
    }
}

UserInfo.propTypes = {
    intl: intlShape.isRequired,
    locale: PropTypes.string,
    form: PropTypes.shape({
        setFields: PropTypes.func.isRequired,
        getFieldValue: PropTypes.func.isRequired,
    }).isRequired,
    countryCode: PropTypes.string,
    origin: PropTypes.string.isRequired,
    handleSubmitUserInfo: PropTypes.func.isRequired,
};

UserInfo.defaultProps = {
    countryCode: '',
    origin: '',
    locale: '',
};

export default Form.create()(injectIntl(UserInfo));
