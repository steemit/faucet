/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { message, Form, Input, Button, Checkbox } from 'antd';
import createSuggestedPassword from '../../../utils/auth';

class Password extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tosChecked: false,
            privacyChecked: false,
            submitting: false,
        };
    }

    copyToClipboard = text => {
        if (window.clipboardData && window.clipboardData.setData) {
            // IE specific code path to prevent textarea being shown while dialog is visible.
            // eslint-disable-next-line no-undef
            return clipboardData.setData('Text', text);
        } else if (
            document.queryCommandSupported &&
            document.queryCommandSupported('copy')
        ) {
            const textarea = document.createElement('textarea');
            textarea.textContent = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                const res = document.execCommand('copy');
                message.success(
                    this.props.intl.formatMessage({ id: 'password_copied' })
                );
                return res;
            } catch (ex) {
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
        return false;
    };

    passwordEquals = (rule, value, callback) => {
        const { init, password, intl } = this.props;
        if (init) {
            callback();
        } else if (password !== value) {
            callback(intl.formatMessage({ id: 'error_password_match' }));
        } else {
            callback();
        }
    };

    requireTerms = (rule, value, callback) => {
        if (value) {
            callback();
            return;
        }

        callback(false);
    };

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.submitting) return;
        this.setState({ submitting: true });
        const { form: { validateFieldsAndScroll }, onSubmit } = this.props;
        validateFieldsAndScroll((err, values) => {
            if (!err) {
                onSubmit(values);
            } else {
                this.setState({ submitting: false });
            }
        });
    };

    render() {
        const {
            form: { getFieldDecorator, getFieldValue, setFieldsValue },
            init,
            intl,
            goBack,
            requireAgreements,
            submitMsgId,
        } = this.props;
        return (
            <Form
                onSubmit={this.handleSubmit}
                className="signup-form password-step"
            >
                <Form.Item>
                    {getFieldDecorator('password', {
                        rules: [
                            {
                                required: true,
                                message: intl.formatMessage({
                                    id: 'error_password_required',
                                }),
                            },
                            { validator: this.passwordEquals },
                        ],
                        initialValue: init ? createSuggestedPassword() : '',
                    })(
                        <Input.TextArea
                            placeholder={intl.formatMessage({ id: 'password' })}
                            id="password"
                            readOnly={init}
                        />
                    )}
                </Form.Item>
                <Form.Item>
                    {init && (
                        <a
                            href={undefined}
                            className="new-password"
                            onClick={() => {
                                this.copyToClipboard(getFieldValue('password'));
                            }}
                        >
                            <FormattedMessage id="copy_password" />
                        </a>
                    )}
                </Form.Item>
                {init && (
                    <Form.Item>
                        <a
                            href={undefined}
                            className="new-password"
                            onClick={() => {
                                setFieldsValue({
                                    password: createSuggestedPassword(),
                                });
                            }}
                        >
                            <FormattedMessage id="generate_new_password" />
                        </a>
                    </Form.Item>
                )}
                <p>
                    <FormattedMessage id="save_password_text" />
                </p>
                {requireAgreements && [
                    <Form.Item key="agree_tos">
                        {getFieldDecorator('agree_tos', {
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'must_agree_tos',
                                    }),
                                    validator: this.requireTerms,
                                },
                            ],
                            valuePropName: 'checked',
                            initialValue: false,
                        })(
                            <Checkbox>
                                <FormattedMessage
                                    id="i_agree_to_document"
                                    values={{
                                        document: (
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                href="https://steemit.com/tos.html"
                                            >
                                                <FormattedMessage id="terms_of_service" />
                                            </a>
                                        ),
                                    }}
                                />
                            </Checkbox>
                        )}
                    </Form.Item>,
                    <Form.Item key="agree_pp">
                        {getFieldDecorator('agree_pp', {
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'must_agree_pp',
                                    }),
                                    validator: this.requireTerms,
                                },
                            ],
                            valuePropName: 'checked',
                            initialValue: false,
                        })(
                            <Checkbox>
                                <FormattedMessage
                                    id="i_agree_to_document"
                                    values={{
                                        document: (
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                href="https://steemit.com/privacy.html"
                                            >
                                                <FormattedMessage id="privacy_policy" />
                                            </a>
                                        ),
                                    }}
                                />
                            </Checkbox>
                        )}
                    </Form.Item>,
                ]}
                <div className="form-actions">
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={this.state.submitting}
                        >
                            <FormattedMessage id={submitMsgId || 'continue'} />
                        </Button>
                    </Form.Item>
                    {goBack && (
                        <Form.Item>
                            <Button
                                htmlType="button"
                                className="back"
                                onClick={() => goBack('password', 1)}
                            >
                                <FormattedMessage id="go_back" />
                            </Button>
                        </Form.Item>
                    )}
                </div>
            </Form>
        );
    }
}

export default Form.create()(injectIntl(Password));
