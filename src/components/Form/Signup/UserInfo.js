import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import { Form, Input, Button, Icon, message } from 'antd';
import Turnstile from '../../Turnstile';
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
            fingerprint: '',
            query: '',
            pending_create_user: false,
            check_username: false,
            check_email: false,
            check_email_code: false,
            change_locale_to: this.props.locale,
        };
    }

    componentWillMount() {
        this.setState({
            fingerprint: JSON.stringify(getFingerprint()),
            email_send_code_txt: this.props.intl.formatMessage({
                id: 'send_code',
            }),
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.locale !== nextProps.locale) {
            const newState = {};
            const { email_code_sending } = this.state;
            if (!email_code_sending) {
                newState.email_send_code_txt = this.props.intl.formatMessage({
                    id: 'send_code',
                });
            }
            newState.change_locale_to = nextProps.locale;
            if (Object.keys(newState).length > 0) {
                this.setState(newState);
            }
        }
    }

    componentWillUnmount() {
        // remove interval
        clearInterval(window.email_code_interval);
    }

    getBtnStatus = () => {
        const { check_username, check_email, check_email_code } = this.state;
        const turnstile =
            window.config.TURNSTILE_SWITCH !== 'OFF'
                ? this.props.form.getFieldValue('turnstile')
                : true;
        return !(
            check_username &&
            check_email &&
            check_email_code &&
            !!turnstile
        );
    };

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
                    check_email: true,
                });
                // callback(
                //     'This domain name is blacklisted, please provide another email'
                // );
                callback();
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
                this.props.form.setFields({
                    email: {
                        value: email,
                        errors: [new Error(errorMessage)],
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

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.pending_create_user) return;
        this.setState({
            pending_create_user: true,
        });
        const { form, intl, handleSubmitUserInfo } = this.props;
        const data = {
            turnstile:
                window.config.TURNSTILE_SITE_KEY !== ''
                    ? form.getFieldValue('turnstile')
                    : '',
            email: form.getFieldValue('email'),
            emailCode: form.getFieldValue('email_code'),
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
                                        btnText={this.state.email_send_code_txt}
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
                    {window.config.TURNSTILE_SWITCH !== 'OFF' && (
                        <Form.Item>
                            <div className="recaptcha-wrapper">
                                <div className="recaptcha">
                                    {getFieldDecorator('turnstile', {
                                        rules: [{}],
                                        validateTrigger: '',
                                    })(
                                        <Turnstile
                                            ref={el => {
                                                this.captcha = el;
                                            }}
                                            sitekey={
                                                window.config.TURNSTILE_SITE_KEY
                                            }
                                            language={
                                                this.state.change_locale_to ===
                                                'zh'
                                                    ? 'zh-CN'
                                                    : 'en'
                                            }
                                            onSuccess={token => {
                                                const { form } = this.props;
                                                form.setFields({
                                                    turnstile: {
                                                        value: token,
                                                    },
                                                });
                                            }}
                                            onError={() => {
                                                const { form } = this.props;
                                                form.setFields({
                                                    turnstile: {
                                                        value: '',
                                                    },
                                                });
                                            }}
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
                                                        textDecoration:
                                                            'underline',
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
    origin: PropTypes.string.isRequired,
    handleSubmitUserInfo: PropTypes.func.isRequired,
};

UserInfo.defaultProps = {
    origin: '',
    locale: '',
};

export default Form.create()(injectIntl(UserInfo));
