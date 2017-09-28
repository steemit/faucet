/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Icon, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';
import { validateAccountName } from '../../../utils/validator';

class Username extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
    };
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
      <Form onSubmit={this.handleSubmit} className="signup-form username-step">
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
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}>Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Username);
