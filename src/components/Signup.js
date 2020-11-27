/* eslint-disable no-console */
import React, { Component, PropTypes } from 'react';
import Cookies from 'js-cookie';
import { FormattedMessage } from 'react-intl';
import { Button, Icon, Popover } from 'antd';
import { CHECKPOINTS } from '../../constants';
import FormSignupUsername from './Form/Signup/Username';
import FormSignupEmail from './Form/Signup/Email';
import FormSignupEmailChinese from './Form/Signup/EmailChinese';
import FormSignupPhoneNumber from './Form/Signup/PhoneNumber';
import FormSignupConfirmPhoneNumber from './Form/Signup/ConfirmPhoneNumber';
import FormSignupUserInfo from './Form/Signup/UserInfo';
import LanguageItem from './LanguageItem';
import './Signup.less';
import locales from '../../helpers/locales.json';
import SignupOptions from './Form/Signup/SignupOptions';
import SavePassword from './Form/Signup/SavePassword';
import CreateAccount from './Form/Signup/CreateAccount';
import SiftTracker from './SiftTracker';
import { getPendingClaimedAccounts } from '../../helpers/validator';
import { recordActivityTracker } from '../utils/api';

class Signup extends Component {
    static propTypes = {
        app: PropTypes.shape({
            locale: React.PropTypes.oneOf(['en', 'fr', 'zh']),
            signupModalVisible: React.PropTypes.bool.isRequired,
            activityCookieName: React.PropTypes.string,
            activityCookieExpiresTime: React.PropTypes.number,
        }).isRequired,
        user: PropTypes.shape({
            username: PropTypes.string.isRequired,
            email: PropTypes.string.isRequired,
            token: PropTypes.string.isRequired,
            referrer: PropTypes.string.isRequired,
            phoneNumber: PropTypes.string.isRequired,
            phoneNumberFormatted: PropTypes.string.isRequired,
            countryCode: PropTypes.string,
            prefix: PropTypes.string,
            completed: PropTypes.bool.isRequired,
            trackingId: PropTypes.string.isRequired,
            step: PropTypes.string.isRequired,
        }).isRequired,
        queryParams: PropTypes.shape({
            username: PropTypes.string,
            email: PropTypes.string,
            token: PropTypes.string,
            ref: PropTypes.string,
            xref: PropTypes.string,
        }).isRequired,
        setLocale: PropTypes.func.isRequired,
        guessCountryCode: PropTypes.func.isRequired,
        incrementStep: PropTypes.func.isRequired,
        decrementStep: PropTypes.func.isRequired,
        setStep: PropTypes.func.isRequired,
        setUsername: PropTypes.func.isRequired,
        setEmail: PropTypes.func.isRequired,
        setPhone: PropTypes.func.isRequired,
        setPhoneFormatted: PropTypes.func.isRequired,
        setToken: PropTypes.func.isRequired,
        setPrefix: PropTypes.func.isRequired,
        setCompleted: PropTypes.func.isRequired,
        setTrackingId: PropTypes.func.isRequired,
        logCheckpoint: PropTypes.func.isRequired,
        showSignupModal: PropTypes.func.isRequired,
        hideSignupModal: PropTypes.func.isRequired,
    };

    static defaultProps = {
        queryParams: {
            username: undefined,
            email: undefined,
            token: undefined,
            ref: undefined,
            xref: undefined,
        },
        user: {
            countryCode: null,
        },
        password: '',
    };

    constructor() {
        super();
        this.state = {
            pending_claimed_accounts: 0,
            password: '',
            language_item_visible: false,
        };
    }

