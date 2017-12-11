/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
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
        message.success(this.props.intl.formatMessage({ id: 'password_copied' }));
        return res;
      } catch (ex) {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    return false;
  }

  passwordEquals = (rule, value, callback) => {
    const { init, password, intl } = this.props;
    if (init) {
      callback();
    } else if (password !== value) {
      callback(intl.formatMessage({ id: 'error_password_match' }));
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
    const { form: { getFieldDecorator }, init, intl, goBack } = this.props;
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form password-step">
        <Form.Item>
          {getFieldDecorator('password', {
            rules: [
              { required: true, message: intl.formatMessage({ id: 'error_password_required' }) },
              { validator: this.passwordEquals },
            ],
            initialValue: init ? createSuggestedPassword() : '',
          })(
            <Input
              prefix={<Icon type="lock" size="large" />}
              suffix={init &&
                <a
                  href={undefined}
                  onClick={() => { this.copyToClipboard(this.props.form.getFieldValue('password')); }}
                >
                  <FormattedMessage id="copy" />
                </a>
              }
              placeholder={intl.formatMessage({ id: 'password' })}
              id="password"
              readOnly={init}
            />,
          )}
        </Form.Item>
        {init &&
        <Form.Item>
          <a
            href={undefined}
            className="new-password"
            onClick={() => {
              this.props.form.setFieldsValue({ password: createSuggestedPassword() });
            }}
          >
            <FormattedMessage id="generate_new_password" />
          </a>
        </Form.Item>}
        <div className="form-actions">
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
          </Form.Item>
          {goBack &&
          <Form.Item>
            <Button htmlType="button" className="back" onClick={() => goBack('password', 1)}>
              <FormattedMessage id="go_back" />
            </Button>
          </Form.Item>}
        </div>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(Password));
