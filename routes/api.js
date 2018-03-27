const express = require('express');
const fetch = require('isomorphic-fetch');
const steem = require('@steemit/steem-js');
const { hash } = require('@steemit/steem-js/lib/auth/ecc');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const generateCode = require('../src/utils/phone-utils').generateCode;
const { checkStatus } = require('../src/utils/fetch');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const badDomains = require('../bad-domains');
const Twilio = require('../helpers/twilio');
const moment = require('moment');
const db = require('./../db/models');

const { Sequelize } = db;
const { Op } = Sequelize;

const conveyorAccount = process.env.CONVEYOR_USERNAME;
const conveyorKey = process.env.CONVEYOR_POSTING_WIF;

steem.api.setOptions({ url: process.env.STEEMJS_URL });

if (typeof process.env.CREATE_USER_URL !== 'string' || process.env.CREATE_USER_URL.length < 1) {
    throw new Error('Missing CREATE_USER_URL');
}
if (typeof process.env.CREATE_USER_SECRET !== 'string' || process.env.CREATE_USER_SECRET.length < 1) {
    throw new Error('Missing CREATE_USER_SECRET');
}

class ApiError extends Error {
    constructor({ type = 'error_api_general', field = 'general', status = 400, cause }) {
        super(`${field}:${type}`);
        this.type = type;
        this.field = field;
        this.status = status;
        this.cause = cause;
    }
    toJSON() {
        return { type: this.type, field: this.field };
    }
}

async function verifyCaptcha(recaptcha, ip) {
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptcha}&remoteip=${ip}`;
    const response = await (await fetch(url)).json();
    if (!response.success) {
        const codes = (response['error-codes'] || ['unknown']);
        throw new Error(`Captcha verification failed: ${codes.join()}`);
    }
}

/**
 * Throws if user or ip exceeds number of allowed actions within time period.
 */
async function actionLimit(ip, user_id = null) {
    const created_at = { [Op.gte]: moment().subtract(20, 'hours').toDate() };
    const promises = [db.actions.count({ where: { ip, created_at, action: { [Op.ne]: 'check_username' } } })];
    if (user_id) {
        promises.push(db.actions.count({ where: { user_id, created_at } }));
    }
    const [ipActions, userActions] = await Promise.all(promises);
    if (userActions > 4 || ipActions > 32) {
        throw new ApiError({ type: 'error_api_actionlimit' });
    }
}

function verifyToken(token, type) {
    if (!token) {
        throw new ApiError({ type: 'error_api_token_required', field: 'phoneNumber' });
    }
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (cause) {
        throw new ApiError({ type: 'error_api_token_invalid', field: 'phoneNumber', cause });
    }
    if (type && decoded.type !== type) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_api_token_invalid_type' });
    }
    return decoded;
}

function apiMiddleware(handler) {
    return (req, res) => {
        handler(req, res).then(result => {
            res.json(result);
        }).catch(error => {
            let err = error;
            if (!(err instanceof ApiError)) {
                err = new ApiError({ type: 'error_api_general', status: 500, cause: err });
            }
            if (err.status >= 500) {
                req.log.error(err.cause || err, 'Unexpected API error');
            } else if (error.status >= 400) {
                req.log.warn(err.cause || err, 'API Error: %s', err.type);
            }
            res.status(err.status);
            res.json({ error: err });
        });
    };
}

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', apiMiddleware(async () => {
    const rv = { ok: true };
    return rv;
}));

const emailError = m => { throw new ApiError({ field: 'email', type: m }); };

const where = (user, attr) => {
    const matches = {};
    matches[attr] = user[attr];
    return ({ where: matches });
};

const getUser = async (database, userInfo, findBy) => {
    try {
        return await database.users.findOne(where(userInfo, findBy));
    } catch (error) {
        emailError('error_api_get_user');
        return false;
    }
};

const updateUserAttr = async (database, userInfo, attr, value, findBy) => {
    const updateObj = {};
    updateObj[attr] = value;
    try {
        return await database.users.update(updateObj, where(userInfo, findBy));
    } catch (error) {
        emailError('error_api_update_user');
        return false;
    }
};

const sendEmail = async (req, mailToken, emailType, email = undefined) => {
    const emailAddress = email === undefined ? req.body.email : email;
  
    try {
        return await req.mail.send(emailAddress, emailType, {
            url: `${req.protocol}://${req.get('host')}/confirm-email?token=${mailToken}`,
        });
    } catch (error) {
        emailError('error_api_send_email');
        return false;
    }
};


