import React, { Component, PropTypes } from 'react';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import steem from '@steemit/steem-js';
import { Button, Form, Icon, Popover } from 'antd';
import { CHECKPOINTS } from '../../constants';
import LanguageItem from './LanguageItem';
import FormSignupUsername from './Form/Signup/Username';
import FormCreateAccountPassword from './Form/CreateAccount/Password';
import apiCall from '../utils/api';
import Loading from '../widgets/Loading';
import './CreateAccount.less';
import locales from '../../helpers/locales.json';

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
        setTrackingId: PropTypes.func.isRequired,
        logCheckpoint: PropTypes.func.isRequired,
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
            email: '',
            query: {},
        };
    }

    componentWillMount() {
        const {
            location: { query: { token } },
            intl,
            logCheckpoint,
            setTrackingId,
        } = this.props;
        if (!token) {
            this.setState({
                step: 'error',
                error: intl.formatMessage({ id: 'error_token_required' }),
            });
        } else {
            apiCall('/api/confirm_account', {
                token,
            })
                .then(data => {
                    if (data.success) {
                        this.setState({
                            step:
                                data.username === '' ? 'username' : 'password',
                            stepNumber: data.username === '' ? 0 : 1,
                            username: data.username,
                            reservedUsername: data.reservedUsername,
                            email: data.email,
                            query: data.query,
                            xref: data.xref,
                        });
                        setTrackingId(data.xref);
                        logCheckpoint(CHECKPOINTS.creation_started);
                    } else {
                        this.setState({
                            step: 'error',
                            error: intl.formatMessage({ id: data.error }),
                        });
                    }
                })
                .catch(error => {
                    this.setState({
                        step: 'error',
                        error: intl.formatMessage({ id: error.type }),
                    });
                });
        }
    }

    componentDidUpdate() {
        const { step } = this.state;
        if (step === 'created') {
            if (this.isWhistle()) {
                window.postMessage('whistle_signup_complete');
            } else {
                const redirectUri = this.getRedirect();
                setTimeout(() => {
                    window.location.href = redirectUri;
                }, 5000);
            }
        }
    }

    getRedirect = () => {
        const { username, query } = this.state;
        let redirectUri = window.config.DEFAULT_REDIRECT_URI;
        const matches = redirectUri.match(new RegExp(/({{\w+}})/g, 'g'));

        query.username = username;

        if (matches) {
            matches.forEach(match => {
                const strippedMatch = match.match(new RegExp(/\w+/g, 'g'));

                redirectUri = redirectUri.replace(
                    match,
                    query && query[strippedMatch] ? query[strippedMatch] : ''
                );
            });
        }

        return redirectUri;
    };

    isWhistle = () => {
        const { query } = this.state;
        return query && query.view_mode && query.view_mode === 'whistle';
    };

    goBack = (step, stepNumber) => {
        this.setState({ step, stepNumber });
    };

    handleSubmitUsername = values => {
        this.setState({
            step: 'password',
            stepNumber: 1,
            username: values.username,
        });
    };

    handleSubmitPassword = values => {
        this.setState({
            step: 'password_confirm',
            stepNumber: 2,
            password: values.password,
        });
        this.props.logCheckpoint(CHECKPOINTS.password_chosen);
    };

    handleSubmit = () => {
        const {
            location: { query: { token } },
            intl,
            logCheckpoint,
        } = this.props;
        const { username, password, email } = this.state;

        const publicKeys = steem.auth.generateKeys(username, password, [
            'owner',
            'active',
            'posting',
            'memo',
        ]);
        apiCall('/api/create_account', {
            token,
            username,
            email,
            public_keys: JSON.stringify(publicKeys),
        })
            .then(data => {
                if (data.success) {
                    this.setState({ step: 'created' });
                    logCheckpoint(CHECKPOINTS.account_created);
                } else {
                    this.setState({
                        step: 'error',
                        error: intl.formatMessage({ id: data.error }),
                    });
                }
            })
            .catch(() => {
                this.setState({
                    step: 'error',
                    error: intl.formatMessage({
                        id: 'error_api_create_account',
                    }),
                });
            });
    };

    render() {
        const {
            step,
            stepNumber,
            error,
            username,
            reservedUsername,
            password,
        } = this.state;
        const isPasswordOrConfirmStep =
            step === 'password' || step === 'password_confirm';
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
                                {Object.keys(locales).map(key => (
                                    <LanguageItem
                                        key={key}
                                        locale={key}
                                        setLocale={setLocale}
                                    />
                                ))}
                            </ul>
                        }
                        trigger="click"
                    >
                        <Button>
                            {locales[locale]}
                            <Icon type="down" />
                        </Button>
                    </Popover>
                </div>
                <div className="Signup__container">
                    <div className="Signup__form">
                        <div className="Signup__header">
                            <object
                                data="img/logo.svg"
                                type="image/svg+xml"
                                id="logo"
                                aria-label="logo"
                            />
                            {step !== 'created' &&
                                step !== 'error' && (
                                    <div className="Signup__steps">
                                        {username === '' && (
                                            <div
                                                className={`Signup__steps-step ${
                                                    stepNumber === 0
                                                        ? 'waiting'
                                                        : ''
                                                } ${
                                                    stepNumber > 0
                                                        ? 'processed'
                                                        : ''
                                                }`}
                                            />
                                        )}
                                        <div
                                            className={`Signup__steps-step ${
                                                stepNumber === 1
                                                    ? 'waiting'
                                                    : ''
                                            } ${
                                                stepNumber > 1
                                                    ? 'processed'
                                                    : ''
                                            }`}
                                        />
                                        <div
                                            className={`Signup__steps-step ${
                                                stepNumber === 2
                                                    ? 'waiting'
                                                    : ''
                                            } ${
                                                stepNumber > 2
                                                    ? 'processed'
                                                    : ''
                                            }`}
                                        />
                                        <div
                                            className={`Signup__steps-step ${
                                                stepNumber === 3
                                                    ? 'waiting'
                                                    : ''
                                            } ${
                                                stepNumber > 3
                                                    ? 'processed'
                                                    : ''
                                            }`}
                                        />
                                    </div>
                                )}
                        </div>
                        {(step === 'loading' || step === 'error') && (
                            <div className="form-content">
                                {step === 'loading' && (
                                    <div className="align-center">
                                        <Loading />
                                    </div>
                                )}
                                {step === 'error' && (
                                    <div>
                                        <h1>
                                            <FormattedMessage id="oops" />
                                        </h1>
                                        <p>{error}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {step === 'username' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="choose_username" />
                                </h1>
                                <p>
                                    <FormattedMessage id="choose_carefully" />
                                </p>
                                {username === '' && (
                                    <span className="username-taken">
                                        <FormattedMessage
                                            id="error_username_taken"
                                            values={{
                                                username: (
                                                    <b>{reservedUsername}</b>
                                                ),
                                            }}
                                        />
                                    </span>
                                )}
                                <FormSignupUsername
                                    onSubmit={this.handleSubmitUsername}
                                />
                            </div>
                        )}
                        {step === 'password' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="save_password" />
                                </h1>
                                <p>
                                    <FormattedMessage id="save_password_text" />
                                </p>
                                <FormCreateAccountPassword
                                    onSubmit={this.handleSubmitPassword}
                                    init
                                />
                            </div>
                        )}
                        {step === 'password_confirm' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="confirm_account" />
                                </h1>
                                <p>
                                    <FormattedMessage id="confirm_password" />
                                </p>
                                <FormCreateAccountPassword
                                    onSubmit={this.handleSubmit}
                                    password={password}
                                    goBack={this.goBack}
                                />
                            </div>
                        )}
                        {step === 'created' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="welcome" /> {username}
                                </h1>
                                <p>
                                    <FormattedMessage id="enjoy_steem" />
                                </p>
                                {!this.isWhistle() && (
                                    <Form.Item>
                                        <a
                                            href={this.getRedirect()}
                                            className="redirect-btn"
                                        >
                                            <FormattedMessage id="redirect_button_text" />
                                        </a>
                                    </Form.Item>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="Signup__icons">
                        {step === 'username' && (
                            <object
                                data="img/signup-username.svg"
                                type="image/svg+xml"
                                id="signup-username"
                                aria-label="signup-username"
                            />
                        )}
                        {isPasswordOrConfirmStep && (
                            <object
                                data="img/signup-password.svg"
                                type="image/svg+xml"
                                id="signup-password"
                                aria-label="signup-password"
                            />
                        )}
                        {step === 'created' && (
                            <object
                                data="img/signup-create-account.svg"
                                type="image/svg+xml"
                                id="signup-create-account"
                                aria-label="signup-create-account"
                            />
                        )}
                        {step === 'error' && (
                            <object
                                data="img/signup-create-account.svg"
                                type="image/svg+xml"
                                id="signup-create-account"
                                aria-label="signup-create-account"
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(CreateAccount);
