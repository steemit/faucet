/**
 * Service helpers, any external call is made through one of these.
 * This allows us to test the signup process without having the full stack setup.
 *
 * All service helpers should use a mock variant if the DEBUG_MODE env var is set.
 */

const fetch = require('isomorphic-fetch');
const steem = require('@steemit/steem-js');
const geoip = require('../helpers/maxmind');

const DEBUG_MODE = process.env.DEBUG_MODE !== undefined;

const logger = require('./logger').child({ DEBUG_MODE });

function getEnv(key) {
    if (!DEBUG_MODE && !process.env[key]) {
        throw new Error(`Missing ${key} env var`);
    }
    return process.env[key];
}

let mail;
let twilio;
if (!DEBUG_MODE) {
    mail = require('./mail');
    twilio = require('./twilio');
} else {
    logger.warn('!! Running in debug mode !!');
}

const condenserSecret = getEnv('CREATE_USER_SECRET');
const condenserUrl = getEnv('CREATE_USER_URL');
const conveyorAccount = getEnv('CONVEYOR_USERNAME');
const conveyorKey = getEnv('CONVEYOR_POSTING_WIF');
const createAccountDelegation = getEnv('CREATE_ACCOUNT_DELEGATION');
const createAccountDelegator = getEnv('DELEGATOR_USERNAME');
const createAccountFee = getEnv('CREATE_ACCOUNT_FEE');
const createAccountWif = getEnv('DELEGATOR_ACTIVE_WIF');
const recaptchaSecret = getEnv('RECAPTCHA_SECRET');

const rpcNode = getEnv('STEEMJS_URL');
if (rpcNode) {
    steem.api.setOptions({ url: rpcNode });
}

/**
 * Send a SMS.
 * @param to Message recipient, e.g. +1234567890.
 * @param body Message body.
 */
async function sendSMS(to, body) {
    if (DEBUG_MODE) {
        logger.warn('Send SMS to %s with body: %s', to, body);
    } else {
        return twilio.sendMessage(to, body);
    }
}

/**
 * Validate phone number.
 * @param number Number to validate, e.g. +1234567890.
 */
async function validatePhone(number) {
    if (DEBUG_MODE) {
        logger.warn('Validate %s', number);
    } else {
        return twilio.isValidNumber(number);
    }
}

/**
 * Send an email.
 * @param to Message recipient, e.g. foo@example.com.
 * @param template Template to use, e.g. `account_reminder`.
 * @param context (optional) Template variables as key value pair.
 */
async function sendEmail(to, template, context) {
    if (DEBUG_MODE) {
        logger.warn(
            { mailCtx: context },
            'Send Email to %s using template %s',
            to,
            template
        );
    } else {
        return mail.send(to, template, context);
    }
}

/**
 * Send out the approval email.
 * @param to Email to send approval token to.
 * @param baseUrl Url where application is served.
 */
async function sendApprovalEmail(to, baseUrl) {
    const mailToken = jwt.sign(
        {
            type: 'create_account',
            email: to,
        },
        process.env.JWT_SECRET
    );
    await sendEmail(to, 'create_account', {
        url: `${baseUrl}/create-account?token=${mailToken}`,
    });
}

/**
 * Call conveyor method.
 * @param method Method name of method to be called, without prefix e.g. `is_phone_registered`.
 * @param params (optional) Parameters for the call.
 */
async function conveyorCall(method, params) {
    if (DEBUG_MODE) {
        logger.warn({ callParams: params }, 'Conveyor call %s', method);
        switch (method) {
            case 'is_email_registered':
                return (params.email || params[0]) === 'taken@steemit.com';
            case 'is_phone_registered':
                return (params.phone || params[0]) === '+12345678900';
            case 'set_user_data':
                return;
            default:
                throw new Error(`No mock implementation for ${method}`);
        }
    } else {
        return steem.api.signedCallAsync(
            `conveyor.${method}`,
            params,
            conveyorAccount,
            conveyorKey
        );
    }
}

/**
 * Verify Google recaptcha.
 * @param recaptcha Challenge.
 * @param ip Remote addr of client.
 */
async function verifyCaptcha(recaptcha, ip) {
    if (DEBUG_MODE) {
        logger.warn('Verify captcha for %s', ip);
    } else {
        const url = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptcha}&remoteip=${ip}`;
        const response = await (await fetch(url)).json();
        if (!response.success) {
            const codes = response['error-codes'] || ['unknown'];
            throw new Error(`Captcha verification failed: ${codes.join()}`);
        }
    }
}

/**
 * Create new steem account.
 * @param payload Account create with delegation operation.
 */
async function createAccount(payload) {
    if (DEBUG_MODE) {
        logger.warn({ accountPayload: payload }, 'Creating new account');
    } else {
        return steem.broadcast.accountCreateWithDelegationAsync(
            createAccountWif,
            createAccountFee,
            createAccountDelegation,
            createAccountDelegator,
            payload.username,
            payload.owner,
            payload.active,
            payload.posting,
            payload.memoKey,
            payload.metadata,
            []
        );
    }
}

/**
 * Check if username is taken on chain.
 * @param username Username to check if available.
 */
async function checkUsername(username) {
    if (DEBUG_MODE) {
        logger.warn('Check username %s', username);
        return username === 'taken';
    }
    // TODO: this could use lookup_accounts which is less heavy on our rpc nodes
    const [account] = await steem.api.getAccountsAsync([username]);
    return !!account;
}

/**
 * Call out to gatekeeper to check for approval status.
 * @param user User (aka Signup) instance to check
 */
async function classifySignup(user) {
    if (DEBUG_MODE) {
        logger.warn('Classify signup for %s as manual_review', user.id)
        return {status: 'manual_review', note: 'DEBUG MODE'}
    }
    const metadata = {
        browser_date: user.fingerprint.date,
        browser_lang: user.fingerprint.lang,
        browser_ref: user.fingerprint.ref,
        email: user.email,
        phone_number: user.phone_number,
        remote_addr: user.ip,
        user_agent: user.fingerprint.ua,
        username: user.username,
    }
    const device = user.fingerprint.device
    if (device && device.renderer && device.vendor) {
        metadata.browser_gpu = `${ device.vendor } ${ device.renderer }`
    }
    return steem.api.signedCallAsync(
        'gatekeeper.check',
        {metadata},
        conveyorAccount,
        conveyorKey,
    )
}

/**
 * Transfer account data to old recovery system.
 * @param username Username to check if available.
 */
async function condenserTransfer(email, username, ownerKey) {
    if (DEBUG_MODE) {
        logger.warn('Transfer data for %s to conveyor', username);
    } else {
        const req = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                name: username,
                owner_key: ownerKey,
                secret: condenserSecret,
            }),
        };
        const res = await fetch(condenserUrl, req);
        if (res.status !== 200) {
            throw new Error(`HTTP ${res.status}`);
        }
    }
}

/**
 * Get location information for an IP.
 *
 * @param {string} ip ip address
 * @return {object} maxmind location data
 */
function locationFromIp(ip) {
    return geoip.get(ip);
}

/**
 * Should recaptcha be required for this IP address?
 *
 * @param {string} ip ip address
 * @return {boolean}
 */
function recaptchaRequiredForIp(ip) {
    const location = locationFromIp(ip);
    return location && location.country && location.country.iso_code !== 'CN';
}

module.exports = {
    checkUsername,
    classifySignup,
    condenserTransfer,
    conveyorCall,
    createAccount,
    locationFromIp,
    recaptchaRequiredForIp,
    sendApprovalEmail,
    sendEmail,
    sendSMS,
    validatePhone,
    verifyCaptcha,
};