/**
 * Send the email to user asking them to confirm their email address.
 */
const sendConfirmationEmail = async (req, res) => {
    const date = new Date();
    const minusOneMinute = new Date(date.setTime(date.getTime() - 60000));

    // Find the user in the database with an email that matches that of the request.
    const user = await getUser(req.db, req.body, 'email');

    const usersLastAttempt = user.last_attempt_verify_email
        ? user.last_attempt_verify_email.getTime()
        : false;

    // Throw if user has already verified their email.
    if (user.email_is_verified) emailError('email_already_verified');

    // Generate a mail token.
    const mailToken = jwt.sign({
        type: 'confirm_email',
        email: req.body.email,
    }, process.env.JWT_SECRET, { expiresIn: '14d' });

    // If the user has not made a prior attempt, send an email.
    if (!usersLastAttempt) sendEmail(req, mailToken, 'confirm_email');

    // If the user's last attempt was more than a minute ago send an email.
    if (usersLastAttempt && usersLastAttempt < minusOneMinute) sendEmail(req, mailToken, 'confirm_email');

    // If the user's last attempt was less than or exactly a minute ago, throw an error.
    if (usersLastAttempt && usersLastAttempt >= minusOneMinute) emailError('error_api_wait_one_minute');

    // Update the user to reflect that the verification email was sent.
    updateUserAttr(req.db, req.body, 'last_attempt_verify_email', date, 'email');

    const token = jwt.sign({
        type: 'signup',
        email: req.body.email,
    }, process.env.JWT_SECRET);

    // Return success back to the client.
    // TODO: find out what token is used for.
    res.json({ success: true, token });
};

/**
 * Checks for the email step
 * Recaptcha, bad domains and existence with conveyor are verified
 * A token containing the email is generated for the next steps
 * The user is then temporary stored in the database until the process is completed
 * and his account created in the Steem blockchain
 * NB: Chinese residents can't use google services so we skip the recaptcha validation for them
 */
router.post('/request_email', apiMiddleware(async (req, res) => {
    const location = req.geoip.get(req.ip);

    let skipRecaptcha = false;
    if (location && location.country && location.country.iso_code === 'CN') {
        skipRecaptcha = true;
    }
    if (!skipRecaptcha && !req.body.recaptcha) {
        throw new ApiError({ type: 'error_api_recaptcha_required', field: 'recaptcha' });
    }
    if (!req.body.email) {
        throw new ApiError({ type: 'error_api_email_required', field: 'email' });
    }
    if (!validator.isEmail(req.body.email)) {
        throw new ApiError({ type: 'error_api_email_format', field: 'email' });
    }
    if (badDomains.includes(req.body.email.split('@')[1])) {
        throw new ApiError({ type: 'error_api_domain_blacklisted', field: 'email' });
    }

    await actionLimit(req.ip);

    await req.db.actions.create({
        action: 'request_email',
        ip: req.ip,
        metadata: { email: req.body.email },
    });

    const userCount = await req.db.users.count({
        where: {
            email: req.body.email,
            email_is_verified: true,
        },
    });
    if (userCount > 0) {
        throw new ApiError({ type: 'error_api_email_used', field: 'email' });
    }

    const emailRegistered = await steem.api.signedCallAsync(
        'conveyor.is_email_registered', [req.body.email],
        conveyorAccount, conveyorKey,
    );
    if (emailRegistered) {
        throw new ApiError({ type: 'error_api_email_used', field: 'email' });
    }

    if (!skipRecaptcha) {
        try {
            await verifyCaptcha(req.body.recaptcha, req.ip);
        } catch (cause) {
            throw new ApiError({ type: 'error_api_recaptcha_invalid', field: 'recaptcha', cause });
        }
    }

    const userExist = await req.db.users.count({
        where: {
            email: req.body.email,
        },
    });

    if (userExist === 0) {
        await req.db.users.create({
            email: req.body.email,
            email_is_verified: false,
            last_attempt_verify_email: null,
            phone_number: '',
            phone_number_is_verified: false,
            last_attempt_verify_phone_number: null,
            ip: req.ip,
            account_is_created: false,
            created_at: new Date(),
            updated_at: null,
            fingerprint: JSON.parse(req.body.fingerprint),
            metadata: { query: JSON.parse(req.body.query) },
            username: req.body.username,
            username_booked_at: new Date(),
        }).then(async () => {
            await sendConfirmationEmail(req, res);
        });
    } else {
        req.db.users.update({
            username: req.body.username,
            username_booked_at: new Date(),
        }, { where: { email: req.body.email } }).then(async () => {
            await sendConfirmationEmail(req, res);
        });
    }
}));

