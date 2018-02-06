/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Icon, Input, Button } from 'antd';
import apiCall from '../../../utils/api';
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
    for (let i = document.getElementsByTagName('script').length - 1; i >= 0; i -= 1) {
      const scriptNode = document.getElementsByTagName('script')[i];
      if (scriptNode.src.includes('gt.js')) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
    }
    const gtScript = document.createElement('script');
    gtScript.setAttribute('src', '/js/gt.js');
    document.head.appendChild(gtScript);

    this.setState({
      fingerprint: JSON.stringify(getFingerprint()),
      query: JSON.stringify(this.context.router.location.query),
    });
  }

  componentDidMount() {
    apiCall('/api/gt_challenge', {})
      .then((data) => {
        // eslint-disable-next-line no-undef
        initGeetest({
          gt: data.gt,
          challenge: data.challenge,
          offline: !data.success,
          new_captcha: data.new_captcha,

          product: 'custom',
          width: '400px',
          next_width: '400px',
          area: '#email-form-signup',
          bg_color: 'black',
        }, this.captchaHandler);
      });
  }

  captchaHandler = (captcha) => {
    captcha.appendTo('#geetestCaptcha');
    window.geetest_captcha = captcha;
  }

  handleSubmit = () => {
    const { form: { validateFieldsAndScroll, setFields }, onSubmit, username, intl } = this.props;
    const { fingerprint, query } = this.state;
    validateFieldsAndScroll((err, values) => {
      const captchaRes = window.geetest_captcha.getValidate();
      if (!captchaRes) {
        setFields({
          geetestCaptcha: {
            value: '',
            errors: [new Error(intl.formatMessage({ id: 'error_geetestcaptcha_required' }))],
          },
        });
        this.setState({ submitting: false });
      } else if (!err) {
        apiCall('/api/request_email', {
          email: values.email,
          fingerprint,
          query,
          username,
          geetest_challenge: captchaRes.geetest_challenge,
          geetest_seccode: captchaRes.geetest_seccode,
          geetest_validate: captchaRes.geetest_validate,
        })
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
            setFields({
              email: {
                value: values.email,
                errors: [new Error(intl.formatMessage({ id: error.type }))],
              },
            });
            window.geetest_captcha.reset();
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
          this.handleSubmit();
        }}
        className="signup-form"
        id="email-form-signup"
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
              type="email"
            />,
          )}
        </Form.Item>
        <Form.Item>
          {getFieldDecorator('geetestCaptcha')(
            <div id="geetest-captcha" />,
          )}
        </Form.Item>
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
