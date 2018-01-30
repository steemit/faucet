/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Icon, Input, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../../../utils/fetch';
import getFingerprint from '../../../../helpers/fingerprint';
import { validateEmail, validateEmailDomain } from '../../../utils/validator';

class Email extends React.Component {
  static contextTypes = {
    router: PropTypes.shape({}),
  }

  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      fingerprint: '',
      query: '',
    };
  }

  componentWillMount() {
    this.setState({
      fingerprint: JSON.stringify(getFingerprint()),
      query: JSON.stringify(this.context.router.location.query),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  componentWillUnmount() {
    for (let i = document.getElementsByTagName('script').length - 1; i >= 0; i -= 1) {
      const scriptNode = document.getElementsByTagName('script')[i];
      if (scriptNode.src.includes('recaptcha')) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
    }
    delete window.grecaptcha;
  }

  validateRecaptcha = (rule, value, callback) => {
    const { intl } = this.props;
    if (window.grecaptcha.getResponse() === '') {
      window.grecaptcha.execute();
      callback(intl.formatMessage({ id: 'error_recaptcha_required' }));
    } else {
      callback();
    }
  }

  // since the recaptcha is executed on submit we need the value
  // before handling validation otherwise there will be a concurrent value issue
  executeRecaptchaAndSubmit = () => {
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
  }

  handleSubmit = () => {
    const { form: { validateFieldsAndScroll, setFields }, onSubmit, username, intl } = this.props;
    const { fingerprint, query } = this.state;
    validateFieldsAndScroll((err, values) => {
      if (!err) {
        fetch(`/api/request_email?email=${encodeURIComponent(values.email)}&fingerprint=${fingerprint}&query=${query}&username=${username}&recaptcha=${window.grecaptcha.getResponse()}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            this.setState({ submitting: false });
            if (data.success) {
              if (onSubmit) {
                onSubmit(
                  values,
                  data.token,
                );
              }
            }
          })
          .catch((error) => {
            this.setState({ submitting: false });
            error.response.json().then((data) => {
              setFields({
                email: {
                  value: values.email,
                  errors: [new Error(intl.formatMessage({ id: data.error.type }))],
                },
              });
              window.grecaptcha.reset();
            });
          });
      } else {
        this.setState({ submitting: false });
      }
    });
  };

  render() {
    const { form: { getFieldDecorator }, intl, email, goBack } = this.props;
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
              { required: true, message: intl.formatMessage({ id: 'error_email_required' }) },
              { validator: validateEmail, message: intl.formatMessage({ id: 'error_api_email_format' }) },
              { validator: validateEmailDomain, message: intl.formatMessage({ id: 'error_api_domain_blacklisted' }) },
            ],
            initialValue: email,
          })(
            <Input
              prefix={<Icon type="mail" />}
              placeholder={intl.formatMessage({ id: 'email' })}
            />,
          )}
        </Form.Item>
        {getFieldDecorator('recaptcha', {
          rules: [
            { validator: this.validateRecaptcha, message: intl.formatMessage({ id: 'error_api_recaptcha_required' }) },
          ],
          validateTrigger: '',
        })(
          <ReCAPTCHA
            ref={(el) => { this.captcha = el; }}
            sitekey={window.config.RECAPTCHA_SITE_KEY}
            type="image"
            size="invisible"
            onChange={() => {}}
          />,
        )}
        <div className="form-actions">
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={this.state.submitting}><FormattedMessage id="continue" /></Button>
          </Form.Item>
          {goBack &&
          <Form.Item>
            <Button htmlType="button" className="back" onClick={() => goBack('username', 0)}>
              <FormattedMessage id="go_back" />
            </Button>
          </Form.Item>}
        </div>
      </Form>
    );
  }
}

export default Form.create()(injectIntl(Email));
