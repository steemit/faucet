import React, { Component, PropTypes } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Button, Form, Icon, Popover } from 'antd';
import LanguageItem from './LanguageItem';
import locales from '../../helpers/locales.json';

class Welcome extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentWillMount() {}

    render() {
        const { username, locale, setLocale } = this.props;
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
                                data="img/logo-steem.svg"
                                type="image/svg+xml"
                                id="logo"
                                aria-label="logo"
                            />
                        </div>
                        <div className="form-content welcome-wrap">
                            <h1>
                                <FormattedMessage id="welcome" /> {username}
                            </h1>
                            <p>
                                <FormattedMessage id="enjoy_steem" />
                            </p>
                            <Form.Item>
                                <a
                                    href="https://steemitwallet.com/"
                                    className="welcome-btn"
                                >
                                    <FormattedMessage id="redirect_button_text" />
                                </a>
                            </Form.Item>
                        </div>
                    </div>
                    <div className="Signup__icons">
                        <object
                            data="img/signup-create-account.svg"
                            type="image/svg+xml"
                            id="signup-create-account"
                            aria-label="signup-create-account"
                        />
                    </div>
                </div>
            </div>
        );
    }
}

Welcome.propTypes = {
    username: PropTypes.string.isRequired,
    locale: PropTypes.string.isRequired,
    setLocale: PropTypes.func.isRequired,
};

export default injectIntl(Welcome);
