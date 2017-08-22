import React, { Component } from 'react';
import { Steps } from 'antd';
import FormSignupEmail from './Form/Signup/Email';
import FormSignupPhoneNumber from './Form/Signup/PhoneNumber';
import FormSignupConfirmPhoneNumber from './Form/Signup/ConfirmPhoneNumber';

class Signup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 'email',
      stepNumber: 0,
      username: '',
      email: '',
      phoneNumber: '',
      token: '',
    };
  }

  handleSubmitEmail = (values, token) => {
    this.setState({
      step: 'phoneNumber',
      stepNumber: 1,
      email: values.email,
      token,
    });
  };

  handleSubmitPhoneNumber = (values) => {
    this.setState({
      step: 'confirmPhoneNumber',
      stepNumber: 2,
      phoneNumber: values.phoneNumber,
    });
  };

  handleSubmitConfirmPhoneNumber = () => {
    this.setState({
      step: 'finish',
      stepNumber: 3,
    });
  };

  render() {
    const { step, stepNumber, token } = this.state;

    return (
      <div className="container">
        <Steps progressDot current={stepNumber}>
          <Steps.Step />
          <Steps.Step />
          <Steps.Step />
          <Steps.Step />
        </Steps>
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
            <FormSignupEmail onSubmit={this.handleSubmitEmail} />
          </div>
        }
        {step === 'phoneNumber' &&
          <div>
            <h1>Almost there!</h1>
            <p>We need to send you a quick text.</p>
            <p>
              With each Steem account comes a free initial grant of Steem Power! Phone verification
              helps cut down on spam accounts.
            </p>
            <p>
              <em>
                Your phone number will not be used for any other purpose other than account
                verification and (potentially) account recovery should your account ever be
                compromised.
              </em>
            </p>
            <FormSignupPhoneNumber onSubmit={this.handleSubmitPhoneNumber} token={token} />
          </div>
        }
        {step === 'confirmPhoneNumber' &&
          <div>
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
    );
  }
}

export default Signup;
