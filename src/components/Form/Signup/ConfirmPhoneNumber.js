/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { message, Form, Icon, Input, Button } from 'antd';
import apiCall from '../../../utils/api';

class ConfirmPhoneNumber extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
    };
  }

  handleSubmit = (e) => {
    e.preventDefault();
    if (this.state.submitting) return;
    this.setState({ submitting: true });
    const { form: { validateFieldsAndScroll, setFields }, onSubmit, token, intl } = this.props;
    validateFieldsAndScroll((err, values) => {
      if (!err) {
        apiCall('/api/confirm_sms', {
          token,
          code: values.code,
        })
          .then((data) => {
            this.setState({ submitting: false });
            if (data.success) {
              if (onSubmit) {
                onSubmit(data.completed);
              }
            }
          })
          .catch((error) => {
            this.setState({ submitting: false });
            setFields({
              code: {
                value: values.code,
                errors: [new Error(intl.formatMessage({ id: error.type }))],
              },
            });
          });
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  resendCode = () => {
    const { token, phoneNumber, prefix, intl } = this.props;
    apiCall('/api/request_sms', {
      token,
      phoneNumber,
      prefix,
    })
      .then(() => {
        this.setState({ submitting: false });
        message.success(intl.formatMessage({ id: 'success_new_code_sent' }));
      })
      .catch((error) => {
        this.setState({ submitting: false });
        message.error(intl.formatMessage({ id: error.type }));
      });
  }

  render() {
    const { form: { getFieldDecorator }, intl, goBack } = this.props;
    return (
      <Form onSubmit={this.handleSubmit} className="signup-form confirm-phone">
        <Form.Item
          hasFeedback
        >
          {getFieldDecorator('code', {
            rules: [{
              required: true, message: intl.formatMessage({ id: 'error_confirmation_code_required' }),
            }],
          })(
            <Input
              prefix={<Icon type="key" />}
              suffix={<a href={undefined} onClick={this.resendCode}><FormattedMessage id="resend" /></a>}
              placeholder={intl.formatMessage({ id: 'confirmation_code' })}
              type="number"
            />,
          )}
        </Form.Item>
        <div className="form-actions">
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
          </Form.Item>
          {goBack &&
          <Form.Item>
            <Button htmlType="button" className="back" onClick={() => goBack('phoneNumber', 2)}>
              <FormattedMessage id="go_back" />
            </Button>
          </Form.Item>}
        </div>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(ConfirmPhoneNumber));
