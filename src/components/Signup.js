import React, { Component } from 'react';
import { Link } from 'react-router';
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
    });
  };

  handleSubmitConfirmPhoneNumber = () => {
    this.setState({
      step: 'finish',
      stepNumber: 4,
    });
  };

  render() {
    const { step, stepNumber, token, countryCode } = this.state;

    return (
      <div className="Signup_main">
        <div className="signup-bg-left" />
        <div className="signup-bg-right" />
        <div className="Signup__container">
          <div className="Signup__form">
            <div className="Signup__header">
              <object data="img/logo.svg" type="image/svg+xml" id="logo" aria-label="logo" />
              <div className="Signup__steps">
                <div className={`Signup__steps-step ${stepNumber === 0 ? 'waiting' : ''} ${stepNumber > 0 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 1 ? 'waiting' : ''} ${stepNumber > 1 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 2 ? 'waiting' : ''} ${stepNumber > 2 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 3 ? 'waiting' : ''} ${stepNumber > 3 ? 'processed' : ''}`} />
              </div>
            </div>
            {step === 'username' &&
            <div>
              <h1>Get started</h1>
              <h2>Your username is how you will be known</h2>
              <FormSignupUsername onSubmit={this.handleSubmitUsername} />
              <span className="form-footer-info">Already have an account? <Link to="/">Login</Link></span>
            </div>}
            {step === 'email' &&
            <div>
              <h1>Please provide your email address to continue</h1>
              <p>
                We need your email address to ensure that we can contact you to verify account
                ownership in the event that your account is ever compromised.
              </p>
              <p>
                Please make sure that you enter a valid email so that you receive the confirmation
                link.
              </p>
              <FormSignupEmail onSubmit={this.handleSubmitEmail} username={this.state.username} />
            </div>
            }
            {step === 'phoneNumber' &&
            <div>
              <h1>Almost there!</h1>
              <p>We need to send you a quick text.</p>
              <p>
                With each Steem account comes a free initial
                grant of Steem Power! Phone verification
                helps cut down on spam accounts.
              </p>
              <p>
                <em>
                  Your phone number will not be used for any other purpose other than account
                  verification and (potentially) account recovery should your account ever be
                  compromised.
                </em>
              </p>
              <FormSignupPhoneNumber
                onSubmit={this.handleSubmitPhoneNumber}
                token={token}
                countryCode={countryCode}
              />
            </div>
            }
            {step === 'confirmPhoneNumber' &&
            <div>
              <h1>Confirm your phone number</h1>
              <p>
                Thank you for providing your phone number ({this.state.phoneNumber}).
                <br />{"To continue please enter the SMS code we've sent you."}
              </p>
              <FormSignupConfirmPhoneNumber
                onSubmit={this.handleSubmitConfirmPhoneNumber}
                token={token}
              />
              <p>
                Need a new code ? <a href={undefined} onClick={() => this.setState({ step: 'phoneNumber', stepNumber: 1 })}>Click here</a>
              </p>
            </div>
            }
            {step === 'finish' &&
            <div>
              <h1>Thanks for confirming your phone number!</h1>
              <p>{"You're few steps aways from getting to the top of the list. Check your email and click the email validation link."}</p>
              <p>{"After validating your sign up request with us we'll look it over for approval. As soon as your turn is up and you're approved, you'll be sent a link to finalize your account!"}</p>
              <p>{"You'll be among the earliest members of the Steem community!"}</p>
            </div>
            }
          </div>
          <div className="Signup__icons">
            {step === 'username' && <object data="img/signup-username.svg" type="image/svg+xml" id="signup-username" aria-label="signup-username" />}
          </div>
        </div>
      </div>
    );
  }
}

export default Signup;
