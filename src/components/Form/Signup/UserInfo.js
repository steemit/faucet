import React, { PropTypes } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Button, Icon, message } from 'antd';
import apiCall from '../../../utils/api';
import getFingerprint from '../../../../helpers/fingerprint';
// import Loading from '../../../widgets/Loading';
import {
    accountNameIsValid,
    validateEmail,
    validateEmailDomain,
} from '../../../../helpers/validator';
import '../../../styles/phone-number-input.less';

class UserInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            username: null,
            email: null,
            email_code: null,
            email_code_sending: false,
            email_send_code_txt: this.props.intl.formatMessage({
                id: 'send_code',
            }),
            phone: null,
            rawPhone: null,
            prefix: null,
            phone_code: null,
            phone_code_sending: false,
            phone_send_code_txt: this.props.intl.formatMessage({
                id: 'send_code',
            }),
            fingerprint: '',
            query: '',
            pending_create_user: false,
        };
    }

    componentDidMount() {
        this.setState({
            fingerprint: JSON.stringify(getFingerprint()),
            query: JSON.stringify(this.context.router.location.query),
        });
    }

    validateAccountNameIntl = (rule, value, callback) => {
        try {
            accountNameIsValid(value);
        } catch (e) {
            callback(this.props.intl.formatMessage({ id: e.message }));
        }
        callback();
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
                        this.setState({ username: value });
                        callback();
                    })
                    .catch(error => {
                        callback(intl.formatMessage({ id: error.type }));
                    });
            }, 500);
        } else {
            callback();
        }
    };

    validateEmailCode = (rule, value, callback) => {
        if (value) {
            const { intl, form } = this.props;
            const email = form.getFieldValue('email');
            apiCall('/api/check_email_code', { code: value, email })
                .then(() => {
                    callback();
                })
                .catch(error => {
                    callback(intl.formatMessage({ id: error.type }));
                });
        } else {
            callback();
        }
    };

    validatePhoneCode = (rule, value, callback) => {
        if (value) {
            const { intl, form } = this.props;
            const phoneNumber = '+' + form.getFieldValue('phone');
            apiCall('/api/check_phone_code', { code: value, phoneNumber })
                .then(() => {
                    callback();
                })
                .catch(error => {
                    callback(intl.formatMessage({ id: error.type }));
                });
        } else {
            callback();
        }
    };

    SendEmailCode = email => {
        if (this.state.email_code_sending) return;
        const { intl } = this.props;
        this.setState({
            email_code_sending: true,
        });
        apiCall('/api/request_email_new', {
            email,
            xref: this.props.xref,
        })
            .then(() => {
                window.email_code_count_seconds = 60;
                window.email_code_interval = setInterval(() => {
                    if (window.email_code_count_seconds == 0) {
                        clearInterval(window.email_code_interval);
                        this.setState({
                            email_send_code_txt: intl.formatMessage({
                                id: 'send_code',
                            }),
                            email_code_sending: false,
                        });
                        return;
                    }
                    this.setState({
                        email_send_code_txt: `${window.email_code_count_seconds--} s`,
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
        const { intl } = this.props;
        const { phone, rawPhone, prefix } = this.state;
        this.setState({
            phone_code_sending: true,
        });
        apiCall('/api/request_sms_new', {
            phoneNumber: rawPhone,
            prefix,
        })
            .then(() => {
                window.phone_code_count_seconds = 60;
                window.phone_code_interval = setInterval(() => {
                    if (window.phone_code_count_seconds == 0) {
                        clearInterval(window.phone_code_interval);
                        this.setState({
                            phone_send_code_txt: intl.formatMessage({
                                id: 'send_code',
                            }),
                            phone_code_sending: false,
                        });
                        return;
                    }
                    this.setState({
                        phone_send_code_txt: `${window.phone_code_count_seconds--} s`,
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

    validateRecaptcha = (rule, value, callback) => {
        const { intl } = this.props;
        if (window.grecaptcha.getResponse() === '') {
            window.grecaptcha.execute();
            callback(intl.formatMessage({ id: 'error_recaptcha_required' }));
        } else {
            callback();
        }
    };

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.pending_create_user) return;
        this.setState({
            pending_create_user: true,
        });
        const { form, trackingId, intl, handleSubmitUserInfo } = this.props;
        const { fingerprint, query } = this.state;
        const data = {
            recaptcha: form.getFieldValue('recaptcha'),
            email: form.getFieldValue('email'),
            emailCode: form.getFieldValue('email_code'),
            phoneNumber: '+' + form.getFieldValue('phone'),
            phoneCode: form.getFieldValue('phone_code'),
            username: form.getFieldValue('username'),
            fingerprint,
            query,
            xref: trackingId,
        };
        apiCall('/api/create_user_new', data)
            .then(result => {
                this.setState({
                    pending_create_user: false,
                });
                handleSubmitUserInfo();
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
            form: {
                getFieldDecorator,
                getFieldError,
                isFieldValidating,
                getFieldValue,
                setFields,
            },
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
                                    validator: validateEmail,
                                    message: intl.formatMessage({
                                        id: 'error_api_email_format',
                                    }),
                                },
                                {
                                    validator: validateEmailDomain,
                                    message: intl.formatMessage({
                                        id: 'error_api_domain_blacklisted',
                                    }),
                                },
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
                    <Form.Item>
                        {getFieldDecorator('email_code', {
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
                                    validator: this.validateEmailCode,
                                },
                            ],
                        })(
                            <Input
                                placeholder={intl.formatMessage({
                                    id: 'enter_confirmation_code',
                                })}
                                addonAfter={
                                    <a
                                        onClick={() =>
                                            this.SendEmailCode(
                                                getFieldValue('email')
                                            )
                                        }
                                    >
                                        {this.state.email_send_code_txt}
                                    </a>
                                }
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck="false"
                            />
                        )}
                    </Form.Item>
                    <h2>
                        <FormattedMessage id="enter_phone" />
                    </h2>
                    <p className="text">
                        <FormattedMessage id="phone_description" />
                    </p>
                    <Form.Item hasFeedback>
                        {getFieldDecorator('phone', {
                            rules: [
                                {
                                    validator: this.validatePhoneEmpty,
                                    message: intl.formatMessage({
                                        id: 'error_api_phone_required',
                                    }),
                                },
                            ],
                            validateTrigger: '',
                        })(
                            <PhoneInput
                                country={
                                    countryCode === null ? 'us' : countryCode
                                }
                                placeholder={intl.formatMessage({
                                    id: 'enter_phone',
                                })}
                                disabled={this.phone_code_sending}
                                onChange={(
                                    phone,
                                    data,
                                    event,
                                    formattedValue
                                ) => {
                                    const prefix = data.dialCode;
                                    const countryCode = data.countryCode;
                                    this.setState({
                                        phone: phone,
                                        rawPhone: phone.slice(
                                            data.dialCode.length
                                        ),
                                        prefix: `${prefix}_${countryCode}`,
                                    });
                                    setFields({
                                        phone: {
                                            value: phone,
                                        },
                                    });
                                }}
                            />
                        )}
                    </Form.Item>
                    <Form.Item>
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
                                className="send-btn"
                                placeholder={intl.formatMessage({
                                    id: 'enter_confirmation_code',
                                })}
                                addonAfter={
                                    <a onClick={() => this.SendPhoneCode()}>
                                        {this.state.phone_send_code_txt}
                                    </a>
                                }
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck="false"
                            />
                        )}
                    </Form.Item>
                    <Form.Item>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{}}>
                                {getFieldDecorator('recaptcha', {
                                    rules: [
                                        {
                                            validator: this.validateRecaptcha,
                                            message: intl.formatMessage({
                                                id:
                                                    'error_api_recaptcha_required',
                                            }),
                                        },
                                    ],
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
                                        onChange={() => {}}
                                    />
                                )}
                            </div>
                            <div
                                style={{
                                    width: '230px',
                                    textAlign: 'center',
                                }}
                            >
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={this.state.pending_create_user}
                                >
                                    <FormattedMessage id="continue" />
                                </Button>
                            </div>
                        </div>
                    </Form.Item>
                    {origin === 'steemit' && (
                        <Form.Item>
                            <div className="signin_redirect">
                                <FormattedMessage
                                    id="username_steemit_login"
                                    values={{
                                        link: (
                                            <a href="https://steemit.com/login.html">
                                                <FormattedMessage id="sign_in" />
                                            </a>
                                        ),
                                    }}
                                />
                            </div>
                        </Form.Item>
                    )}
                </Form>
            </div>
        );
    }
}

export default Form.create()(injectIntl(UserInfo));