    async componentWillMount() {
        const {
            user: { trackingId, step },
            queryParams: {
                username: paramUsername,
                email: paramEmail,
                token: paramToken,
                xref: paramXref,
            },
            guessCountryCode,
            setStep,
            setTrackingId,
            logCheckpoint,
        } = this.props;

        getPendingClaimedAccounts(res => {
            // console.log(111111,res&&res.pending_claimed_accounts)
            this.setState({
                pending_claimed_accounts:
                    (res && res.pending_claimed_accounts) || 0,
            });
        });

        guessCountryCode();

        if (paramXref && trackingId !== paramXref) {
            setTrackingId(paramXref);
        }

        if (paramEmail && paramUsername && paramToken) {
            setStep('phoneNumber');
        }

        if (!paramUsername && step === 'signupOptions') {
            logCheckpoint(CHECKPOINTS.signup_start);
        }

        this.updateActivityTag();
    }

    updateActivityTag = () => {
        const cookieName = this.props.app.activityCookieName;
        const expiresTime = this.props.app.activityCookieExpiresTime;
        const activityTags = Cookies.getJSON(cookieName);
        const trackingId = this.props.user.trackingId;
        if (activityTags !== undefined) {
            // location info
            const hostname = window.location.hostname;
            const locationInfo = hostname.split('.').reverse();
            const domain =
                ['localhost', '127.0.0.1'].indexOf(hostname) === -1
                    ? `.${locationInfo[1]}.${locationInfo[0]}`
                    : hostname;
            console.log('cookies:', activityTags, trackingId, domain, cookieName, expiresTime);
            Object.keys(activityTags).forEach(tag => {
                if (activityTags[tag].isVisit === 0) {
                    recordActivityTracker({trackingId, activityTag: tag});
                    activityTags[tag].isVisit = 1;
                }
            });
            Cookies.set(cookieName, activityTags, { expires: expiresTime, domain })
        }
    }

    goBack = () => {
        this.props.decrementStep();
    };

    handleFreeSignup = () => {
        this.props.incrementStep();
        // this is similar with CHECKPOINTS.signup_start
        // this.props.logCheckpoint(CHECKPOINTS.free_signup_chosen);
    };
    handleSavePassword = password => {
        this.setState({
            password,
        });
        this.props.incrementStep();
    };

    handleSubmitUsername = values => {
        this.props.incrementStep();
        this.props.setUsername(values.username);
        this.props.logCheckpoint(CHECKPOINTS.username_chosen);
    };

    handleSubmitEmail = (values, token) => {
        this.props.incrementStep();
        this.props.setEmail(values.email);
        this.props.setToken(token);
        this.props.logCheckpoint(CHECKPOINTS.email_submitted);
    };

    handleSubmitPhoneNumber = values => {
        this.props.incrementStep();
        this.props.setPhone(values.phoneNumber);
        this.props.setPhoneFormatted(values.phoneNumberFormatted);
        this.props.setPrefix(values.prefix);
        this.props.logCheckpoint(CHECKPOINTS.phone_submitted);
    };

    handleSubmitConfirmPhoneNumber = completed => {
        this.props.incrementStep();
        this.props.setCompleted(completed);
        this.props.logCheckpoint(CHECKPOINTS.phone_verified);
    };

    handleSubmitUserInfo = data => {
        this.props.incrementStep();
        this.props.setUsername(data.username);
        this.props.setEmail(data.email);
        this.props.setPhone(data.phoneNumber);
        this.props.setToken(data.token);
        this.props.logCheckpoint(CHECKPOINTS.user_created);
    };

    handleCreateAccount = () => {
        this.props.incrementStep();
    };

