import React, { PropTypes } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Button, Icon } from 'antd';
import apiCall from '../../../utils/api';
// import Loading from '../../../widgets/Loading';
import { accountNameIsValid } from '../../../../helpers/validator';
import '../../../styles/phone-number-input.less';

class UserInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
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

    validatePhoneEmpty = (rule, value, callback) => {
        callback();
    };

    SendEmailCode = () => {
        console.log('send email code!');
    };

    SendPhoneCode = () => {
        console.log('send phone code!');
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

    render() {
        const {
            form: {
                getFieldDecorator,
                getFieldError,
                isFieldValidating,
                getFieldValue,
            },
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
                    <h2>
                        <FormattedMessage id="enter_email" />
                    </h2>
                    <p className="text">
                        <FormattedMessage id="email_description" />
                    </p>
                    <Form.Item hasFeedback>
                        {getFieldDecorator('email', {
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
                                prefix={<Icon type="mail" />}
                                placeholder={intl.formatMessage({
                                    id: 'email',
                                })}
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
                                        id: 'error_username_required',
                                    }),
                                },
                                { validator: this.validateAccountNameIntl },
                                { validator: this.validateUsername },
                            ],
                        })(
                            <Input
                                placeholder={intl.formatMessage({
                                    id: 'username',
                                })}
                                addonAfter={
                                    <a onClick={this.SendEmailCode}>
                                        Send code
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
                                country={'us'}
                                placeholder={intl.formatMessage({
                                    id: 'username',
                                })}
                                onChange={phone => this.setState({ phone })}
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
                                        id: 'error_username_required',
                                    }),
                                },
                                { validator: this.validateAccountNameIntl },
                                { validator: this.validateUsername },
                            ],
                        })(
                            <Input
                                className="send-btn"
                                placeholder={intl.formatMessage({
                                    id: 'username',
                                })}
                                addonAfter={
                                    <a onClick={this.SendPhoneCode}>
                                        Send code
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
