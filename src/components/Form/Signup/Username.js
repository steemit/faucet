/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Button } from 'antd';
import apiCall from '../../../utils/api';
import { validateAccountName } from '../../../utils/validator';

class Username extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      username: '',
    };
  }

  validateAccountNameIntl = (rule, value, callback) => {
    validateAccountName(rule, value, callback, this.props.intl);
  }

  validateUsername = (rule, value, callback) => {
    if (value) {
      if (window.usernameTimeout) {
        window.clearTimeout(window.usernameTimeout);
      }
      const { intl } = this.props;
      window.usernameTimeout = setTimeout(() => {
        apiCall('/api/check_username', { username: value }).then(() => {
          this.setState({ username: value });
          callback();
        }).catch((error) => {
          callback(intl.formatMessage({ id: error.type }));
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
    const { form: { validateFieldsAndScroll }, onSubmit } = this.props;
    validateFieldsAndScroll((err, values) => {
      if (!err) {
        onSubmit(values);
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  render() {
    const { form: {
      getFieldDecorator,
      getFieldError,
      isFieldValidating,
      getFieldValue,
    }, intl,
    username,
    origin,
    } = this.props;
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form">
        <Form.Item
          hasFeedback
        >
          {getFieldDecorator('username', {
            validateFirst: true,
            rules: [
              { required: true, message: intl.formatMessage({ id: 'error_username_required' }) },
              { validator: this.validateAccountNameIntl },
              { validator: this.validateUsername },
            ],
            initialValue: username,
          })(
            <Input
              prefix={<Icon type="user" />}
              placeholder={intl.formatMessage({ id: 'username' })}
            />,
          )}
        </Form.Item>
        {
          getFieldValue('username') &&
          !getFieldError('username') &&
          !isFieldValidating('username') &&
          <p>
            <FormattedMessage
              id="username_available"
              values={{ username: <strong>{getFieldValue('username')}</strong> }}
            />
          </p>
        }
        <div className="form-actions">
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
          </Form.Item>
          {origin === 'steemit' &&
          <Form.Item>
            <div className="signin_redirect">
              <FormattedMessage
                id="username_steemit_login"
                values={{ link: <a href="https://steemit.com/login.html"><FormattedMessage id="sign_in" /></a> }}
              />
            </div>
          </Form.Item>}
        </div>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(Username));