/**
 * Checks the phone validity and use with the conveyor
 * The user can only request one code every minute to prevent flood
 */
router.post('/request_sms', apiMiddleware(async req => {
    const decoded = verifyToken(req.body.token, 'signup');

    if (!req.body.phoneNumber) {
        throw new ApiError({ type: 'error_api_phone_required', field: 'phoneNumber' });
    }
    if (!req.body.prefix) {
        throw new ApiError({ type: 'error_api_country_code_required', field: 'prefix' });
    }

    const countryCode = req.body.prefix.split('_')[1];
    if (!countryCode) {
        throw new ApiError({ field: 'prefix', type: 'error_api_prefix_invalid' });
    }

    let phoneNumber = phoneUtil.parse(req.body.phoneNumber, countryCode);

    const isValid = phoneUtil.isValidNumber(phoneNumber);

    if (!isValid) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_phone_invalid' });
    }

    phoneNumber = phoneUtil.format(
        phoneNumber,
        PNF.E164,
    );

    try {
        await Twilio.isValidNumber(phoneNumber);
    } catch (e) {
        throw new ApiError({ field: 'phoneNumber', type: e.message });
    }

    const user = await req.db.users.findOne({
        where: {
            email: decoded.email,
        },
    });

    if (!user) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_api_unknown_user' });
    }

    await actionLimit(req.ip, user.id);

    if (
        user.last_attempt_verify_phone_number &&
    user.last_attempt_verify_phone_number.getTime() > Date.now() - (2 * 60 * 1000)
    ) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_api_wait' });
    }

    const phoneExists = await req.db.users.count({
        where: {
            phone_number: phoneNumber,
            phone_number_is_verified: true,
        },
    });

    if (phoneExists > 0) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_api_phone_used' });
    }

    const phoneRegistered = await steem.api.signedCallAsync('conveyor.is_phone_registered', [phoneNumber], conveyorAccount, conveyorKey);
    if (phoneRegistered) {
        throw new ApiError({ field: 'phoneNumber', type: 'error_api_phone_used' });
    }

    const phoneCode = user.phone_code || generateCode(5);
    await req.db.users.update({
        last_attempt_verify_phone_number: new Date(),
        phone_code: phoneCode,
        phone_number: phoneNumber,
        phone_code_attempts: 0,
    }, { where: { email: decoded.email } });

    await req.db.actions.create({
        action: 'send_sms',
        ip: req.ip,
        metadata: { phoneNumber },
        user_id: user.id,
    });

    try {
        await Twilio.sendMessage(phoneNumber, `${phoneCode} is your Steem confirmation code`);
    } catch (cause) {
        if (cause.code === 21614 || cause.code === 21211) {
            throw new ApiError({ cause, field: 'phoneNumber', type: 'error_phone_format' });
        } else {
            throw cause;
        }
    }

    return { success: true, phoneNumber };
}));

