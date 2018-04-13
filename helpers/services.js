/**
 * Service helpers, any external call is made through one of these.
 * This allows us to test the signup process without having the full stack setup.
 *
 * All service helpers should use a mock variant if the DEBUG_MODE env var is set.
 */

const fetch = require('isomorphic-fetch')

const DEBUG_MODE = process.env.DEBUG_MODE !== undefined

const logger = require('./logger').child({DEBUG_MODE})

// load some helpers only if debug mode is off
// this is done so that the service can be run without api keys in debug mode
let twilio, mail, conveyorAccount, conveyorKey, recaptchaSecret, steem
if (!DEBUG_MODE) {
    twilio = require('./twilio')
    mail = require('./mail')
    if (!process.env.CONVEYOR_USERNAME) {
        throw new Error('Missing CONVEYOR_USERNAME env var')
    }
    conveyorAccount = process.env.CONVEYOR_USERNAME
    if (!process.env.CONVEYOR_POSTING_WIF) {
        throw new Error('Missing CONVEYOR_POSTING_WIF env var')
    }
    conveyorKey = process.env.CONVEYOR_POSTING_WIF
    if (!process.env.RECAPTCHA_SECRET) {
        throw new Error('Missing RECAPTCHA_SECRET env var')
    }
    recaptchaSecret = process.env.RECAPTCHA_SECRET
    steem = require('@steemit/steem-js')
    if (!process.env.STEEMJS_URL) {
        throw new Error('Missing STEEMJS_URL env var')
    }
    steem.api.setOptions({ url: process.env.STEEMJS_URL });
} else {
    logger.warn('!! Running in debug mode !!')
}

/**
 * Send a SMS.
 * @param to Message recipient, e.g. +1234567890.
 * @param body Message body.
 */
async function sendSMS(to, body) {
    if (DEBUG_MODE) {
        logger.warn('Send SMS to %s with body: %s', to, body)
    } else {
        return twilio.sendMessage(to, body)
    }
}

/**
 * Validate phone number.
 * @param number Number to validate, e.g. +1234567890.
 */
async function validatePhone(number) {
    if (DEBUG_MODE) {
        logger.warn('Validate %s', number)
    } else {
        return twilio.isValidNumber(number)
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
        logger.warn({mailCtx: context}, 'Send Email to %s using template %s', to, template)
    } else {
        return mail.send(to, template, context)
    }
}

/**
 * Call conveyor method.
 * @param method Method name of method to be called, without prefix e.g. `is_phone_registered`.
 * @param params (optional) Parameters for the call.
 */
async function conveyorCall(method, params) {
    if (DEBUG_MODE) {
        logger.warn({callParams: params}, 'Conveyor call %s', method)
        switch (method) {
            case 'is_phone_registered':
                return (params.email || params[0]) === 'taken@steemit.com'
            case 'is_phone_registered':
                return (params.phone || params[0]) === '+1234567890'
            case 'set_user_data':
                return
            default:
                throw new Error(`No mock implementation for ${ method }`)
        }
    } else {
        return steem.api.signedCallAsync(`conveyor.${ method }`, params, conveyorAccount, conveyorKey)
    }
}

/**
 * Verify Google recaptcha.
 * @param recaptcha Challenge.
 * @param ip Remote addr of client.
 */
async function verifyCaptcha(recaptcha, ip) {
    if (DEBUG_MODE) {
        logger.warn('Verify captcha for %s', ip)
    } else {
        const url = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptcha}&remoteip=${ip}`;
        const response = await (await fetch(url)).json();
        if (!response.success) {
            const codes = (response['error-codes'] || ['unknown']);
            throw new Error(`Captcha verification failed: ${codes.join()}`);
        }
    }
}


/**
 * Create new steem account.
 * @param payload Account create with delegation operation.
 */
async function createAccount(payload) {
    // TODO: verify payload
    if (DEBUG_MODE) {
        logger.warn({accountPayload: payload}, 'Creating new account')
    } else {
        return steem.broadcast.accountCreateWithDelegationAsync(
            process.env.DELEGATOR_ACTIVE_WIF, // TODO: verify existence of env vars on startup
            process.env.CREATE_ACCOUNT_FEE,
            process.env.CREATE_ACCOUNT_DELEGATION,
            process.env.DELEGATOR_USERNAME,
            payload.username,
            payload.owner,
            payload.active,
            payload.posting,
            payload.memoKey,
            payload.metadata,
            [],
        )
    }
}

/**
 * Check if username is taken on chain.
 * @param username Username to check if available.
 */
async function checkUsername(username) {
    if (DEBUG_MODE) {
        logger.warn('Check username %s', username)
        return (username === 'taken')
    } else {
        // TODO: this could use lookup_accounts which is less heavy on our rpc nodes
        const [account] = await steem.api.getAccountsAsync([username])
        return !!account
    }
}


/**
 * Call out to gatekeeper to check for approval status.
 * @param user User (aka Signup) instance to check
 */
async function classifySignup(user) {
    if (DEBUG_MODE) {
        logger.warn('Verify signup for %s', user.id)
    }
    // TODO: call out to gatekeeper when launched
    return 'manual_review'
}

/**
 * Transfer account data to old recovery system.
 * @param username Username to check if available.
 */
async function condenserTransfer(email, username, ownerKey) {
    if (DEBUG_MODE) {
        logger.warn('Transfer data for %s to conveyor', username)
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
                secret: process.env.CREATE_USER_SECRET, // TODO: verify existence on startup
            }),
        }
        const res = await fetch(req)
        if (res.status !== 200) {
            throw new Error(`HTTP ${ res.status }`)
        }
    }
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
};
