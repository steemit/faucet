/**
 * Provides a JSON blob containing any environment variables
 * which are required on the client side.
 *
 * @return string JSON config blob
 */
function getClientConfig() {
    const envVars = [
        'RECAPTCHA_SITE_KEY',
        'STEEMJS_URL',
        'DEFAULT_REDIRECT_URI',
        'SIFTSCIENCE_JS_SNIPPET_KEY',
        'REACT_DISABLE_ACCOUNT_CREATION',
        'RECAPTCHA_SWITCH',
        'PENDING_CLAIMED_ACCOUNTS_THRESHOLD',
        'CREATOR_INFO',
        'GOOGLE_ANALYTICS_ID',
    ];

    return JSON.stringify(
        envVars.reduce((config, prop) => {
            if (typeof process.env[prop] !== 'string') {
                throw new Error(
                    `Missing required environment variable: ${prop}`
                );
            }

            return {
                ...config,
                [prop]: process.env[prop],
            };
        }, {})
    );
}

module.exports = getClientConfig;
