import React, { PropTypes } from 'react';
import { injectIntl } from 'react-intl';

class Turnstile extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.divRef = null;
    }

    componentDidMount() {
        const {
            siteKey,
            options,
            onSuccess,
            onExpire,
            onError,
            onTimeout,
            responseField,
            responseFieldName,
            action,
        } = this.props;
        window.turnstile.render(this.divRef, {
            action,
            sitekey: siteKey,
            language: options.language,
            size: options.size,
            theme: options.theme,
            callback: onSuccess,
            'expired-callback': onExpire,
            'error-callback': onError,
            'timeout-callback': onTimeout,
            'response-field': responseField,
            'response-field-name': responseFieldName,
        });
    }

    render() {
        return (
            <div
                ref={div => {
                    this.divRef = div;
                }}
            />
        );
    }
}

Turnstile.propTypes = {
    siteKey: PropTypes.string.isRequired,
    options: PropTypes.shape({
        language: PropTypes.string.isRequired,
        size: PropTypes.string.isRequired,
        theme: PropTypes.string.isRequired,
    }).isRequired,
    onSuccess: PropTypes.func.isRequired,
    onExpire: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    onTimeout: PropTypes.func.isRequired,
    responseField: PropTypes.bool,
    responseFieldName: PropTypes.string,
    action: PropTypes.string.isRequired,
};

Turnstile.defaultProps = {
    options: {
        language: 'en',
        size: 'flexible',
        theme: 'light',
    },
    responseField: false,
    responseFieldName: '',
};

export default injectIntl(Turnstile);
