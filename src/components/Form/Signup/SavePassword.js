/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { message, Button } from 'antd';
import {
    PrivateKey,
    PublicKey,
    key_utils,
} from '@steemit/steem-js/lib/auth/ecc';
import apiCall from '../../../utils/api';
import Loading from '../../../widgets/Loading';
import { CopyToClipboard } from 'react-copy-to-clipboard';

class SavePassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            password: '',
        };
    }

    componentWillMount() {
        if (this.props.password === '') {
            this.generateWif();
        } else {
            this.setState({
                password: this.props.password,
            });
        }
    }

    generateWif = () => {
        const newWif = 'P' + key_utils.get_random_key().toWif();
        this.setState({ password: newWif });
    };

    copySuccess = () => {
        const { intl } = this.props;
        message.success(intl.formatMessage({ id: 'password_copied' }));
    };

    render() {
        const { password, handleSavePassword } = this.props;
        return (
            <div className="save-password-wrap">
                <div className="password-wrap">{this.state.password}</div>
                <CopyToClipboard
                    text={this.state.password}
                    onCopy={this.copySuccess}
                >
                    <Button>
                        <FormattedMessage id="copy_password" />
                    </Button>
                </CopyToClipboard>
                <Button onClick={this.generateWif}>
                    <FormattedMessage id="generate_new_password" />
                </Button>
                <Button
                    type="primary"
                    onClick={() => handleSavePassword(this.state.password)}
                >
                    <FormattedMessage id="continue" />
                </Button>
            </div>
        );
    }
}

export default injectIntl(SavePassword);
