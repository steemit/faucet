/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Icon, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';
import { validateAccountName } from '../../../utils/validator';
import RecaptchaItem from '../Recaptcha/RecaptchaItem';

class Username extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
    };
  }

  validateRecaptcha = (rule, value, callback) => {
    if (window.grecaptcha.getResponse() === '') {
      try {
        window.grecaptcha.execute();
        setTimeout(() => { this.validateRecaptcha(rule, value, callback); }, 500);
      } catch (err) {
        // Do nothing, it's here to prevent the exception where the recpatcha isn't mounted yet.
      }
    } else {
      fetch(`/api/verify_recaptcha?recaptcha=${window.grecaptcha.getResponse()}`)
        .then(checkStatus)
        .then(parseJSON)
        .then((data) => {
          if (data.errors) {
            callback(data.errors[0]);
          } else {
            callback();
          }
        });
    }
  }

  validateUsername = (rule, value, callback) => {
    if (value) {
      if (window.usernameTimeout) {
        window.clearTimeout(window.usernameTimeout);
      }
      window.usernameTimeout = setTimeout(() => {
        fetch(`/api/check_username?username=${value}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            if (data.error) {
              callback(data.error);
            } else {
              callback();
            }
          });
      }, 500);
    } else {
      callback();
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();
    if (this.state.submitting) return;
    this.setState({ submitting: true });
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.onSubmit(values);
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form">
        <Form.Item
          hasFeedback
        >
          {getFieldDecorator('username', {
            rules: [
              { required: true, message: 'Please input your username' },
              { validator: validateAccountName },
              { validator: this.validateUsername },
            ],
          })(
            <Input
              prefix={<Icon type="user" />}
              placeholder="Username"
            />,
          )}
        </Form.Item>
        {getFieldDecorator('recaptcha', {
          rules: [
            { validator: this.validateRecaptcha },
          ],
        })(
          <RecaptchaItem />,
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}>Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Username);
