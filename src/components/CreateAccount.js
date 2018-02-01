import React, { Component, PropTypes } from 'react';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import steem from '@steemit/steem-js';
import { Button, Form, Icon, Popover } from 'antd';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import LanguageItem from './LanguageItem';
import FormSignupUsername from './Form/Signup/Username';
import FormCreateAccountPassword from './Form/CreateAccount/Password';
import apiCall from '../utils/api';
import logStep from '../../helpers/stepLogger';
import Loading from '../widgets/Loading';
import './CreateAccount.less';
import * as actions from '../actions/appLocale';
import locales from '../../helpers/locales.json';


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
class CreateAccount extends Component {
  static defaultProps = {
    location: PropTypes.shape(),
    form: PropTypes.shape(),
  };

  static propTypes = {
    location: PropTypes.shape(),
    intl: intlShape.isRequired,
    locale: PropTypes.string.isRequired,
    setLocale: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      step: 'loading',
      stepNumber: 0,
      error: '',
      username: '',
      password: '',
      reservedUsername: '',
      query: {},
    };
  }

  componentWillMount() {
    const { location: { query: { token } }, intl } = this.props;
    if (!token) {
      this.setState({ step: 'error', error: intl.formatMessage({ id: 'error_token_required' }) });
      logStep('error', -1);
    } else {
      apiCall('/api/confirm_account', {
        token,
      })
        .then((data) => {
          if (data.success) {
            this.setState({
              step: data.username === '' ? 'username' : 'password',
              stepNumber: data.username === '' ? 0 : 1,
              username: data.username,
              reservedUsername: data.reservedUsername,
              query: data.query,
            });
            logStep('username', 0);
          } else {
            this.setState({ step: 'error', error: intl.formatMessage({ id: data.error }) });
            logStep('confirm_account_error', -1);
          }
        })
        .catch((error) => {
          this.setState({ step: 'error', error: intl.formatMessage({ id: error.type }) });
          logStep('confirm_account_error', -1);
        });
    }
  }

  componentDidUpdate() {
    const { step, query } = this.state;
    if (step === 'created') {
      if (this.isWhistle()) {
        window.postMessage('whistle_signup_complete');
      } else {
        const urlParameters = query && Object.keys(query).map(param => `${param}=${query[param]}`).join('&');
        setTimeout(() => {
          window.location.href = `${window.config.DEFAULT_REDIRECT_URI}?${urlParameters}`;
        }, 5000);
      }
    }
  }

  isWhistle = () => {
    const { query } = this.state;
    return query && query.view_mode && query.view_mode === 'whistle';
  }

  goBack = (step, stepNumber) => {
    this.setState({ step, stepNumber });
  }

  handleSubmitUsername = (values) => {
    this.setState({
      step: 'password',
      stepNumber: 1,
      username: values.username,
    });
    logStep('password', 1);
  }

  handleSubmitPassword = (values) => {
    this.setState({
      step: 'password_confirm',
      stepNumber: 2,
      password: values.password,
    });
    logStep('password_confirm', 2);
  }

  handleSubmit = () => {
    const { location: { query: { token } }, intl } = this.props;
    const { username, password } = this.state;
    const publicKeys = steem.auth.generateKeys(username, password, ['owner', 'active', 'posting', 'memo']);

    apiCall('/api/create_account', {
      token,
      username,
      public_keys: JSON.stringify(publicKeys),
    })
      .then((data) => {
        if (data.success) {
          this.setState({ step: 'created' });
          logStep('created', 3);
        } else {
          this.setState({ step: 'error', error: intl.formatMessage({ id: data.error }) });
          logStep('created_error', -1);
        }
      })
      .catch(() => {
        this.setState({ step: 'error', error: intl.formatMessage({ id: 'error_api_create_account' }) });
        logStep('created_error', -1);
      });
  }

  render() {
    const { step, stepNumber, error, username, reservedUsername, password, query } = this.state;
    const { setLocale, locale } = this.props;
    const urlParameters = query && Object.keys(query).map(param => `${param}=${query[param]}`).join('&');
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
              {step !== 'created' && step !== 'error' && <div className="Signup__steps">
                {username === '' && <div className={`Signup__steps-step ${stepNumber === 0 ? 'waiting' : ''} ${stepNumber > 0 ? 'processed' : ''}`} />}
                <div className={`Signup__steps-step ${stepNumber === 1 ? 'waiting' : ''} ${stepNumber > 1 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 2 ? 'waiting' : ''} ${stepNumber > 2 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 3 ? 'waiting' : ''} ${stepNumber > 3 ? 'processed' : ''}`} />
              </div>}
            </div>
            {(step === 'loading' || step === 'error') && <div className="form-content">
              {step === 'loading' && <div className="align-center"><Loading /></div>}
              {step === 'error' &&
              <div>
                <h1><FormattedMessage id="oops" /></h1>
                <p>{error}</p>
              </div>
              }
            </div>}
            {step === 'username' &&
            <div className="form-content">
              <h1><FormattedMessage id="choose_username" /></h1>
              <p><FormattedMessage id="choose_carefully" /></p>
              {username === '' && <span className="username-taken"><FormattedMessage id="error_username_taken" values={{ username: <b>{reservedUsername}</b> }} /></span>}
              <FormSignupUsername onSubmit={this.handleSubmitUsername} />
            </div>}
            {step === 'password' &&
            <div className="form-content">
              <h1><FormattedMessage id="save_password" /></h1>
              <p><FormattedMessage id="save_password_text" /></p>
              <FormCreateAccountPassword onSubmit={this.handleSubmitPassword} init />
            </div>
            }
            {step === 'password_confirm' &&
            <div className="form-content">
              <h1><FormattedMessage id="confirm_account" /></h1>
              <p><FormattedMessage id="confirm_password" /></p>
              <FormCreateAccountPassword
                onSubmit={this.handleSubmit}
                password={password}
                goBack={this.goBack}
              />
            </div>}
            {step === 'created' &&
            <div className="form-content">
              <h1><FormattedMessage id="welcome" /> {username}</h1>
              <p><FormattedMessage id="enjoy_steem" /></p>
              {!this.isWhistle() &&
              <Form.Item>
                <a
                  href={`${window.config.DEFAULT_REDIRECT_URI}?${urlParameters}`}
                  className="redirect-btn"
                >
                  <FormattedMessage id="redirect_button_text" />
                </a>
              </Form.Item>}
            </div>}
          </div>
          <div className="Signup__icons">
            {step === 'username' && <object data="img/signup-username.svg" type="image/svg+xml" id="signup-username" aria-label="signup-username" />}
            {(step === 'password' || step === 'password_confirm') && <object data="img/signup-password.svg" type="image/svg+xml" id="signup-password" aria-label="signup-password" />}
            {step === 'created' && <object data="img/signup-create-account.svg" type="image/svg+xml" id="signup-create-account" aria-label="signup-create-account" />}
            {step === 'error' && <object data="img/signup-create-account.svg" type="image/svg+xml" id="signup-create-account" aria-label="signup-create-account" />}
          </div>
        </div>
      </div>
    );
  }
}

export default injectIntl(CreateAccount);
