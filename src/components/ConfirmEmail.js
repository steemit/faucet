/* eslint-disable react/prop-types */
import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import { FormattedMessage, injectIntl } from 'react-intl';
import fetch from 'isomorphic-fetch';
import { checkStatus, parseJSON } from '../utils/fetch';
import Loading from '../widgets/Loading';
import { CHECKPOINTS } from '../../constants';

class Index extends Component {
    static propTypes = {
        setTrackingId: PropTypes.func.isRequired,
        logCheckpoint: PropTypes.func.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            status: 'loading',
            completed: true,
            username: null,
            email: null,
            token: null,
            error: '',
            approved: null,
        };
    }

    componentWillMount() {
        const { intl, logCheckpoint, setTrackingId } = this.props;
        const token = this.props.location.query.token;
        if (!token) {
            this.setState({
                status: 'error',
                error: intl.formatMessage({ id: 'error_token_required' }),
            });
        } else {
            fetch(`/api/confirm_email?token=${this.props.location.query.token}`)
                .then(checkStatus)
                .then(parseJSON)
                .then(data => {
                    this.setState({
                        status: data.success ? 'success' : 'error',
                        error: data.error || '',
                        completed: data.completed,
                        email: data.email,
                        username: data.username,
                        token: data.token,
                        xref: data.xref,
                        approved: data.approved,
                    });
                    if (data.success) {
                        setTrackingId(data.xref);
                        logCheckpoint(CHECKPOINTS.email_verified);
                    }
                })
                .catch(error => {
                    error.response.json().then(data => {
                        this.setState({
                            status: 'error',
                            error: data.error,
                            completed: data.completed,
                            email: data.email,
                            username: data.username,
                            token: data.token,
                        });
                    });
                });
        }
    }

    render() {
        const {
            status,
            error,
            completed,
            email,
            username,
            token,
            approved,
            xref,
        } = this.state;
        return (
            <div className="Signup_main">
                <div className="signup-bg-left" />
                <div className="signup-bg-right" />
                <div className="Signup__container">
                    <div className="Signup__form">
                        <div className="Signup__header">
                            <object
                                data="img/logo.svg"
                                type="image/svg+xml"
                                id="logo"
                                aria-label="logo"
                            />
                        </div>
                        <div className="form-content">
                            {status === 'loading' && (
                                <div className="align-center">
                                    <Loading />
                                </div>
                            )}
                            {status === 'error' && (
                                <div>
                                    <h1>
                                        <FormattedMessage id="oops" />
                                    </h1>
                                    <p>{error}</p>
                                    {!completed && (
                                        <p>
                                            <Link
                                                to={`/?username=${username}&email=${email}&token=${token}&xref=${xref}`}
                                                className="complete-signup"
                                            >
                                                <FormattedMessage id="continue" />
                                            </Link>
                                        </p>
                                    )}
                                </div>
                            )}
                            {status === 'success' && (
                                <div>
                                    <h1>
                                        <FormattedMessage id="thank_you" /> @{
                                            username
                                        }
                                    </h1>
                                    <p>
                                        <FormattedMessage id="email_verified" />
                                    </p>
                                    {!completed && (
                                        <p>
                                            <Link
                                                to={`/?username=${username}&email=${email}&token=${token}`}
                                                className="complete-signup"
                                            >
                                                <FormattedMessage id="continue" />
                                            </Link>
                                        </p>
                                    )}
                                    {completed &&
                                        !approved && (
                                            <p>
                                                <FormattedMessage id="email_verified_complete" />
                                            </p>
                                        )}
                                    {completed &&
                                        approved && (
                                            <p>
                                                <FormattedMessage id="email_verified_complete_approved" />
                                            </p>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="Signup__icons">
                        <object
                            data="img/signup-email-confirmation.svg"
                            type="image/svg+xml"
                            id="signup-email-confirmation"
                            aria-label="signup-email-confirmation"
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(Index);