/**
 * Mocking route of the steemit gatekeeper
 */
router.get('/check', (req, res) => {
    // mocking the response according to
    // https://github.com/steemit/gatekeeper/blob/master/src/classifier.ts#L13
    // for some usecase test
    if (req.query.val === 'approved') {
        res.send('approved');
    } else if (req.query.val === 'rejected') {
        res.send('rejected');
    } else {
        res.send('manual_review');
    }
});

const rejectAccount = async (req, email) => {
    await req.db.users.update({
        status: 'rejected',
    }, { where: { email } });
    await req.mail.send(email, 'reject_account', {});
};

/**
 * Send the email to user to continue the account creation process
 */
const approveAccount = async (req, email) => {
    const mailToken = jwt.sign({
        type: 'create_account',
        email,
    }, process.env.JWT_SECRET);
    await req.mail.send(email, 'create_account', {
        url: `${req.protocol}://${req.get('host')}/create-account?token=${mailToken}`,
    });
};

/**
 * Check for the status of an account using the steemit gatekeeper
 * An account can have approved, rejected or manual_review status
 */
const sendAccountInformation = async (req, email) => {
    const user = await req.db.users.findOne({ where: { email } });
    if (user && user.phone_number_is_verified) {
    // TODO change to the steemit endpoint
        let result;
        try {
            result = await fetch(`${req.protocol}://${req.get('host')}/api/check`)
                .then(checkStatus)
                .then(res => res.text());
        } catch (err) {
            req.log.error(err, 'sendAccountInformation');
            result = 'manual_review';
        }

        if (result === 'rejected') {
            await rejectAccount(req, email);
        } else if (result === 'approved') {
            await approveAccount(req, email);
        } else {
            await req.db.users.update({
                status: result,
            }, { where: { email } });
        }
    }
};


router.get('/confirm_email', async (req, res) => {
    if (!req.query.token) {
        res.status(400).json({ error: 'error_api_token_required' });
    } else {
        let decoded;
        try {
            decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
            if (decoded.type === 'confirm_email') {
                const user = await req.db.users.findOne({ where: { email: decoded.email } });
                const token = jwt.sign({
                    type: 'signup',
                    email: decoded.email,
                }, process.env.JWT_SECRET);
                if (!user) {
                    res.status(400).json({ error: 'error_api_email_exists_not' });
                } else {
                    if (!user.email_is_verified) {
                        await req.db.users.update({
                            email_is_verified: true,
                        }, { where: { email: decoded.email } });
                        await sendAccountInformation(req, decoded.email);
                    }
                    res.json({
                        success: true,
                        completed: user.phone_number_is_verified,
                        email: user.email,
                        username: user.username,
                        token,
                    });
                }
            } else {
                res.status(400).json({ error: 'error_api_token_invalid' });
            }
        } catch (err) {
            res.status(500).json({ error: 'error_api_token_invalid' });
        }
    }
});

/**
 * Verify the SMS code and then ask the gatekeeper for the status of the account
 * do decide the next step
 */
