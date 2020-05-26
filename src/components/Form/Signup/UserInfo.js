import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, message, Input, Button, Icon } from 'antd';
import apiCall from '../../../utils/api';
import Loading from '../../../widgets/Loading';
import { accountNameIsValid } from '../../../../helpers/validator';

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

    render() {
        const {
            form: {
                getFieldDecorator,
                getFieldError,
                isFieldValidating,
                getFieldValue,
            },
            intl,
            username,
            origin,
        } = this.props;
        return (
            <div className="user-info-wrap">
                <h2>
                    <FormattedMessage id="username" />
                </h2>
                <p className="text">
                    <FormattedMessage id="username_know_steemit" />
                </p>
                <Form onSubmit={this.handleSubmit} className="signup-form">
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
                            initialValue: username,
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
                </Form>
            </div>
        );
    }
}

export default Form.create()(injectIntl(UserInfo));
