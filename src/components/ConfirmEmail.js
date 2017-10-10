/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../utils/fetch';
import Loading from '../widgets/Loading';

class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'loading',
      error: '',
    };
  }

  componentWillMount() {
    const { intl } = this.props;
    const token = this.props.location.query.token;
    if (!token) {
      this.setState({ status: 'error', error: intl.formatMessage({ id: 'error_token_required' }) });
    } else {
      fetch(`/api/confirm_email?token=${this.props.location.query.token}`)
        .then(checkStatus)
        .then(parseJSON)
        .then((data) => {
          if (data.success) {
            this.setState({ status: 'success' });
          } else {
            this.setState({ status: 'error', error: data.error });
          }
        })
        .catch((error) => {
          error.response.json().then((data) => {
            this.setState({ status: 'error', error: data.error });
          });
        });
    }
  }

  render() {
    const { status, error } = this.state;
    return (
      <div className="container">
        {status === 'loading' && <Loading />}
        {status === 'error' &&
          <div>
            <h1><FormattedMessage id="oops" /></h1>
            <p>{error}</p>
          </div>
        }
        {status === 'success' &&
          <div>
            <h1><FormattedMessage id="thank_you" /></h1>
            <p><FormattedMessage id="email_verified" /></p>
          </div>
        }
      </div>
    );
  }
}

export default injectIntl(Index);
