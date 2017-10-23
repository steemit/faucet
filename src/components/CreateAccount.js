import React, { Component, PropTypes } from 'react';
import steem from 'steem';
import fetch from 'isomorphic-fetch';
import FormSignupUsername from './Form/Signup/Username';
import FormCreateAccountPassword from './Form/CreateAccount/Password';
import { checkStatus, parseJSON } from '../utils/fetch';
import Loading from '../widgets/Loading';
import './CreateAccount.less';

class CreateAccount extends Component {
  static defaultProps = {
    location: PropTypes.shape(),
    form: PropTypes.shape(),
  };

  static propTypes = {
    location: PropTypes.shape(),
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
    };
  }

  componentWillMount() {
    const token = this.props.location.query.token;
    if (!token) {
      this.setState({ step: 'error', error: 'The token is required.' });
    } else {
      fetch(`/api/confirm_account?token=${this.props.location.query.token}`)
        .then(checkStatus)
        .then(parseJSON)
        .then((data) => {
          if (data.success) {
            this.setState({
              step: data.username === '' ? 'username' : 'password',
              stepNumber: data.username === '' ? 0 : 1,
              username: data.username,
              reservedUsername: data.reservedUsername,
            });
          } else {
            this.setState({ step: 'error', error: data.error });
          }
        })
        .catch((error) => {
          error.response.json().then((data) => {
            this.setState({ step: 'error', error: data.error });
          });
        });
    }
  }

  handleSubmitUsername = (values) => {
    this.setState({
      step: 'password',
      stepNumber: 1,
      username: values.username,
    });
  }

  handleSubmitPassword = (values) => {
    this.setState({
      step: 'password_confirm',
      stepNumber: 2,
      password: values.password,
    });
  }

  handleSubmit = () => {
    const { username, password } = this.state;
    const publicKeys = steem.auth.generateKeys(username, password, ['owner', 'active', 'posting', 'memo']);

    fetch(`/api/create_account?token=${this.props.location.query.token}&username=${username}&public_keys=${JSON.stringify(publicKeys)}`)
      .then(checkStatus)
      .then(parseJSON)
      .then((data) => {
        if (data.success) {
          this.setState({ step: 'created' });
        } else {
          this.setState({ step: 'error', error: data.error });
        }
      })
      .catch((error) => {
        error.response.json().then((data) => {
          this.setState({ step: 'error', error: data.error });
        });
      });
  }

  render() {
    const { step, stepNumber, error, username, reservedUsername, password } = this.state;

    return (
      <div className="Signup_main">
        <div className="signup-bg-left" />
        <div className="signup-bg-right" />
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
                <h1>Oops!</h1>
                <p>{error}</p>
              </div>
              }
            </div>}
            {step === 'username' &&
            <div className="form-content">
              <h1>Choose username</h1>
              <p>Choose it carefully as you cannot change it later</p>
              {username === '' && <span className="username-taken">The username you chose <b>{reservedUsername}</b> has already been taken, please choose another one.</span>}
              <FormSignupUsername onSubmit={this.handleSubmitUsername} />
            </div>}
            {step === 'password' &&
            <div className="form-content">
              <h1>Save password</h1>
              <p>
                If you ever lose your password, your account will be irreversibly lost.
                We do not have your password and cannot help you recover it.
              </p>
              <FormCreateAccountPassword onSubmit={this.handleSubmitPassword} init />
            </div>
            }
            {step === 'password_confirm' &&
            <div className="form-content">
              <h1>Confirm account</h1>
              <p>
                {"You can't change your username once you set it. "}
                {`Are you sure you want to set ${username} as your username?`}
              </p>
              <p>Please type your password to confirm it.</p>
              <FormCreateAccountPassword onSubmit={this.handleSubmit} password={password} />
            </div>}
            {step === 'created' &&
            <div className="form-content">
              <h1>Welcome {username}</h1>
              <p>You can now enjoy Steem and all its features.</p>
            </div>}
          </div>
          <div className="Signup__icons">
            {step === 'username' && <object data="img/signup-username.svg" type="image/svg+xml" id="signup-username" aria-label="signup-username" />}
            {(step === 'password' || step === 'password_confirm') && <object data="img/signup-password.svg" type="image/svg+xml" id="signup-password" aria-label="signup-password" />}
            {step === 'created' && <object data="img/signup-create-account.svg" type="image/svg+xml" id="signup-create-account" aria-label="signup-create-account" />}
          </div>
        </div>
      </div>
    );
  }
}

export default CreateAccount;
