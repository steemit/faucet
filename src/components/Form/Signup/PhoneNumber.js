/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Select, Button } from 'antd';
import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import countries from '../../../../countries.json';
import { checkStatus, parseJSON } from '../../../utils/fetch';

class PhoneNumber extends React.Component {
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
              // Do something
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

    return (
      <Form onSubmit={this.handleSubmit}>
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
