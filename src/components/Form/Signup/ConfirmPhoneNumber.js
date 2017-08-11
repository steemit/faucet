/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Button } from 'antd';

class ConfirmPhoneNumber extends React.Component {
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

    return (
      <Form onSubmit={this.handleSubmit}>
        <Form.Item
          label="Confirmation Code"
          hasFeedback
        >
          {getFieldDecorator('code', {
            rules: [{
              required: true, message: 'Please input your E-mail!',
            }],
          })(
            <Input />
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(ConfirmPhoneNumber);
