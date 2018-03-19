import React, { Component, PropTypes } from 'react';
import { FormattedMessage } from 'react-intl';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Button, Icon, Popover } from 'antd';
import fetch from 'isomorphic-fetch';
import FormSignupUsername from './Form/Signup/Username';
import FormSignupEmail from './Form/Signup/Email';
import FormSignupEmailChinese from './Form/Signup/EmailChinese';
import FormSignupPhoneNumber from './Form/Signup/PhoneNumber';
import FormSignupConfirmPhoneNumber from './Form/Signup/ConfirmPhoneNumber';
import LanguageItem from './LanguageItem';
import { checkStatus, parseJSON } from '../utils/fetch';
import logStep from '../../helpers/stepLogger';
import * as actions from '../actions/appLocale';
import locales from '../../helpers/locales.json';
import './Signup.less';

@connect(
  state => ({
    locale: state.appLocale.locale,
  }),
  dispatch =>
    bindActionCreators(
      {
        setLocale: actions.setLocale,
      },
      dispatch,
    ),
)
class Signup extends Component {
  static propTypes = {
    location: PropTypes.shape({
      query: PropTypes.shape({
        username: PropTypes.string,
        email: PropTypes.string,
        token: PropTypes.string,
        ref: PropTypes.string,
      }),
    }),
    locale: PropTypes.string.isRequired,
    setLocale: PropTypes.func.isRequired,
  };

