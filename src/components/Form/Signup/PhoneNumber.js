/* eslint-disable react/prop-types */
import React from 'react';
import { Alert, Form, Input, Select, Button } from 'antd';
import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import countries from '../../../../countries.json';
import { checkStatus, parseJSON } from '../../../utils/fetch';

class PhoneNumber extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/request_sms?token=${this.props.token}&phoneNumber=${values.phoneNumber}&prefix=${values.prefix}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            if (data.success) {
              if (this.props.onSubmit) {
                this.props.onSubmit(values);
              }
            }
          })
          .catch((error) => {
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

              const formError = data.errors.find(o => o.field === 'form');
              if (formError) {
                this.setState({ error: formError.error });
              }
            });
          });
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    const prefixSelector = getFieldDecorator('prefix', {
      rules: [
        { required: true, message: 'Please select your country code' },
      ],
    })(
      <Select
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
    const { error } = this.state;
    return (
      <Form onSubmit={this.handleSubmit}>
        {error && <Alert message={error} type="error" />}
        <Form.Item
          label="Country Code"
        >
          {prefixSelector}
        </Form.Item>
        <Form.Item
          label="Phone Number"
        >
          {getFieldDecorator('phoneNumber', {
            rules: [
              { required: true, message: 'Please input your phone number' },
              { pattern: /^(\+\d{1,3}[- ]?)?\d{10}$/, message: 'Phone number is not valid' },
            ],
          })(
            <Input />,
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(PhoneNumber);
