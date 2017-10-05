/* eslint-disable react/prop-types */
import React from 'react';
import { message, Form, Icon, Input, Button } from 'antd';
import createSuggestedPassword from '../../../utils/auth';

class Password extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
    };
  }

  copyToClipboard = (text) => {
    if (window.clipboardData && window.clipboardData.setData) {
      // IE specific code path to prevent textarea being shown while dialog is visible.
      // eslint-disable-next-line no-undef
      return clipboardData.setData('Text', text);
    } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
      const textarea = document.createElement('textarea');
      textarea.textContent = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const res = document.execCommand('copy');
        message.success('Password copied to clipboard');
        return res;
      } catch (ex) {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    return false;
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
      <Form onSubmit={this.handleSubmit} className="signup-form password-step">
        <Form.Item>
          {getFieldDecorator('password', {
            rules: [{
              required: true, message: 'password is required',
            }],
            initialValue: createSuggestedPassword(),
          })(
            <Input
              prefix={<Icon type="lock" size="large" />}
              suffix={
                <a
                  href={undefined}
                  onClick={() => { this.copyToClipboard(this.props.form.getFieldValue('password')); }}
                >
                  Copy
                </a>
              }
              placeholder="Password"
              id="password"
            />,
          )}
        </Form.Item>
        <Form.Item>
          <a href={undefined} className="new-password" onClick={() => { this.props.form.setFieldsValue({ password: createSuggestedPassword() }); }}>Generate new password</a>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}>Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Password);
