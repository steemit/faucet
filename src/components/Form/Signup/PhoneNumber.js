/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Select, Button } from 'antd';
import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import countries from '../../../../countries.json';
import { checkStatus, parseJSON } from '../../../utils/fetch';

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
    return '';
  }

  handleSubmit = (e) => {
    e.preventDefault();
    if (this.state.submitting) return;
    this.setState({ submitting: true });
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/request_sms?token=${this.props.token}&phoneNumber=${values.phoneNumber}&prefix=${values.prefix}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            this.setState({ submitting: false });
            if (data.success) {
              if (this.props.onSubmit) {
                this.props.onSubmit(values);
              }
            }
          })
          .catch((error) => {
            this.setState({ submitting: false });
            error.response.json().then((data) => {
              const phoneNumberError = data.errors.find(o => o.field === 'phoneNumber');
              if (phoneNumberError) {
                this.props.form.setFields({
                  phoneNumber: {
                    value: values.phoneNumber,
                    errors: [new Error(phoneNumberError.error)],
                  },
                });
              }

              const prefixError = data.errors.find(o => o.field === 'prefix');
              if (prefixError) {
                this.props.form.setFields({
                  prefix: {
                    value: values.prefix,
                    errors: [new Error(prefixError.error)],
                  },
                });
              }
            });
          });
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  render() {
    const { form: { getFieldDecorator }, intl } = this.props;

    const prefixSelector = getFieldDecorator('prefix', {
      rules: [
        { required: true, message: intl.formatMessage({ id: 'error_country_code_required' }) },
      ],
      initialValue: this.getPrefixDefaultValue(),
    })(
      <Select
        placeholder={intl.formatMessage({ id: 'country_code' })}
        showSearch
        optionFilterProp="children"
        filterOption={(input, option) =>
          option.props.label.toLowerCase().includes(input.toLowerCase())}
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
      </Select>,
    );
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form">
        <Form.Item>
          {prefixSelector}
        </Form.Item>
        <Form.Item>
          {getFieldDecorator('phoneNumber', {
            rules: [
              { required: true, message: intl.formatMessage({ id: 'error_phone_required' }) },
              { pattern: /^(\+\d{1,3}[- ]?)?\d{10}$/, message: intl.formatMessage({ id: 'error_phone_format' }) },
            ],
          })(
            <Input
              prefix={<Icon type="mobile" />}
              placeholder={intl.formatMessage({ id: 'phone_number' })}
            />,
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(PhoneNumber));
