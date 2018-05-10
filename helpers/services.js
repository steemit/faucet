/**
 * Service helpers, any external call is made through one of these.
 * This allows us to test the signup process without having the full stack setup.
 *
 * All service helpers should use a mock variant if the DEBUG_MODE env var is set.
 */

const fetch = require('isomorphic-fetch');
const steem = require('@steemit/steem-js');
const geoip = require('../helpers/maxmind');
const { checkpoints } = require('../constants');

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
        logger.warn('Verify signup for %s', user.id);
    }
    // TODO: call out to gatekeeper when launched
    return 'manual_review';
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

/**
 * Constructs an InfluxDB query to get faucet data for each funnel step.
 *
 * @param {string} dateFrom RFC3339 UTC
 * @param {string} dateTo RFC3339 UTC
 * @returns {string} InfluxDB query
 */
const buildFaucetInfluxQuery = (dateFrom, dateTo) =>
    checkpoints
        .reduce(
            (acc, cur) => [
                ...acc,
                encodeURIComponent(
                    `SELECT COUNT("step") AS "${
                        cur.symbol
                    }" FROM "overseer"."autogen"."signup" WHERE time >= '${dateFrom}' AND time <= '${dateTo}' AND "step"='${
                        cur.symbol
                    }'; `
                ),
            ],
            []
        )
        .join('');

/**
 * Retrieves signup data from InfluxDB and formats for use in the dashboard.
 * Returns an array where each element includes:
 *  - a human-readable label `human`,
 *  - `symbol`, the db column name that matches the frontend step constants,
 *  - `count`
 *  - `percent` calculated by dividing the total signup events for this period by this event
 *
 * @param {Date} dateFrom RFC3339 UTC
 * @param {Date} dateTo RFC3339 UTC
 * @return {Array}
 */
async function getOverseerStats(dateFrom, dateTo) {
    const response = await (await fetch(
        `${process.env.INFLUXDB_URL}/query?db=overseer`,
        {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded',
            }),
            body: `q=${buildFaucetInfluxQuery(dateFrom, dateTo)}`,
        }
    )).json();
    if (!response.results) {
        throw new Error('influxdb query error');
    }

    let mappedResults;
    try {
        mappedResults = response.results.reduce(
            (acc, cur) => ({
                ...acc,
                [cur.series[0].columns[1]]: cur.series[0].values[0][1] || null,
            }),
            {}
        );
    } catch (error) {
        throw new Error('influxdb data error');
    }

    if (typeof mappedResults.signup_start !== 'number') {
        throw new Error('missing signup_start value in influx stats');
    }

    return checkpoints.reduce(
        (acc, cur) => [
            ...acc,
            {
                ...cur,
                count: mappedResults[cur.symbol],
                percent: parseInt(
                    mappedResults[cur.symbol] /
                        mappedResults.signup_start *
                        100,
                    10
                ),
            },
        ],
        []
    );
}

module.exports = {
    checkUsername,
    classifySignup,
    condenserTransfer,
    conveyorCall,
    createAccount,
    sendEmail,
    sendSMS,
    validatePhone,
    verifyCaptcha,
    recaptchaRequiredForIp,
    locationFromIp,
    getOverseerStats,
};
