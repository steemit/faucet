/* eslint-disable react/prop-types */
import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Icon, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';
import badDomains from '../../../../bad-domains';
import fingerprint from '../../../../helpers/fingerprint';
import { validateEmail } from '../../../utils/validator';

class Email extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      fingerprint: '',
    };
  }

  componentWillMount() {
    this.setState({ fingerprint: JSON.stringify(fingerprint()) });
  }

  validateRecaptcha = (rule, value, callback) => {
    if (this.props.recaptcha === '') {
      if (window.grecaptcha.getResponse() === '') {
        callback('Please validate the recaptcha is required');
      } else {
        callback();
      }
    } else {
      callback();
    }
  }

  validateEmailDomain = (rule, value, callback) => {
    if (value) {
      const [email, domain] = value.split('@'); // eslint-disable-line no-unused-vars
      if (domain && badDomains.includes(domain)) {
        callback('This domain name is blacklisted, please provide another email');
      } else {
        callback();
      }
    } else {
      callback();
    }
  }

  // since the recaptcha is executed on submit we need the value
  // before handling validation otherwise there will be a concurrent value issue
  executeRecaptchaAndSubmit = () => {
    if (this.props.recaptcha === '') {
      if (window.grecaptcha.getResponse() === '') {
        try {
          window.grecaptcha.execute();
          setTimeout(() => { this.executeRecaptchaAndSubmit(); }, 100);
        } catch (err) {
          // Do nothing, it's here to prevent the exception where the recpatcha isn't mounted yet.
        }
      } else {
        this.handleSubmit();
      }
    } else {
      this.handleSubmit();
    }
  }

  handleSubmit = () => {
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/request_email?email=${encodeURIComponent(values.email)}&fingerprint=${this.state.fingerprint}&username=${this.props.username}&recaptcha=${this.props.recaptcha || window.grecaptcha.getResponse()}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            this.setState({ submitting: false });
            if (data.success) {
              if (this.props.onSubmit) {
                this.props.onSubmit(
                  values,
                  data.token,
                  this.props.recaptcha || window.grecaptcha.getResponse(),
                );
              }
            }
          })
          .catch((error) => {
            this.setState({ submitting: false });
            error.response.json().then((data) => {
              const emailError = data.errors.find(o => o.field === 'email');
              if (emailError) {
                this.props.form.setFields({
                  email: {
                    value: values.email,
                    errors: [new Error(emailError.error)],
                  },
                });
              }
            });
          });
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    return (
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          if (this.state.submitting) return;
          this.setState({ submitting: true });
          this.executeRecaptchaAndSubmit();
        }}
        className="signup-form"
      >
        <Form.Item
          hasFeedback
        >
          {getFieldDecorator('email', {
            rules: [
              { required: true, message: 'Please input your email address' },
              { validator: validateEmail },
              { validator: this.validateEmailDomain },
            ],
          })(
            <Input
              prefix={<Icon type="mail" />}
              placeholder="E-mail"
            />,
          )}
        </Form.Item>
        {getFieldDecorator('recaptcha', {
          rules: [
            { validator: this.validateRecaptcha },
          ],
          validateTrigger: '',
        })(
          <ReCAPTCHA
            ref={(el) => { this.captcha = el; }}
            sitekey={process.env.RECAPTCHA_SITE_KEY}
            type="image"
            size="invisible"
            onChange={() => {}}
          />,
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={this.state.submitting}>Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Email);