  static defaultProps = {
    location: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      step: this.initStep().step,
      stepNumber: this.initStep().stepNumber,
      username: props.location.query.username || '',
      email: props.location.query.email || '',
      phoneNumber: '',
      phoneNumberFormatted: '',
      token: props.location.query.token || '',
      ref: props.location.query.ref || 'steemit',
      countryCode: '',
      prefix: '',
      completed: false,
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

  initStep = () => {
    const { location: { query: { email, username, token } } } = this.props;
    if (email && username && token) {
      logStep('phoneNumber', 2);
      return { step: 'phoneNumber', stepNumber: 2 };
    }
    logStep('username', 0);
    return { step: 'username', stepNumber: 0 };
  };

  goBack = (step, stepNumber) => {
    this.setState({ step, stepNumber });
  };

  handleSubmitUsername = (values) => {
    this.setState({
      step: 'email',
      stepNumber: 1,
      username: values.username,
    });
    logStep('email', 1);
  }

  handleSubmitEmail = (values, token) => {
    this.setState({
      step: 'checkYourEmail',
      stepNumber: 2,
      email: values.email,
      token,
    });
    // TODO: Determine conveyor step name.
    // logStep('checkYourEmail', 2);
  };

  handleSubmitPhoneNumber = (values) => {
    this.setState({
      step: 'confirmPhoneNumber',
      stepNumber: 3,
      phoneNumber: values.phoneNumber,
      phoneNumberFormatted: values.phoneNumberFormatted,
      prefix: values.prefix,
    });
    logStep('confirmPhoneNumber', 3);
  };

  handleSubmitConfirmPhoneNumber = (completed) => {
    this.setState({
      step: 'finish',
      stepNumber: 4,
      completed,
    });
    logStep('finish', 4);
  };

  render() {
    const {
      step, stepNumber, token, countryCode, prefix,
      phoneNumberFormatted, phoneNumber, username, email,
      ref,
    } = this.state;
    const { setLocale, locale } = this.props;

    return (
      <div className="Signup_main">
        <div className="signup-bg-left" />
        <div className="signup-bg-right" />
        <div className="language-select">
          <Popover
            placement="bottom"
            content={
              <ul className="lp-language-select">
                {Object.keys(locales).map(key =>
                  <LanguageItem locale={key} setLocale={setLocale} />)}
              </ul>
            }
            trigger="click"
          >
            <Button>{locales[locale]}<Icon type="down" /></Button>
          </Popover>
        </div>
        <div className="Signup__container">
          <div className="Signup__form">
            <div className="Signup__header">
              <object data="img/logo.svg" type="image/svg+xml" id="logo" aria-label="logo" />
              {step !== 'finish' && step !== 'checkYourEmail' && <div className="Signup__steps">
                <div className={`Signup__steps-step ${stepNumber === 0 ? 'waiting' : ''} ${stepNumber > 0 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 1 ? 'waiting' : ''} ${stepNumber > 1 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 2 ? 'waiting' : ''} ${stepNumber > 2 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 3 ? 'waiting' : ''} ${stepNumber > 3 ? 'processed' : ''}`} />
              </div>}
            </div>
            {step === 'username' &&
            <div className="form-content">
              {ref === 'steemit' &&
                <object data="img/steemit-logo.svg" type="image/svg+xml" id="app-logo" aria-label="logo" />
              }
              <h1><FormattedMessage id="get_started" /></h1>
              <p>
                {ref === 'steemit' && <FormattedMessage id="username_know_steemit" />}
                {ref !== 'steemit' && <FormattedMessage id="username_know" />}
              </p>
              <FormSignupUsername
                onSubmit={this.handleSubmitUsername}
                username={username}
                email={email}
                origin={ref}
              />
            </div>}
            {step === 'email' &&
            <div className="form-content two-actions">
              <h1><FormattedMessage id="enter_email" /></h1>
              <p><FormattedMessage id="confirm_existence" /></p>
              {countryCode !== 'CN' &&
              <FormSignupEmail
                onSubmit={this.handleSubmitEmail}
                username={username}
                email={email}
                goBack={this.goBack}
              />}
              {countryCode === 'CN' &&
              <FormSignupEmailChinese
                onSubmit={this.handleSubmitEmail}
                username={username}
                email={email}
                goBack={this.goBack}
              />}
            </div>
            }
            {step === 'phoneNumber' &&
            <div className="form-content two-actions">
              <h1><FormattedMessage id="enter_phone" /></h1>
              <p><FormattedMessage id="send_sms" /></p>
              <FormSignupPhoneNumber
                onSubmit={this.handleSubmitPhoneNumber}
                token={token}
                countryCode={countryCode}
                prefix={prefix}
                phoneNumber={phoneNumber}
              />
            </div>
            }
            {step === 'confirmPhoneNumber' &&
            <div className="form-content two-actions">
              <h1><FormattedMessage id="enter_confirmation_code" /></h1>
              <p>
                <FormattedMessage
                  id="sms_code"
                  values={{
                    phoneNumber: phoneNumberFormatted,
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
                goBack={this.goBack}
              />
            </div>
            }
            {step === 'checkYourEmail' &&
            <div className="form-content">
              <h1><FormattedMessage id="almost_there_email" /></h1>
              <p><FormattedMessage id="finish_text_3" /></p>
            </div>
            }
            {step === 'finish' &&
            <div className="form-content">
              <h1><FormattedMessage id="almost_there" /></h1>
              <p><FormattedMessage id="finish_text_1" /></p>
              <p><FormattedMessage id="finish_text_2" /></p>
            </div>
            }
          </div>
          <div className={`Signup__icons ${step === 'username' ? 'username-icons' : ''}`}>
            {step === 'username' &&
            <div>
              <h3><FormattedMessage id="signup_username_right_title" /></h3>
              <p>
                <FormattedMessage id="signup_username_right_text" />
              </p>
            </div>}
            {step === 'username' && <img src="/img/signup-username.png" id="signup-username" aria-label="signup-username" alt="signup-username" />}
            {step === 'email' && <object data="img/signup-email.svg" type="image/svg+xml" id="signup-email" aria-label="signup-email" />}
            {step === 'checkYourEmail' && <object data="img/signup-email.svg" type="image/svg+xml" id="signup-email" aria-label="signup-email" />}
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
