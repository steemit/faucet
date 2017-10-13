/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';
import { validateAccountName } from '../../../utils/validator';

class Username extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      username: '',
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
              this.setState({ username: '' });
              callback(data.error);
            } else {
              this.setState({ username: value });
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
    const { form: { getFieldDecorator }, intl } = this.props;
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form username-step">
        <Form.Item
          hasFeedback
        >
          {getFieldDecorator('username', {
            validateFirst: true,
            rules: [
              { required: true, message: intl.formatMessage({ id: 'error_username_required' }) },
              { validator: validateAccountName },
              { validator: this.validateUsername },
            ],
          })(
            <Input
              prefix={<Icon type="user" />}
              placeholder={intl.formatMessage({ id: 'username' })}
            />,
          )}
        </Form.Item>
        {this.state.username !== '' &&
          <p>
            <FormattedMessage
              id="username_available"
              values={{ username: <strong>{this.state.username}</strong> }}
            />
          </p>
        }
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(Username));
