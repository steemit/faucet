/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Select, Button } from 'antd';
import _ from 'lodash';
import apiCall from '../../../utils/api';
import countries from '../../../../countries.json';

class PhoneNumber extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            submitting: false,
        };
    }

    getPrefixDefaultValue = () => {
        const { countryCode } = this.props;
        if (countryCode) {
            const country = countries.find(c => c.iso === countryCode);
            if (country) {
                return `${country.prefix}_${country.iso}`;
            }
        }
        return undefined;
    };

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.submitting) return;
        this.setState({ submitting: true });
        const {
            form: { validateFieldsAndScroll, setFields },
            token,
            onSubmit,
            intl,
        } = this.props;
        validateFieldsAndScroll((err, values) => {
            if (!err) {
                apiCall('/api/request_sms', {
                    token,
                    phoneNumber: values.phoneNumber,
                    prefix: values.prefix,
                })
                    .then(data => {
                        this.setState({ submitting: false });
                        if (data.success) {
                            if (onSubmit) {
                                onSubmit({
                                    ...values,
                                    phoneNumberFormatted: data.phoneNumber,
                                });
                            }
                        }
                    })
                    .catch(error => {
                        this.setState({ submitting: false });
                        if (error.field === 'phoneNumber') {
                            setFields({
                                phoneNumber: {
                                    value: values.phoneNumber,
                                    errors: [
                                        new Error(
                                            intl.formatMessage({
                                                id: error.type,
                                            })
                                        ),
                                    ],
                                },
                            });
                        }
                        if (error.field === 'prefix') {
                            setFields({
                                prefix: {
                                    value: values.prefix,
                                    errors: [
                                        new Error(
                                            intl.formatMessage({
                                                id: error.type,
                                            })
                                        ),
                                    ],
                                },
                            });
                        }
                    });
            } else {
                this.setState({ submitting: false });
            }
        });
    };

    devModeSubmit = () => {
        this.props.onSubmit(
            {
                phoneNumber: '+13136139666',
                phoneNumberFormatted: '+13136139666',
                prefix: '+1',
            },
            'tokenHere'
        );
    };

    render() {
        const {
            form: { getFieldDecorator },
            intl,
            prefix,
            phoneNumber,
            debug,
        } = this.props;

        const prefixSelector = getFieldDecorator('prefix', {
            rules: [
                {
                    required: true,
                    message: intl.formatMessage({
                        id: 'error_country_code_required',
                    }),
                },
            ],
            initialValue: prefix || this.getPrefixDefaultValue(),
        })(
            <Select
                placeholder={intl.formatMessage({ id: 'country_code_select' })}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                    option.props.label
                        .toLowerCase()
                        .includes(input.toLowerCase())
                }
            >
                {countries.map(country => (
                    <Select.Option
                        key={_.uniqueId()}
                        value={`${country.prefix}_${country.iso}`}
                        label={`${country.name} (+${country.prefix})`}
                    >
                        {`${country.name} (+${country.prefix})`}
                    </Select.Option>
                ))}
            </Select>
        );
        return (
            <Form
                onSubmit={debug ? this.devModeSubmit : this.handleSubmit}
                className="signup-form"
            >
                <Form.Item>{prefixSelector}</Form.Item>
                <Form.Item>
                    {getFieldDecorator('phoneNumber', {
                        normalize: d => d.replace(/[^0-9+]+/g, ''),
                        rules: [
                            {
                                required: true,
                                message: intl.formatMessage({
                                    id: 'error_phone_required',
                                }),
                            },
                            {
                                pattern: /^\+?\d+$/,
                                message: intl.formatMessage({
                                    id: 'error_phone_format',
                                }),
                            },
                        ],
                        initialValue: phoneNumber,
                    })(
                        <Input
                            prefix={<Icon type="mobile" />}
                            placeholder={intl.formatMessage({
                                id: 'phone_number',
                            })}
                            type="tel"
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
                </div>
            </Form>
        );
    }
}

export default Form.create()(injectIntl(PhoneNumber));
