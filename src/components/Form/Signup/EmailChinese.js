/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Button } from 'antd';
import apiCall from '../../../utils/api';
import getFingerprint from '../../../../helpers/fingerprint';
import { validateEmail, validateEmailDomain } from '../../../utils/validator';

class Email extends React.Component {
    static contextTypes = {
        router: PropTypes.shape({}),
    };

    constructor(props) {
        super(props);
        this.state = {
            submitting: false,
            fingerprint: '',
            query: '',
        };
    }

    componentWillMount() {
        this.setState({
            fingerprint: JSON.stringify(getFingerprint()),
            query: JSON.stringify(this.context.router.location.query),
        });
    }

    handleSubmit = () => {
        const {
            form: { validateFieldsAndScroll, setFields },
            onSubmit,
            username,
            intl,
            trackingId,
        } = this.props;
        const { fingerprint, query } = this.state;
        validateFieldsAndScroll((err, values) => {
            if (!err) {
                apiCall('/api/request_email', {
                    email: values.email,
                    fingerprint,
                    query,
                    username,
                    xref: trackingId,
                })
                    .then(data => {
                        this.setState({ submitting: false });
                        if (data.success) {
                            if (onSubmit) {
                                onSubmit(values, data.token);
                            }
                        }
                    })
                    .catch(error => {
                        this.setState({ submitting: false });
                        setFields({
                            email: {
                                value: values.email,
                                errors: [
                                    new Error(
                                        intl.formatMessage({ id: error.type })
                                    ),
                                ],
                            },
                        });
                    });
            } else {
                this.setState({ submitting: false });
            }
        });
    };

    render() {
        const { form: { getFieldDecorator }, intl, email, goBack } = this.props;
        return (
            <Form
                onSubmit={e => {
                    e.preventDefault();
                    if (this.state.submitting) return;
                    this.setState({ submitting: true });
                    this.handleSubmit();
                }}
                className="signup-form"
            >
                <Form.Item hasFeedback>
                    {getFieldDecorator('email', {
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
                        initialValue: email,
                    })(
                        <Input
                            prefix={<Icon type="mail" />}
                            placeholder={intl.formatMessage({ id: 'email' })}
                            type="email"
                        />
                    )}
                </Form.Item>
                <div className="form-actions">
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={this.state.submitting}
                        >
                            <FormattedMessage id="continue" />
                        </Button>
                    </Form.Item>
                    {goBack && (
                        <Form.Item>
                            <Button
                                htmlType="button"
                                className="back"
                                onClick={() => goBack('username', 0)}
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

export default Form.create()(injectIntl(Email));
