/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Button } from 'antd';
import ReactRecaptcha from 'react-recaptcha';

const RecaptchaItem = React.createClass({
  verifyCallback(result) {
    this.props.onChange(result);
  },
  render() {
    const siteKey = process.env.RECAPTCHA_SITE_KEY;
    return (
      <ReactRecaptcha
        render="explicit"
        sitekey={siteKey}
        onloadCallback={() => {}}
        verifyCallback={this.verifyCallback}
      />
    );
  }
});

class Email extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      console.log(values);
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
          {getFieldDecorator('captcha', {
            rules: [
              { required: true, message: 'Please validate the captcha' }
            ],
          })(
            <RecaptchaItem />
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
