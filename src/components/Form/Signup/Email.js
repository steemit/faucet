/* eslint-disable react/prop-types */
import React from 'react';
import { Alert, Form, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import RecaptchaItem from '../Recaptcha/RecaptchaItem';
import { checkStatus, parseJSON } from '../../../utils/fetch';

class Email extends React.Component {
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
        fetch(`/api/request_email?email=${values.email}&recaptcha=${values.recaptcha}`)
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
              if (window && window.grecaptcha) {
                window.grecaptcha.reset();
              }
              const emailError = data.errors.find(o => o.field === 'email');
              if (emailError) {
                this.props.form.setFields({
                  email: {
                    value: values.email,
                    errors: [new Error(emailError.error)],
                  },
                });
              }

              const recaptchaError = data.errors.find(o => o.field === 'recaptcha');
              if (recaptchaError) {
                this.props.form.setFields({
                  recaptcha: {
                    value: values.recaptcha,
                    errors: [new Error(recaptchaError.error)],
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
    const { error } = this.state;
    return (
      <Form onSubmit={this.handleSubmit}>
        {error && <Alert message={error} type="error" />}
        <Form.Item
          label="E-mail"
          hasFeedback
        >
          {getFieldDecorator('email', {
            rules: [
              { type: 'email', message: 'Please input a valid email address' },
              { required: true, message: 'Please input your email address' },
            ],
          })(
            <Input />,
          )}
        </Form.Item>
        <Form.Item>
          {getFieldDecorator('recaptcha', {
            rules: [
              { required: true, message: 'Please validate the captcha' },
            ],
          })(
            <RecaptchaItem />,
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Email);
