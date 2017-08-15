/* eslint-disable react/prop-types */
import React from 'react';
import fetch from 'isomorphic-fetch';
import { Alert, Form, Input, Button } from 'antd';
import RecaptchaItem from '../../Utils/RecaptchaItem';
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
    this.setState({ error: null });
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/submit_email?email=${values.email}&recaptcha=${values.recaptcha}`)
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
              this.setState({ error: data.error });
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
            <Input />
          )}
        </Form.Item>
        <Form.Item>
          {getFieldDecorator('recaptcha', {
            rules: [
              { required: true, message: 'Please validate the captcha' },
            ],
          })(
            <RecaptchaItem />
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Continue</Button>
        </Form.Item>
        {error && <Alert message={error} type="error" />}
      </Form>
    );
  }
}

export default Form.create()(Email);
