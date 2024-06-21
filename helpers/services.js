/**
 * Service helpers, any external call is made through one of these.
 * This allows us to test the signup process without having the full stack setup.
 *
 * All service helpers should use a mock variant if the DEBUG_MODE env var is set.
 */

const fetch = require('isomorphic-fetch');
const steem = require('@steemit/steem-js');
const geoip = require('../helpers/maxmind');
const jwt = require('jsonwebtoken');
const { checkpoints } = require('../constants');
const { api } = require('@steemit/steem-js');

const DEBUG_MODE = process.env.DEBUG_MODE !== undefined;
const PENDING_CLAIMED_ACCOUNTS_THRESHOLD = process.env
    .PENDING_CLAIMED_ACCOUNTS_THRESHOLD
    ? process.env.PENDING_CLAIMED_ACCOUNTS_THRESHOLD
    : 50;
const CREATOR_INFO = process.env.CREATOR_INFO ? process.env.CREATOR_INFO : '';

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
const recaptchaSecret = getEnv('RECAPTCHA_SECRET');
// const analyticsIpLimitTime = getEnv('ANALYTICS_IP_LIMIT_TIME');

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
 * Send a SMS Code.
 * @param to Message recipient, e.g. +1234567890.
 * @param client_ip the client ip, e.g. 1.1.1.1
 */
async function sendSMSCode(to, client_ip) {
    if (DEBUG_MODE) {
        logger.warn('Send SMS to %s, client_ip: %s', to, client_ip);
    } else {
        return twilio.sendAuthCode(to, client_ip);
    }
}

/**
 * Auth a SMS Code.
 * @param to Message recipient, e.g. +1234567890.
 * @param code Auth Code.
 */