router.post('/confirm_sms', apiMiddleware(async req => {
    const decoded = verifyToken(req.body.token, 'signup');

    if (!req.body.code) {
        throw new ApiError({ field: 'code', type: 'error_api_code_required' });
    }

    const user = await req.db.users.findOne({
        where: {
            email: decoded.email,
        },
    });

    if (!user) {
        throw new ApiError({ field: 'code', type: 'error_api_unknown_user' });
    }
    if (user.phone_number_is_verified) {
        throw new ApiError({ field: 'code', type: 'error_api_phone_verified' });
    }
    if (user.phone_code_attempts >= 5) {
        throw new ApiError({ field: 'code', type: 'error_api_phone_too_many' });
    }
    if (user.phone_code !== req.body.code) {
        req.db.users.update(
            { phone_code_attempts: user.phone_code_attempts + 1 },
            { where: { email: decoded.email } },
        ).catch(error => {
            req.log.error(error, 'Unable to update number of failed attempts');
        });
        throw new ApiError({ field: 'code', type: 'error_api_code_invalid' });
    }

    await req.db.users.update({
        phone_number_is_verified: true,
        phone_code_attempts: user.phone_code_attempts + 1,
    }, { where: { email: decoded.email } });

    sendAccountInformation(req, decoded.email).catch(error => {
    // TODO: this should be put in a queue and retry on error
        req.log.error(error, 'Unable to send verification mail');
    });

    return { success: true, completed: user.email_is_verified };
}));

/** Return the country code using maxmind database */
router.get('/guess_country', apiMiddleware(async req => {
    const location = req.geoip.get(req.ip);
    return { location };
}));

/**
 * After the account approval, the user receive an email to continue the creation process.
 * We verify that the account is confirmed, confirm the email
 * and initialize his username if it's still available
 * Rejected accounts are marked as pending review
 */
router.post('/confirm_account', apiMiddleware(async req => {
    const decoded = verifyToken(req.body.token, 'create_account');
    const user = await req.db.users.findOne({ where: { email: decoded.email } });
    if (!user) {
        throw new ApiError({ type: 'error_api_user_exists_not' });
    }
    if (user.status === 'manual_review' || user.status === 'rejected') {
        throw new ApiError({ type: 'error_api_account_verification_pending' });
    }
    if (user.status === 'created') {
        throw new ApiError({ type: 'error_api_account_created' });
    }
    if (user.status !== 'approved') {
        throw new ApiError({ type: 'error_api_account_verification_pending' });
    }
    await req.db.users.update({
        email_is_verified: true,
    }, { where: { email: decoded.email } });

    const accounts = await steem.api.getAccountsAsync([user.username]);
    if (accounts && accounts.length > 0 && accounts.find(a => a.name === user.username)) {
        return { success: true, username: '', reservedUsername: user.username, email: user.email };
    }
    return { success: true, username: user.username, reservedUsername: '', query: user.metadata.query, email: user.email };
}));

/**
 * Create the account on the blockchain using steem-js
 * Send the data to the conveyor that will store the user account
 * Remove the user information from our database
 */
