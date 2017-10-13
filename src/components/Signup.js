import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form, Button } from 'antd';
import fetch from 'isomorphic-fetch';
import FormSignupUsername from './Form/Signup/Username';
import FormSignupEmail from './Form/Signup/Email';
import FormSignupPhoneNumber from './Form/Signup/PhoneNumber';
import FormSignupConfirmPhoneNumber from './Form/Signup/ConfirmPhoneNumber';
import { checkStatus, parseJSON } from '../utils/fetch';
import './Signup.less';

class Signup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 'username',
      stepNumber: 0,
      username: '',
      email: '',
      phoneNumber: '',
      token: '',
      countryCode: '',
      prefix: '',
    };
  }

  componentWillMount() {
    fetch('/api/guess_country')
      .then(checkStatus)
      .then(parseJSON)
      .then((data) => {
        if (data.location) {
          this.setState({ countryCode: data.location.country.iso_code });
        }
      });
  }

  handleSubmitUsername = (values) => {
    this.setState({
      step: 'email',
      stepNumber: 1,
      username: values.username,
    });
  }

  handleSubmitEmail = (values, token) => {
    this.setState({
      step: 'phoneNumber',
      stepNumber: 2,
      email: values.email,
      token,
    });
  };

  handleSubmitPhoneNumber = (values) => {
    this.setState({
      step: 'confirmPhoneNumber',
      stepNumber: 3,
      phoneNumber: values.phoneNumber,
      prefix: values.prefix,
    });
  };

  handleSubmitConfirmPhoneNumber = () => {
    this.setState({
      step: 'finish',
      stepNumber: 4,
    });
  };

  render() {
    const { step, stepNumber, token, countryCode, prefix, phoneNumber } = this.state;

    return (
      <div className="Signup_main">
        <div className="signup-bg-left" />
        <div className="signup-bg-right" />
        <div className="Signup__container">
          <div className="Signup__form">
            <div className="Signup__header">
              <object data="img/logo.svg" type="image/svg+xml" id="logo" aria-label="logo" />
              {step !== 'finish' && <div className="Signup__steps">
                <div className={`Signup__steps-step ${stepNumber === 0 ? 'waiting' : ''} ${stepNumber > 0 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 1 ? 'waiting' : ''} ${stepNumber > 1 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 2 ? 'waiting' : ''} ${stepNumber > 2 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 3 ? 'waiting' : ''} ${stepNumber > 3 ? 'processed' : ''}`} />
              </div>}
            </div>
            {step === 'username' &&
            <div>
              <h1><FormattedMessage id="get_started" /></h1>
              <p><FormattedMessage id="username_know" /></p>
              <FormSignupUsername onSubmit={this.handleSubmitUsername} />
            </div>}
            {step === 'email' &&
            <div>
              <h1><FormattedMessage id="enter_email" /></h1>
              <p><FormattedMessage id="confirm_existence" /></p>
              <FormSignupEmail
                onSubmit={this.handleSubmitEmail}
                username={this.state.username}
              />
              <Form.Item>
                <Button htmlType="button" className="back" onClick={() => this.setState({ step: 'username', stepNumber: 0 })}>
                  <FormattedMessage id="go_back" />
                </Button>
              </Form.Item>
            </div>
            }
            {step === 'phoneNumber' &&
            <div>
              <h1><FormattedMessage id="enter_phone" /></h1>
              <p><FormattedMessage id="send_sms" /></p>
              <FormSignupPhoneNumber
                onSubmit={this.handleSubmitPhoneNumber}
                token={token}
                countryCode={countryCode}
              />
              <Form.Item>
                <Button htmlType="button" className="back" onClick={() => this.setState({ step: 'email', stepNumber: 1 })}>
                  <FormattedMessage id="go_back" />
                </Button>
              </Form.Item>
            </div>
            }
            {step === 'confirmPhoneNumber' &&
            <div>
              <h1><FormattedMessage id="enter_confirmation_code" /></h1>
              <p>
                <FormattedMessage
                  id="sms_code"
                  values={{
                    prefix: prefix.split('_')[0],
                    phoneNumber,
                    editLink: <a href={undefined} onClick={() => this.setState({ step: 'phoneNumber', stepNumber: 2 })}>
                      <FormattedMessage id="edit" />
                    </a>,
                  }}
                />
                <br />
                <FormattedMessage id="please_confirm" />
              </p>
              <FormSignupConfirmPhoneNumber
                onSubmit={this.handleSubmitConfirmPhoneNumber}
                token={token}
                phoneNumber={phoneNumber}
                prefix={prefix}
              />
              <Form.Item>
                <Button htmlType="button" className="back" onClick={() => this.setState({ step: 'phoneNumber', stepNumber: 2 })}>
                  <FormattedMessage id="go_back" />
                </Button>
              </Form.Item>
            </div>
            }
            {step === 'finish' &&
            <div>
              <h1><FormattedMessage id="almost_there" /></h1>
              <p><FormattedMessage id="finish_text_1" /></p>
              <p><FormattedMessage id="finish_text_2" /></p>
              <p><FormattedMessage id="finish_text_3" /></p>
            </div>
            }
          </div>
          <div className="Signup__icons">
            {step === 'username' && <object data="img/signup-username.svg" type="image/svg+xml" id="signup-username" aria-label="signup-username" />}
            {step === 'email' && <object data="img/signup-email.svg" type="image/svg+xml" id="signup-email" aria-label="signup-email" />}
            {step === 'phoneNumber' && <object data="img/signup-phone.svg" type="image/svg+xml" id="signup-phone" aria-label="signup-phone" />}
            {step === 'confirmPhoneNumber' && <object data="img/signup-sms.svg" type="image/svg+xml" id="signup-sms" aria-label="signup-sms" />}
            {step === 'finish' && <object data="img/signup-email-confirmation.svg" type="image/svg+xml" id="signup-email-confirmation" aria-label="signup-email-confirmation" />}
          </div>
        </div>
      </div>
    );
  }
}

export default Signup;