    render() {
        const {
            app: { locale, steps, signupModalVisible },
            user: {
                username,
                email,
                phoneNumber,
                phoneNumberFormatted,
                countryCode,
                token,
                step,
                prefix,
                referrer,
                trackingId,
            },
            queryParams: {
                username: paramUsername,
                email: paramEmail,
                token: paramToken,
                ref: paramRef,
            },
            setLocale,
            showSignupModal,
            hideSignupModal,
            logCheckpoint,
        } = this.props;

        const stepNumber = steps.indexOf(step);

        // If param exists in url, prefer that:
        const currentUsername = paramUsername || username;
        const currentEmail = paramEmail || email;
        const currentToken = paramToken || token;
        const currentReferrer = paramRef || referrer;

        return (
            <div className="Signup_main">
                <SiftTracker email={currentEmail} />
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
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.setState({
                                                language_item_visible: false,
                                            });
                                        }}
                                    />
                                ))}
                            </ul>
                        }
                        trigger="click"
                        visible={this.state.language_item_visible}
                        onClick={(e) => {
                            e.preventDefault();
                            this.setState({
                                language_item_visible: true,
                            });
                        }}
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
                                data="img/logo-steem.svg"
                                type="image/svg+xml"
                                id="logo"
                                aria-label="logo"
                            />
                            {step !== 'finish' && (
                                // step !== 'checkYourEmail' &&
                                <div className="Signup__steps">
                                    <div
                                        className={`Signup__steps-step ${
                                            stepNumber === 0 ? 'waiting' : ''
                                        } ${stepNumber > 0 ? 'processed' : ''}`}
                                    />
                                    <div
                                        className={`Signup__steps-step ${
                                            stepNumber === 1 ? 'waiting' : ''
                                        } ${stepNumber > 1 ? 'processed' : ''}`}
                                    />
                                    <div
                                        className={`Signup__steps-step ${
                                            stepNumber === 2 ? 'waiting' : ''
                                        } ${stepNumber > 2 ? 'processed' : ''}`}
                                    />
                                    <div
                                        className={`Signup__steps-step ${
                                            stepNumber === 3 ? 'waiting' : ''
                                        } ${stepNumber > 3 ? 'processed' : ''}`}
                                    />
                                    {/* <div
                                            className={`Signup__steps-step ${
                                                stepNumber === 4
                                                    ? 'waiting'
                                                    : ''
                                            } ${
                                                stepNumber > 4
                                                    ? 'processed'
                                                    : ''
                                            }`}
                                        /> */}
                                </div>
                            )}
                        </div>

                        {step === 'signupOptions' && (
                            <div>
                                {referrer === 'steemit' && (
                                    <object
                                        data="img/steemit-logo.svg"
                                        type="image/svg+xml"
                                        id="app-logo"
                                        aria-label="logo"
                                    />
                                )}
                                <SignupOptions
                                    signupModalVisible={signupModalVisible}
                                    hideSignupModal={hideSignupModal}
                                    showSignupModal={showSignupModal}
                                    handleFreeSignup={this.handleFreeSignup}
                                    logCheckpoint={logCheckpoint}
                                    referrer={referrer || undefined}
                                    pending_claimed_accounts={
                                        this.state.pending_claimed_accounts
                                    }
                                />
                            </div>
                        )}
                        {step === 'signupInfo' && (
                            <div>
                                {referrer === 'steemit' && (
                                    <object
                                        data="img/steemit-logo.svg"
                                        type="image/svg+xml"
                                        id="app-logo"
                                        aria-label="logo"
                                    />
                                )}
                                <FormSignupUserInfo
                                    origin={currentReferrer}
                                    countryCode={countryCode}
                                    locale={locale}
                                    handleSubmitUserInfo={
                                        this.handleSubmitUserInfo
                                    }
                                />
                                {/* <h1>
                                    <FormattedMessage id="save_password" />
                                </h1>
                                <p className="text">
                                    <FormattedMessage id="save_password_text" />
                                </p>
                                <SavePassword
                                    password="asjdhfafdakjshfdjashdfkjashdjkfhaskjhdfkashflsdf"
                                    handleSavePassword={this.handleSavePassword}/> */}
                            </div>
                        )}
                        {step === 'savePassword' && (
                            <div>
                                {referrer === 'steemit' && (
                                    <object
                                        data="img/steemit-logo.svg"
                                        type="image/svg+xml"
                                        id="app-logo"
                                        aria-label="logo"
                                    />
                                )}
                                <h1>
                                    <FormattedMessage id="save_password" />
                                </h1>
                                <p className="text" style={{marginBottom: '16px'}}>
                                    <FormattedMessage id="save_password_text" />
                                </p>
                                <SavePassword
                                    password={this.state.password}
                                    handleSavePassword={this.handleSavePassword}
                                />
                            </div>
                        )}
                        {step === 'createAccount' && (
                            <div>
                                {referrer === 'steemit' && (
                                    <object
                                        data="img/steemit-logo.svg"
                                        type="image/svg+xml"
                                        id="app-logo"
                                        aria-label="logo"
                                    />
                                )}
                                <h1>
                                    <FormattedMessage id="confirmPassword" />
                                </h1>
                                <p className="text">
                                    <FormattedMessage id="confirm_password" />
                                </p>
                                <p className="text" style={{
                                    marginBottom: '0.875rem',
                                }}>
                                    <FormattedMessage id="master_password" />
                                </p>
                                <CreateAccount
                                    goBack={this.goBack}
                                    username={username}
                                    email={email}
                                    phoneNumber={phoneNumber}
                                    token={token}
                                    password={this.state.password}
                                    locale={locale}
                                    handleCreateAccount={
                                        this.handleCreateAccount
                                    }
                                    trackingId={trackingId}
                                    app={this.props.app}
                                />
                            </div>
                        )}
                        {step === 'username' && (
                            <div className="form-content">
                                {referrer === 'steemit' && (
                                    <object
                                        data="img/steemit-logo.svg"
                                        type="image/svg+xml"
                                        id="app-logo"
                                        aria-label="logo"
                                    />
                                )}
                                <h1>
                                    <FormattedMessage id="get_started" />
                                </h1>
                                <p>
                                    {referrer === 'steemit' && (
                                        <FormattedMessage id="username_know_steemit" />
                                    )}
                                    {referrer !== 'steemit' && (
                                        <FormattedMessage id="username_know" />
                                    )}
                                </p>
                                <FormSignupUsername
                                    onSubmit={this.handleSubmitUsername}
                                    username={currentUsername}
                                    email={currentEmail}
                                    origin={currentReferrer}
                                />
                            </div>
                        )}
                        {step === 'email' && (
                            <div className="form-content two-actions">
                                <h1>
                                    <FormattedMessage id="enter_email" />
                                </h1>
                                <p>
                                    <FormattedMessage id="confirm_existence" />
                                </p>
                                {countryCode !== 'CN' && (
                                    <FormSignupEmail
                                        onSubmit={this.handleSubmitEmail}
                                        username={currentUsername}
                                        email={currentEmail}
                                        goBack={this.goBack}
                                        trackingId={trackingId}
                                    />
                                )}
                                {countryCode === 'CN' && (
                                    <FormSignupEmailChinese
                                        onSubmit={this.handleSubmitEmail}
                                        username={currentUsername}
                                        email={currentEmail}
                                        goBack={this.goBack}
                                        trackingId={trackingId}
                                    />
                                )}
                            </div>
                        )}
                        {step === 'phoneNumber' && (
                            <div className="form-content two-actions">
                                <h1>
                                    <FormattedMessage id="enter_phone" />
                                </h1>
                                <p>
                                    <FormattedMessage id="send_sms" />
                                </p>
                                <FormSignupPhoneNumber
                                    onSubmit={this.handleSubmitPhoneNumber}
                                    token={currentToken}
                                    countryCode={countryCode}
                                    prefix={prefix}
                                    phoneNumber={phoneNumber}
                                />
                            </div>
                        )}
                        {step === 'confirmPhoneNumber' && (
                            <div className="form-content two-actions">
                                <h1>
                                    <FormattedMessage id="enter_confirmation_code" />
                                </h1>
                                <p>
                                    <FormattedMessage
                                        id="sms_code"
                                        values={{
                                            phoneNumber: phoneNumberFormatted,
                                            editLink: (
                                                <a
                                                    href={undefined}
                                                    onClick={() =>
                                                        this.setState({
                                                            step: 'phoneNumber',
                                                            stepNumber: 2,
                                                        })
                                                    }
                                                >
                                                    <FormattedMessage id="edit" />
                                                </a>
                                            ),
                                        }}
                                    />
                                    <br />
                                    <FormattedMessage id="please_confirm" />
                                </p>
                                <FormSignupConfirmPhoneNumber
                                    onSubmit={
                                        this.handleSubmitConfirmPhoneNumber
                                    }
                                    token={currentToken}
                                    phoneNumber={phoneNumber}
                                    prefix={prefix}
                                    goBack={this.goBack}
                                />
                            </div>
                        )}
                        {step === 'checkYourEmail' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="almost_there_email" />
                                </h1>
                                <p>
                                    <FormattedMessage id="finish_text_3" />
                                </p>
                            </div>
                        )}
                        {step === 'finish' && (
                            <div className="form-content">
                                <h1>
                                    <FormattedMessage id="welcome_page_title" />{' '}
                                    {username}
                                </h1>
                                <div
                                    style={{
                                        marginTop: '3.2px',
                                    }}
                                >
                                    <FormattedMessage id="welcome_page_message_1" />
                                </div>
                                <div
                                    style={{
                                        marginTop: '50px',
                                    }}
                                >
                                    <Button
                                        className="custom-btn"
                                        style={{ width: '100%' }}
                                        type="primary"
                                        size="large"
                                        onClick={() => {
                                            window.location =
                                                `https://steemitwallet.com/@${username}/permissions`;
                                        }}
                                    >
                                        <FormattedMessage id="welcome_page_go_to_wallet" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        className={`Signup__icons ${
                            step === 'signupOptions' ? 'username-icons' : ''
                        }`}
                    >
                        {step === 'signupOptions' && (
                            <div>
                                <h3>
                                    <FormattedMessage id="signup_username_right_title" />
                                </h3>
                                <p
                                    style={{
                                        fontSize: '18px',
                                        color: '#ABABAB',
                                    }}
                                >
                                    <FormattedMessage id="signup_username_right_text" />
                                </p>
                            </div>
                        )}
                        {step === 'signupInfo' && (
                            <img
                                src="/img/signup-options.svg"
                                id="signup-options"
                                aria-label="signup-options"
                                alt="signup-options"
                            />
                        )}
                        {step === 'signupOptions' && (
                            <img
                                src="/img/signup-username.png"
                                id="signup-username"
                                aria-label="signup-username"
                                alt="signup-username"
                            />
                        )}
                        {step === 'email' && (
                            <object
                                data="img/signup-email.svg"
                                type="image/svg+xml"
                                id="signup-email"
                                aria-label="signup-email"
                            />
                        )}
                        {step === 'checkYourEmail' && (
                            <object
                                data="img/signup-email.svg"
                                type="image/svg+xml"
                                id="signup-email"
                                aria-label="signup-email"
                            />
                        )}
                        {step === 'phoneNumber' && (
                            <object
                                data="img/signup-phone.svg"
                                type="image/svg+xml"
                                id="signup-phone"
                                aria-label="signup-phone"
                            />
                        )}
                        {step === 'confirmPhoneNumber' && (
                            <object
                                data="img/signup-sms.svg"
                                type="image/svg+xml"
                                id="signup-sms"
                                aria-label="signup-sms"
                            />
                        )}
                        {(step === 'savePassword' ||
                            step === 'createAccount') && (
                            <object
                                data="img/signup-password.svg"
                                type="image/svg+xml"
                                id="signup-password"
                                aria-label="signup-password"
                            />
                        )}
                        {step === 'finish' && (
                            <object
                                data="img/signup-email-confirmation.svg"
                                type="image/svg+xml"
                                id="signup-email-confirmation"
                                aria-label="signup-email-confirmation"
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }
}

export default Signup;
