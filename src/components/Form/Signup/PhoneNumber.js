/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Select, Button } from 'antd';
import _ from 'lodash';
import countries from '../../../../countries.json';

class PhoneNumber extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if (this.props.onSubmit) {
          this.props.onSubmit(values);
        }
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
