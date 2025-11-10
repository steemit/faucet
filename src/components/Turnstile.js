import React from 'react';
import PropTypes from 'prop-types';

class Turnstile extends React.Component {
    constructor(props) {
        super(props);
        this.turnstileRef = null;
        this.widgetId = null;
        this.scriptLoaded = false;
    }

    componentDidMount() {
        this.loadScript();
    }

    componentWillUnmount() {
        if (window.turnstile && this.widgetId !== null) {
            window.turnstile.remove(this.widgetId);
        }
    }

    loadScript() {
        if (
            this.scriptLoaded ||
            document.getElementById('cf-turnstile-script')
        ) {
            this.initTurnstile();
            return;
        }

        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.scriptLoaded = true;
            this.initTurnstile();
        };
        document.body.appendChild(script);
    }

    initTurnstile() {
        if (!window.turnstile || !this.turnstileRef) {
            return;
        }

        const { sitekey, onSuccess, onError, language } = this.props;

        this.widgetId = window.turnstile.render(this.turnstileRef, {
            sitekey,
            callback: token => {
                if (onSuccess) {
                    onSuccess(token);
                }
            },
            'error-callback': () => {
                if (onError) {
                    onError();
                }
            },
            language: language || 'auto',
        });
    }

    reset() {
        if (window.turnstile && this.widgetId !== null) {
            window.turnstile.reset(this.widgetId);
        }
    }

    render() {
        return (
            <div
                ref={el => {
                    this.turnstileRef = el;
                }}
            />
        );
    }
}

Turnstile.propTypes = {
    sitekey: PropTypes.string.isRequired,
    onSuccess: PropTypes.func,
    onError: PropTypes.func,
    language: PropTypes.string,
};

export default Turnstile;