async function authSMSCode(to, code) {
    if (DEBUG_MODE) {
        logger.warn('Send SMS to %s with code: %s', to, code);
        return true;
    }
    let result;
    try {
        result = await twilio.checkAuthCode(to, code);
        if (result.status === 'approved') {
            return true;
        }
    } catch (err) {
        logger.warn(
            '[Check Error]Phone %s with code %s, err: %s',
            to,
            code,
            JSON.stringify(err)
        );
        return false;
    }
    logger.warn(
        '[Check Error]Phone %s with code %s, result: %s',
        to,
        code,
        JSON.stringify(result)
    );
    return false;
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
        return steem.api.signedCallAsync(
            `kingdom.create_account`,
            payload,
            conveyorAccount,
            conveyorKey
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
 * Pulls out browser fingerprinting metadata from user data.
 *
 * @param {object} user sequelize model instance
 * @returns {object}
 */
function extractMetadataFromUser(user) {
    const metadata = {
        browser_date: user.fingerprint.date,
        browser_lang: user.fingerprint.lang,
        browser_ref: user.fingerprint.ref,
        email: user.email,
        id: String(user.id),
        phone_number: user.phone_number,
        remote_addr: user.ip,
        user_agent: user.fingerprint.ua,
        username: user.username,
    };

    const device = user.fingerprint.device;

    if (device && device.renderer && device.vendor) {
        metadata.browser_gpu = `${device.vendor} ${device.renderer}`;
    }

    return metadata;
}

/**
 * Call out to gatekeeper to check for approval status.
 * @param user User (aka Signup) instance to check
 */
async function gatekeeperCheck(user) {
    const metadata = extractMetadataFromUser(user);

    return steem.api.signedCallAsync(
        'gatekeeper.check',
        { metadata },
        conveyorAccount,
        conveyorKey
    );
}

/**
 * Retrieves signup data from Gatekeeper.
 *
 * @param {object} user sequelize model instance
 */
async function gatekeeperSignupGet(gatekeeperSignupId) {
    return steem.api.signedCallAsync(
        'gatekeeper.signup_get',
        { id: gatekeeperSignupId },
        conveyorAccount,
        conveyorKey
    );
}

/**
 * Asks Gatekeeper to record a signup.
 *
 * @param {object} user sequelize model instance
 */
async function gatekeeperSignupCreate(user) {
    return steem.api.signedCallAsync(
        'gatekeeper.signup_create',
        {
            ip: user.ip,
            username: user.username,
            email: user.email,
            phone: user.phone_number,
            meta: extractMetadataFromUser(user),
        },
        conveyorAccount,
        conveyorKey
    );
}

async function gatekeeperMarkSignupApproved(user, adminUsername) {
    return steem.api.signedCallAsync(
        'gatekeeper.signup_mark_approved',
        {
            id: user.gatekeeper_id,
            actor: adminUsername,
        },
        conveyorAccount,
        conveyorKey
    );
}

async function gatekeeperMarkSignupRejected(user, adminUsername) {
    return steem.api.signedCallAsync(
        'gatekeeper.signup_mark_rejected',
        {
            id: user.gatekeeper_id,
            actor: adminUsername,
        },
        conveyorAccount,
        conveyorKey
    );
}

async function gatekeeperMarkSignupCreated(user) {
    return steem.api.signedCallAsync(
        'gatekeeper.signup_mark_created',
        { id: user.gatekeeper_id },
        conveyorAccount,
        conveyorKey
    );
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
        mappedResults = response.results.reduce((acc, cur) => {
            if (cur.series[0]) {
                return {
                    ...acc,
                    [cur.series[0].columns[1]]:
                        cur.series[0].values[0][1] || null,
                };
            }
            return {
                ...acc,
            };
        }, {});
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

function recordActivityTracker({ trackingId, activityTag, username }) {
    const data = {
        measurement: 'activity_tracker',
        tags: {
            activityTag,
            appType: 'faucet',
        },
        fields: {
            reg: 1,
            trackingId,
            username,
        },
    };
    api.call('overseer.collect', ['custom', data], error => {
        if (error) {
            logger.error('activity_tracker_error', error);
        }
    });
}

function recordSmsTracker({ sendType, countryCode, phoneNumber }) {
    const data = {
        measurement: 'send_sms',
        tags: {
            sendType,
            countryCode,
        },
        fields: {
            phoneNumber,
        },
    };
    api.call('overseer.collect', ['custom', data], error => {
        if (error) {
            logger.error(
                'record_sms_tracker_error:',
                error,
                sendType,
                countryCode,
                phoneNumber
            );
        }
    });
}

function recordSource({ trackingId, app, from_page }) {
    const data = {
        measurement: 'signup_origin',
        tags: {
            app,
            from_page,
        },
        fields: {
            trackingId,
        },
    };
    api.call('overseer.collect', ['custom', data], error => {
        if (error) {
            logger.error('record_source_error', error, app, from_page);
        }
    });
}

async function getPendingClaimedAccountsAsync() {
    if (!CREATOR_INFO) {
        return false;
    }
    const accounts = CREATOR_INFO.split('|');
    if (accounts.length === 0) {
        return false;
    }
    return steem.api.getAccountsAsync(accounts).then(res => {
        if (res) {
            const claim_acconts = {};
            res.forEach(acc => {
                claim_acconts[acc.name] = acc.pending_claimed_accounts;
            });
            if (
                Math.max(...Object.values(claim_acconts)) >
                PENDING_CLAIMED_ACCOUNTS_THRESHOLD
            ) {
                return true;
            }
        }
        return false;
    });
}

async function createTwilioRateLimit() {
    if (DEBUG_MODE) {
        twilio = require('./twilio');
        return twilio.createTwilioRateLimit();
    }
    return {};
}

async function createTwilioRateLimitBucket() {
    if (DEBUG_MODE) {
        twilio = require('./twilio');
        return twilio.createTwilioRateLimitBucket();
    }
    return {};
}

async function updateTwilioRateLimitBucket() {
    if (DEBUG_MODE) {
        twilio = require('./twilio');
        return twilio.updateTwilioRateLimitBucket();
    }
    return {};
}

module.exports = {
    checkUsername,
    condenserTransfer,
    conveyorCall,
    createAccount,
    gatekeeperCheck,
    gatekeeperSignupGet,
    gatekeeperSignupCreate,
    gatekeeperMarkSignupApproved,
    gatekeeperMarkSignupRejected,
    gatekeeperMarkSignupCreated,
    getOverseerStats,
    locationFromIp,
    recaptchaRequiredForIp,
    sendApprovalEmail,
    sendEmail,
    sendSMS,
    sendSMSCode,
    authSMSCode,
    validatePhone,
    verifyCaptcha,
    recordActivityTracker,
    recordSmsTracker,
    recordSource,
    getPendingClaimedAccountsAsync,
    createTwilioRateLimit,
    createTwilioRateLimitBucket,
    updateTwilioRateLimitBucket,
};
