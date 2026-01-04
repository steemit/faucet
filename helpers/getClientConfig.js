import { getEnv } from './common.js';
/**
 * Provides a JSON blob containing any environment variables
 * which are required on the client side.
 *
 * @return string JSON config blob
 */
function getClientConfig() {
  const envVars = [
    'TURNSTILE_SWITCH',
    'TURNSTILE_SITE_KEY',
    'STEEMJS_URL',
    'DEFAULT_REDIRECT_URI',
    'SIFTSCIENCE_JS_SNIPPET_KEY',
    'REACT_DISABLE_ACCOUNT_CREATION',
    'PENDING_CLAIMED_ACCOUNTS_THRESHOLD',
    'CREATOR_INFO',
    'GOOGLE_ANALYTICS_ID',
  ];

  return JSON.stringify(
    envVars.reduce((config, prop) => {
      if (typeof getEnv(prop) !== 'string') {
        throw new Error(`Missing required environment variable: ${prop}`);
      }

      return {
        ...config,
        [prop]: getEnv(prop),
      };
    }, {})
  );
}

export default getClientConfig;
