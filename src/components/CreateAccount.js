import React, { Component, PropTypes } from 'react';
import steem from 'steem';
import fetch from 'isomorphic-fetch';
import { Button, Form, Icon, Input } from 'antd';
import createSuggestedPassword from '../utils/auth';
import { checkStatus, parseJSON } from '../utils/fetch';
import { accountNotExist, validateAccountName } from '../utils/validator';
import Loading from '../widgets/Loading';

class CreateAccount extends Component {
  static defaultProps = {
    location: PropTypes.shape(),
    form: PropTypes.shape(),
  }

  static propTypes = {
    location: PropTypes.shape(),
    form: PropTypes.shape(),
  }

  constructor(props) {
    super(props);
    this.state = {
      step: 'loading',
      stepNumber: 0,
      error: '',
      submitting: false,
      defaultUsername: '',
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
            this.setState({ step: 'form', defaultUsername: data.username, reservedUsername: data.reservedUsername });
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

  handleSubmit = async (e) => {
    e.preventDefault();
    const { form } = this.props;
    if (this.state.submitting) return;
    this.setState({ submitting: true });
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        const publicKeys = steem.auth.generateKeys(values.username, values.password, ['owner', 'active', 'posting', 'memo']);

        fetch(`/api/create_account?token=${this.props.location.query.token}&username=${values.username}&public_keys=${JSON.stringify(publicKeys)}`)
          .then(checkStatus)
          .then(parseJSON)
          .then((data) => {
            if (data.success) {
              this.setState({ submitting: false, step: 'created' });
            } else {
              this.setState({ submitting: false, step: 'error', error: data.error });
            }
          })
          .catch((error) => {
            error.response.json().then((data) => {
              this.setState({ submitting: false, step: 'error', error: data.error });
            });
          });
      }
      return true;
    });
  }

  render() {
    const { step, stepNumber, error, defaultUsername, reservedUsername } = this.state;
    const { getFieldDecorator } = this.props.form;

    return (
      <div className="Signup_main">
        <div className="signup-bg-left" />
        <div className="signup-bg-right" />
        <div className="Signup__container">
          <div className="Signup__form">
            <div className="Signup__header">
              <object data="img/logo.svg" type="image/svg+xml" id="logo" aria-label="logo" />
              {step !== 'created' && <div className="Signup__steps">
                <div className={`Signup__steps-step ${stepNumber === 0 ? 'waiting' : ''} ${stepNumber > 0 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 1 ? 'waiting' : ''} ${stepNumber > 1 ? 'processed' : ''}`} />
                <div className={`Signup__steps-step ${stepNumber === 2 ? 'waiting' : ''} ${stepNumber > 2 ? 'processed' : ''}`} />
              </div>}
            </div>
            {step === 'loading' && <Loading />}
            {step === 'error' &&
            <div>
              <h1>Oops!</h1>
              <p>{error}</p>
            </div>
            }
            {step === 'form' &&
            <div>
              <h1>Create account</h1>
              <Form onSubmit={this.handleSubmit} className="signup-form">
                <Form.Item>
                  {getFieldDecorator('username', {
                    rules: [
                      { required: true, message: 'username is required' },
                      { validator: validateAccountName },
                      { validator: accountNotExist },
                    ],
                    initialValue: defaultUsername,
                  })(
                    <Input prefix={<Icon type="user" size="large" />} placeholder="Username" id="username" />,
                  )}
                </Form.Item>
                {defaultUsername === '' && <span className="username-taken">The username you chose <b>{reservedUsername}</b> has already been taken, please choose another one.</span>}
                <Form.Item>
                  {getFieldDecorator('password', {
                    rules: [{
                      required: true, message: 'password is required',
                    }],
                    initialValue: createSuggestedPassword(),
                  })(
                    <Input prefix={<Icon type="lock" size="large" />} placeholder="Password" id="password" />,
                  )}
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">Create Account</Button>
                </Form.Item>
              </Form>
            </div>
            }
            {step === 'created' &&
            <div>
              Your account has been created! Enjoy.
              <br />
              <br />
              SteemConnect
            </div>}
          </div>
          <div className="Signup__icons">
            {step === 'form' && <object data="img/signup-username.svg" type="image/svg+xml" id="signup-username" aria-label="signup-username" />}
            {step === 'created' && <object data="img/signup-email-confirmation.svg" type="image/svg+xml" id="signup-email-confirmation" aria-label="signup-email-confirmation" />}
          </div>
        </div>
      </div>
    );
  }
}

export default Form.create()(CreateAccount);
