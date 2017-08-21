/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';

class ConfirmPhoneNumber extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/confirm_sms?token=${this.props.token}&code=${values.code}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            if (data.success) {
              if (this.props.onSubmit) {
                this.props.onSubmit(values, data.token);
              }
            }
          })
          .catch((error) => {
            error.response.json().then((data) => {
              const emailError = data.errors.find(o => o.field === 'code');
              if (emailError) {
                this.props.form.setFields({
                  code: {
                    value: values.code,
                    errors: [new Error(emailError.error)],
                  },
                });
              }
            });
          });
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
              required: true, message: 'Please input the code you have received.!',
            }],
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

export default Form.create()(ConfirmPhoneNumber);
