import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button, Modal, Icon } from 'antd';
import { CHECKPOINTS } from '../../../../constants';
import updateAnalytics from '../../../../helpers/analytics';
import './SignupOptions.less';

const SignupOptions = ({
    signupModalVisible,
    hideSignupModal,
    // showSignupModal,
    handleFreeSignup,
    logCheckpoint,
    pending_claimed_accounts,
}) => {
    const modalTitle = <FormattedMessage id="signup_options_modal_title" />;

    const capitalizeFirstLetter = string =>
        string.charAt(0).toUpperCase() + string.slice(1);

    // const actionWithLog = (action, loggerFn, actionName) => () => {
    //     loggerFn(actionName);
    //     action();
    // };

    return (
        <div className="signup_options_wrap">
            <h1>
                <FormattedMessage id="signup_options" />
            </h1>
            {/* <p>
                {referrer && (
                    <FormattedMessage
                        id="signup_options_referrer"
                        values={{ referrer: capitalizeFirstLetter(referrer) }}
                    />
                )}
            </p> */}
            <p>
                <FormattedMessage
                    id="signup_options_referrer"
                    values={{ referrer: capitalizeFirstLetter('steemit') }}
                />
            </p>
            <p>
                <FormattedMessage id="signup_options_body_1" />
            </p>
            {/* <p>
                <FormattedMessage id="signup_options_body_3" />
            </p> */}

            <div className="signup-options__buttons">
                <div>
                    <img src="img/free.png" alt="" />
                    <div>
                        <p>
                            <FormattedMessage id="signup_free_tip1" />
                        </p>
                        <p>
                            <FormattedMessage id="signup_free_tip2" />
                        </p>
                    </div>
                    <Button
                        type={`${pending_claimed_accounts >= 100 && 'primary'}`}
                        htmlType="button"
                        onClick={handleFreeSignup}
                        disabled={pending_claimed_accounts < 100}
                    >
                        <FormattedMessage id="signup_options_button_free" />
                        {pending_claimed_accounts < 100 && (
                            <span>
                                <br />
                                <span className="btn-caveat">
                                    Insufficient Places
                                    {/* <FormattedMessage id="signup_options_button_free_caveat" /> */}
                                </span>
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <Modal
                title={modalTitle}
                visible={signupModalVisible}
                onCancel={hideSignupModal}
                footer={null}
            >
                <a
                    className="external-link"
                    href="https://steemwallet.app"
                    onClick={() => {
                        updateAnalytics(1);
                        logCheckpoint(
                            CHECKPOINTS.paid_signup_clicked_steemwalletapp
                        );
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <Button type="primary" ghost htmlType="button">
                        SteemWallet.app
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_steemwalletapp" />
                </p>
                <a
                    className="external-link"
                    href="https://anon.steem.network/"
                    onClick={() => {
                        updateAnalytics(2);
                        logCheckpoint(
                            CHECKPOINTS.paid_signup_clicked_anonsteem
                        );
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <Button type="primary" ghost htmlType="button">
                        AnonSteem
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_anonsteem" />
                </p>
                <a
                    className="external-link"
                    href="https://account.buildteam.io/apps/steem-account"
                    onClick={() => {
                        updateAnalytics(3);
                        logCheckpoint(
                            CHECKPOINTS.paid_signup_clicked_buildteam
                        );
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <Button type="primary" ghost htmlType="button">
                        BuildTeam
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_buildteam" />
                </p>
                <a
                    className="external-link"
                    href="https://widget.steem.ninja/widget.html"
                    onClick={() => {
                        updateAnalytics(4);
                        logCheckpoint(
                            CHECKPOINTS.paid_signup_clicked_steemninja
                        );
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <Button type="primary" ghost htmlType="button">
                        Steem.Ninja
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_steemninja" />
                </p>
                <a
                    className="external-link"
                    href="https://actifit.io/signup"
                    onClick={() => {
                        updateAnalytics(5);
                        logCheckpoint(CHECKPOINTS.paid_signup_clicked_actifit);
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <Button type="primary" ghost htmlType="button">
                        Actifit
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_actifit" />
                </p>
                {/* <a
                    className="external-link"
                    href="https://blocktrades.us/create-steem-account"
                    onClick={() => {
                        logCheckpoint(
                            CHECKPOINTS.paid_signup_clicked_blocktrades
                        );
                    }}
                >
                    <Button type="primary" ghost htmlType="button">
                        Blocktrades
                        <Icon type="link" />
                    </Button>
                </a>
                <p>
                    <FormattedMessage id="signup_options_blocktrades" />
                </p> */}

                <hr />
                <p className="modal-disclaimer">
                    <FormattedMessage id="signup_options_disclaimer" />
                </p>
            </Modal>
        </div>
    );
};

SignupOptions.propTypes = {
    signupModalVisible: PropTypes.bool.isRequired,
    hideSignupModal: PropTypes.func.isRequired,
    // showSignupModal: PropTypes.func.isRequired,
    handleFreeSignup: PropTypes.func.isRequired,
    logCheckpoint: PropTypes.func.isRequired,
    // referrer: PropTypes.string,
    pending_claimed_accounts: PropTypes.number,
};

SignupOptions.defaultProps = {
    // referrer: 'steemit',
    pending_claimed_accounts: 0,
};

export default SignupOptions;
