import React, { Component, PropTypes } from 'react';
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
      error: '',
      submitting: false,
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
            this.setState({ step: 'form' });
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
        fetch(`/api/create_account?token=${this.props.location.query.token}&username=${values.username}&password=${values.password}`)
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
    const { step, error } = this.state;
    const { getFieldDecorator } = this.props.form;

    return (
      <div className="container">
        <h1>Create Account</h1>
        {step === 'loading' && <Loading />}
        {step === 'error' &&
        <div>
          <h1>Oops!</h1>
          <p>{error}</p>
        </div>
        }
        {step === 'form' &&
        <div>
          <Form onSubmit={this.handleSubmit} className="FormGenerateLink">
            <Form.Item>
              {getFieldDecorator('username', {
                rules: [
                  { required: true, message: 'username is required' },
                  { validator: validateAccountName },
                  { validator: accountNotExist },
                ],
              })(
                <Input prefix={<Icon type="user" size="large" />} placeholder="Username" id="username" />,
              )}
            </Form.Item>
            <Form.Item>
              {getFieldDecorator('password', {
                rules: [{
                  required: true, message: 'password is required',
                }],
              })(
                <Input prefix={<Icon type="lock" size="large" />} placeholder="Password" id="password" defaultValue={createSuggestedPassword()} />,
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
    );
  }
}

export default Form.create()(CreateAccount);
