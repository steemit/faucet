/* eslint-disable react/prop-types */
import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { message, Button } from 'antd';
import { key_utils } from '@steemit/steem-js/lib/auth/ecc';
import { CopyToClipboard } from 'react-copy-to-clipboard';

class SavePassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            password: '',
            isClickedCopyBtn: false,
        };
    }

    componentWillMount() {
        if (this.props.password === '') {
            this.generateWif(true);
        } else {
            this.setState({
                password: this.props.password,
            });
        }
    }

    generateWif = (isFirstTrigger) => {
        const newWif = `P${key_utils.get_random_key().toWif()}`;
        if (isFirstTrigger) {
            this.setState({
                password: newWif,
            });
        } else {
            this.setState({
                password: newWif,
                isClickedCopyBtn: false,
            });
        }
    };

    copySuccess = () => {
        const { intl } = this.props;
        this.setState({
            isClickedCopyBtn: true,
        });
        message.success(intl.formatMessage({ id: 'password_copied' }));
    };

    render() {
        const { handleSavePassword } = this.props;
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
                <Button onClick={() => this.generateWif(false)}>
                    <FormattedMessage id="generate_new_password" />
                </Button>
                <Button
                    type="primary"
                    onClick={() => handleSavePassword(this.state.password)}
                    disabled={!this.state.isClickedCopyBtn}
                >
                    <FormattedMessage id="continue" />
                </Button>
            </div>
        );
    }
}

export default injectIntl(SavePassword);