router.post('/create_account', apiMiddleware(async req => {
    const { username, public_keys, token, email } = req.body; // eslint-disable-line camelcase
    const decoded = verifyToken(token, 'create_account');
    if (!username) {
        throw new ApiError({ type: 'error_api_username_required' });
    }
    if (!public_keys) { // eslint-disable-line camelcase
        throw new ApiError({ type: 'error_api_public_keys_required' });
    }
    if (!email) {
        throw new ApiError({ type: 'error_api_email_required' });
    }

    const user = await req.db.users.findOne({ where: { email: decoded.email } });
    if (!user) {
        throw new ApiError({ type: 'error_api_user_exists_not' });
    }
    if (user.status !== 'approved') {
        throw new ApiError({ type: 'error_api_account_verification_pending' });
    }
    const creationHash = hash.sha256(crypto.randomBytes(32)).toString('hex');
    await req.db.users.update({
        creation_hash: creationHash,
    }, { where: {
        email: decoded.email,
        creation_hash: null,
    } });
    const weightThreshold = 1;
    const accountAuths = [];
    const publicKeys = JSON.parse(public_keys);
    const metadata = '{}';
    const owner = {
        weight_threshold: weightThreshold,
        account_auths: accountAuths,
        key_auths: [[publicKeys.owner, 1]],
    };
    const active = {
        weight_threshold: weightThreshold,
        account_auths: accountAuths,
        key_auths: [[publicKeys.active, 1]],
    };
    const posting = {
        weight_threshold: weightThreshold,
        account_auths: accountAuths,
        key_auths: [[publicKeys.posting, 1]],
    };
    const [activeCreationHash] = await req.db.sequelize.query(
        'SELECT SQL_NO_CACHE creation_hash FROM users WHERE email = ?',
        {
            replacements: [decoded.email],
            type: req.db.sequelize.QueryTypes.SELECT,
        },
    );
    if (!activeCreationHash || activeCreationHash.creation_hash !== creationHash) {
        throw new ApiError({ type: 'error_api_account_creation_progress' });
    }
    try {
        await steem.broadcast.accountCreateWithDelegationAsync(
            process.env.DELEGATOR_ACTIVE_WIF,
            process.env.CREATE_ACCOUNT_FEE,
            process.env.CREATE_ACCOUNT_DELEGATION,
            process.env.DELEGATOR_USERNAME,
            username,
            owner,
            active,
            posting,
            publicKeys.memo,
            metadata,
            [],
        );
    } catch (cause) {
        await req.db.users.update({
            creation_hash: null,
        }, { where: { email: decoded.email } });
        // steem-js error messages are so long that the log is clipped causing
        // errors in scalyr parsing
        cause.message = cause.message.split('\n').slice(0, 2);
        throw new ApiError({ type: 'error_api_create_account', cause });
    }

    await req.db.users.update({
        status: 'created',
    }, { where: { email: decoded.email } });

    const params = [username, { phone: user.phone_number.replace(/[^+0-9]+/g, ''), email: user.email }];
    steem.api.signedCallAsync('conveyor.set_user_data', params, conveyorAccount, conveyorKey).catch(error => {
    // TODO: this should be put in a queue and retry on error
        req.log.error(error, 'Unable to store user data in conveyor');
    });

    fetch(process.env.CREATE_USER_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            name: username,
            owner_key: publicKeys.owner,
            secret: process.env.CREATE_USER_SECRET,
        }),
    }).then((checkStatus)).catch(error => {
        req.log.error(error, 'Unable to send recovery info to condenser');
    });

    return { success: true };
}));

/**
 * Endpoint called by the faucet admin to approve accounts
 * The email allowing the users to continue the creation process is sent
 * to all approved accounts
 */
router.get('/approve_account', apiMiddleware(async req => {
    const decoded = verifyToken(req.query.token);
    await Promise.all(decoded.emails.map(email => approveAccount(req, email)));
    return { success: true };
}));


/**
 * Endpoint called by the faucet admin to email accounts
 * The email allowing the users to continue the creation process is sent
 * to all accounts that have been approved but have not verified their email.
 */
router.get('/resend_email_validation', apiMiddleware(async req => {
    const decoded = verifyToken(req.query.token);

    await Promise.all(decoded.emails.map(email => {
        // Generate a mail token.
        const mailToken = jwt.sign({
            type: 'confirm_again_email',
            email,
        }, process.env.JWT_SECRET, { expiresIn: '14d' });
        return sendEmail(req, mailToken, 'confirm_again_email', email);
    }
    ));
    return { success: true };
}));

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
router.post('/check_username', apiMiddleware(async req => {
    const { username } = req.body;
    if (!username || username.length < 3) {
        throw new ApiError({ type: 'error_api_username_invalid' });
    }
    await req.db.actions.create({
        action: 'check_username',
        ip: req.ip,
        metadata: { username },
    });
    const accounts = await steem.api.getAccountsAsync([username]);
    if (accounts && accounts.length > 0 && accounts.find(a => a.name === username)) {
        throw new ApiError({ type: 'error_api_username_used', code: 200 });
    }
    const user = await req.db.users.findOne({ where: { username, email_is_verified: true }, order: [['username_booked_at', 'DESC']] });
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (
        user &&
    (user.username_booked_at.getTime() + oneWeek) >= new Date().getTime()
    ) {
        throw new ApiError({ type: 'error_api_username_reserved', code: 200 });
    }
    return { success: true };
}));

module.exports = router;
