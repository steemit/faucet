/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import ReCAPTCHA from 'react-google-recaptcha';
import { message, Button } from 'antd';
import apiCall from '../../../utils/api';
import Loading from '../../../widgets/Loading';
import { CopyToClipboard } from 'react-copy-to-clipboard';

class SavePassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    copySuccess = () => {
        const { intl } = this.props;
        message.success(intl.formatMessage({ id: 'password_copied' }));
    };

    render() {
        const { password, handleSavePassword } = this.props;
        return (
            <div className="save-password-wrap">
                <div className="password-wrap">{password}</div>
                <CopyToClipboard text={password} onCopy={this.copySuccess}>
                    <Button>
                        <FormattedMessage id="copy_password" />
                    </Button>
                </CopyToClipboard>
                <Button>
                    <FormattedMessage id="generate_new_password" />
                </Button>
                <Button type="primary" onClick={handleSavePassword}>
                    <FormattedMessage id="continue" />
                </Button>
            </div>
        );
    }
}

export default injectIntl(SavePassword);
