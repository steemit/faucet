const { hash } = require('@steemit/steem-js/lib/auth/ecc');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const needle = require('needle');

const generateCode = require('../src/utils/phone-utils').generateCode;
const badDomains = require('../bad-domains');
const logger = require('../helpers/logger');
const services = require('../helpers/services');
const database = require('../helpers/database');
const { generateTrackingId } = require('../helpers/stepLogger');
const {
    accountNameIsValid,
    normalizeEmail,
    isEmail,
} = require('../helpers/validator');
const { ApiError } = require('../helpers/errortypes.js');

/**
 * Verifies that the json webtoken passed was signed by us and
 * optionally that it has the correct type.
 */
function verifyToken(token, type) {
    if (!token) {
        throw new ApiError({
            type: 'error_api_token_required',
            field: 'phoneNumber',
        });
    }
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (cause) {
        throw new ApiError({
            type: 'error_api_token_invalid',
            field: 'phoneNumber',
            cause,
        });
    }
    if (type && decoded.type !== type) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_token_invalid_type',
        });
    }
    return decoded;
}

/**
 * Called both after email and phone verification,
 * if both steps are completed classifies the signup and sets the user state.
 */
async function finalizeSignup(user, req) {
    // only act if both email and phone is verified
    if (!user.phone_number_is_verified || !user.email_is_verified) {
        return false;
    }
    // First, create the completed signup request in Gatekeeper.
    // Allow Gatekeeper to relate it to other data based on the
    // "faucet session id", in the form of `${email}+faucetsession` (used in frontend)
    // try {
    //     const signupInGatekeeper = await services.gatekeeperSignupCreate(user);
    //     user.set('gatekeeper_id', signupInGatekeeper.id);
    // } catch (error) {
    //     logger.warn({ error }, 'gatekeeper.signup_create failed');
    // }
    //
    // // Finally, ask Gatekeeper for its judgement.
    // let result;
    //
    // try {
    //     result = await services.gatekeeperCheck(user);
    //     if (
    //         !['manual_review', 'approved', 'rejected'].includes(result.status)
    //     ) {
    //         throw new Error('Got invalid response from gatekeeper');
    //     }
    // } catch (error) {
    //     req.log.warn(error, 'Classification failed, setting to manual_review');
    //     result = { status: 'manual_review', note: `ERROR: ${error.message}` };
    // }
    // if (result.status === 'approved') {
    //     await services.sendApprovalEmail(
    //         user.email,
    //         `${req.protocol}://${req.get('host')}`
    //     );
    // }

    // gatekeeper usages have been removed
    // when email and phone are verified, faucet can finish the sign up process independently

    await services.sendApprovalEmail(
        user.email,
        `${req.protocol}://${req.get('host')}`
    );

    user.status = 'approved';
    user.review_note = '';
    await user.save();
    return true;
}

// Route handlers

/**
 * Request an email verification.
 *
 * @async
 * @param {string} ip
 * @param {string} recaptcha
 * @param {string} email
 * @param {string} fingerprint
 * @param {object} query
 * @param {string} username
 * @param {string} xref
 * @param {string} protocol
 * @param {string} host
 *
 * @returns {Promise}
 * @throws {ApiError}
 */
async function handleRequestEmail(
    ip,
    recaptcha,
    email,
    fingerprint,
    query,
    username,
    xref,
    protocol,
    host
) {
    const recaptchaRequired = services.recaptchaRequiredForIp(ip);

    if (recaptchaRequired && !recaptcha) {
        throw new ApiError({
            type: 'error_api_recaptcha_required',
            field: 'recaptcha',
        });
    }

    if (recaptchaRequired) {
        try {
            await services.verifyCaptcha(recaptcha, ip);
        } catch (cause) {
            throw new ApiError({
                type: 'error_api_recaptcha_invalid',
                field: 'recaptcha',
                cause,
            });
        }
    }

    if (!email) {
        throw new ApiError({
            type: 'error_api_email_required',
            field: 'email',
        });
    }
    if (!validator.isEmail(email)) {
        throw new ApiError({
            type: 'error_api_email_format',
            field: 'email',
        });
    }
    if (badDomains.includes(email.split('@')[1])) {
        throw new ApiError({
            type: 'error_api_domain_blacklisted',
            field: 'email',
        });
    }

    await database.actionLimit(ip);

    await database.logAction({
        action: 'request_email',
        ip,
        metadata: { email },
    });

    const emailIsInUse = await database.emailIsInUse(email);
    if (emailIsInUse) {
        throw new ApiError({
            type: 'error_api_email_used',
            field: 'email',
        });
    }

    const emailRegistered = await services.conveyorCall('is_email_registered', [
        email,
    ]);
    if (emailRegistered) {
        throw new ApiError({
            type: 'error_api_email_used',
            field: 'email',
        });
    }

    const usernameIsBooked = await database.usernameIsBooked(username);
    if (usernameIsBooked) {
        throw new ApiError({
            type: 'error_api_username_reserved',
        });
    }

    let user = null;

    const existingUser = await database.findUser({
        where: {
            email,
        },
    });

    if (existingUser) {
        existingUser.username_booked_at = new Date();
        await existingUser.save();
        user = existingUser;
    } else {
        const newUser = await database.createUser({
            email,
            email_normalized: normalizeEmail(email),
            email_is_verified: false,
            last_attempt_verify_email: null,
            phone_number: '',
            phone_number_is_verified: false,
            last_attempt_verify_phone_number: null,
            ip,
            account_is_created: false,
            created_at: new Date(),
            updated_at: null,
            fingerprint,
            metadata: { query },
            username,
            username_booked_at: new Date(),
            tracking_id: xref || generateTrackingId(),
        });
        user = newUser;
    }

    if (!user.email_is_verified) {
        const minusOneMinute = Date.now() - 60000;

        const usersLastAttempt = user.last_attempt_verify_email
            ? user.last_attempt_verify_email.getTime()
            : undefined;

        // If the user's last attempt was less than or exactly a minute ago, throw an error.
        if (usersLastAttempt && usersLastAttempt >= minusOneMinute) {
            throw new ApiError({
                field: 'email',
                type: 'error_api_wait_one_minute',
            });
        }

        // Generate a mail token.
        const mailToken = jwt.sign(
            {
                type: 'confirm_email',
                email: user.email,
            },
            process.env.JWT_SECRET
        );

        // Send the email.
        await services.sendEmail(user.email, 'confirm_email', {
            url: `${protocol}://${host}/confirm-email?token=${mailToken}`,
        });

        // Update the user to reflect that the verification email was sent.
        user.last_attempt_verify_email = new Date();
        await user.save();
    }

    const token = jwt.sign(
        {
            type: 'signup',
            email: user.email,
        },
        process.env.JWT_SECRET
    );

    return { success: true, token, xref: user.tracking_id };
}

/**
 * Checks the phone validity and use with the conveyor
 * The user can only request one code every minute to prevent flood
 */
async function handleRequestSms(req) {
    const decoded = verifyToken(req.body.token, 'signup');

    if (!req.body.phoneNumber) {
        throw new ApiError({
            type: 'error_api_phone_required',
            field: 'phoneNumber',
        });
    }
    if (!req.body.prefix) {
        throw new ApiError({
            type: 'error_api_country_code_required',
            field: 'prefix',
        });
    }

    const countryCode = req.body.prefix.split('_')[1];
    if (!countryCode) {
        throw new ApiError({
            field: 'prefix',
            type: 'error_api_prefix_invalid',
        });
    }

    const user = await database.findUser({
        where: {
            email: decoded.email,
        },
    });

    if (!user) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_unknown_user',
        });
    }

    let phoneNumber = phoneUtil.parse(req.body.phoneNumber, countryCode);

    const isValid = phoneUtil.isValidNumber(phoneNumber);

    if (!isValid) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_phone_invalid',
        });
    }

    phoneNumber = phoneUtil.format(phoneNumber, PNF.E164);

    await database.logAction({
        action: 'try_number',
        ip: req.ip,
        metadata: { phoneNumber },
        user_id: user.id,
    });

    try {
        await services.validatePhone(phoneNumber);
    } catch (cause) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_phone_invalid',
            cause,
        });
    }

    await database.actionLimit(req.ip, user.id);

    if (
        user.last_attempt_verify_phone_number &&
        user.last_attempt_verify_phone_number.getTime() >
            Date.now() - 2 * 60 * 1000
    ) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_wait',
        });
    }

    const phoneExists = await database.phoneIsInUse(phoneNumber);

    if (phoneExists) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_phone_used',
        });
    }

    const phoneRegistered = await services.conveyorCall('is_phone_registered', [
        phoneNumber,
    ]);

    if (phoneRegistered) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_phone_used',
        });
    }

    const phoneCode = user.phone_code || generateCode(5);
    await database.updateUsers(
        {
            last_attempt_verify_phone_number: new Date(),
            phone_code: phoneCode,
            phone_number: phoneNumber,
            phone_code_attempts: 0,
        },
        { where: { email: decoded.email } }
    );

    await database.logAction({
        action: 'send_sms',
        ip: req.ip,
        metadata: { phoneNumber },
        user_id: user.id,
    });

    try {
        await services.sendSMS(
            phoneNumber,
            `${phoneCode} is your Steem confirmation code`
        );
    } catch (cause) {
        if (cause.code === 21614 || cause.code === 21211) {
            throw new ApiError({
                cause,
                field: 'phoneNumber',
                type: 'error_phone_format',
            });
        } else {
            throw cause;
        }
    }

    return { success: true, phoneNumber, xref: user.tracking_id };
}

// TODO: this should be a POST request like all other api calls
async function handleConfirmEmail(req) {
    const decoded = verifyToken(req.query.token, 'confirm_email');
    const user = await database.findUser({
        where: { email: decoded.email },
    });
    if (!user) {
        throw new ApiError({ type: 'error_api_email_exists_not' });
    }
    const token = jwt.sign(
        {
            type: 'signup',
            email: decoded.email,
        },
        process.env.JWT_SECRET
    );

    if (!user.email_is_verified) {
        user.email_is_verified = true;
        await user.save();
        await finalizeSignup(user, req);
    }

    return {
        approved: user.approved,
        completed: user.phone_number_is_verified && user.email_is_verified,
        email: user.email,
        success: true,
        token,
        username: user.username,
        xref: user.tracking_id,
    };
}

/**
 * Verify the SMS code and then ask the gatekeeper for the status of the account
 * do decide the next step
 */
async function handleConfirmSms(req) {
    const decoded = verifyToken(req.body.token, 'signup');

    if (!req.body.code) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_code_required',
        });
    }

    const user = await database.findUser({
        where: { email: decoded.email },
    });

    if (!user) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_unknown_user',
        });
    }
    if (user.phone_number_is_verified) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_phone_verified',
        });
    }
    if (user.phone_code_attempts >= 5) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_phone_too_many',
        });
    }

    user.phone_code_attempts = (user.phone_code_attempts || 0) + 1;
    if (user.phone_code !== req.body.code) {
        await user.save();
        throw new ApiError({
            field: 'code',
            type: 'error_api_code_invalid',
        });
    }

    user.phone_number_is_verified = true;
    await user.save();

    const completed = await finalizeSignup(user, req);

    return { success: true, completed };
}

/**
 * After the account approval, the user receive an email to continue the creation process.
 * We verify that the account is confirmed, confirm the email
 * and initialize his username if it's still available
 * Rejected accounts are marked as pending review
 */
async function handleConfirmAccount(token) {
    const decoded = verifyToken(token, 'create_account');

    const user = await database.findUser({
        where: { email: decoded.email },
    });
    if (!user) {
        throw new ApiError({ type: 'error_api_user_exists_not' });
    }

    if (user.status === 'manual_review' || user.status === 'rejected') {
        throw new ApiError({
            type: 'error_api_account_verification_pending',
        });
    }

    if (user.status === 'created') {
        throw new ApiError({ type: 'error_api_account_created' });
    }

    if (user.status !== 'approved') {
        throw new ApiError({
            type: 'error_api_account_verification_pending',
        });
    }

    await database.updateUsers(
        {
            email_is_verified: true,
        },
        { where: { email: decoded.email } }
    );

    const userExists = await services.checkUsername(user.username);
    if (userExists) {
        return {
            success: true,
            username: '',
            reservedUsername: user.username,
            query: user.metadata.query,
            email: user.email,
            xref: user.tracking_id,
        };
    }
    return {
        success: true,
        username: user.username,
        reservedUsername: '',
        query: user.metadata.query,
        email: user.email,
        xref: user.tracking_id,
    };
}

/**
 * After an account is created, make a call
 * to the newsletter server to subscribe a user
 */
async function addNewsletterSubscriber(username, email) {
    if (!process.env.NEWSLETTER_URL || !process.env.NEWSLETTER_LIST) return;
    const url = process.env.NEWSLETTER_URL;
    const list = process.env.NEWSLETTER_LIST;
    const data = {
        name: username,
        email,
        list,
    };
    needle('post', url, data).catch(err => {
        logger.warn({ err }, 'addNewsletterSubscriber failed');
    });
}

/**
 * Create the account on the blockchain using steem-js
 * Send the data to the conveyor that will store the user account
 * Remove the user information from our database
 */
async function handleCreateAccount(req) {
    // Do not allow account creations if REACT_DISABLE_ACCOUNT_CREATION is set to true
    if (process.env.REACT_DISABLE_ACCOUNT_CREATION === 'true') {
        throw new ApiError({
            type: 'Account creation temporarily disabled',
            status: 503,
        });
    }

    const { username, public_keys, token, email } = req.body; // eslint-disable-line camelcase
    const decoded = verifyToken(token, 'create_account');
    if (!username) {
        throw new ApiError({ type: 'error_api_username_required' });
    }
    try {
        accountNameIsValid(username);
    } catch (e) {
        throw new ApiError({
            type: e.message,
        });
    }
    if (!public_keys) {
        // eslint-disable-line camelcase
        throw new ApiError({ type: 'error_api_public_keys_required' });
    }
    if (!email) {
        throw new ApiError({ type: 'error_api_email_required' });
    }
    const user = await database.findUser({
        where: { email: decoded.email },
    });
    if (!user) {
        throw new ApiError({ type: 'error_api_user_exists_not' });
    }
    if (user.status !== 'approved') {
        throw new ApiError({
            type: 'error_api_account_verification_pending',
        });
    }
    const creationHash = hash.sha256(crypto.randomBytes(32)).toString('hex');
    await database.updateUsers(
        {
            creation_hash: creationHash,
        },
        {
            where: {
                email: decoded.email,
                creation_hash: null,
            },
        }
    );
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
    const [activeCreationHash] = await database.query(
        'SELECT SQL_NO_CACHE creation_hash FROM users WHERE email = ?',
        {
            replacements: [decoded.email],
            type: database.Sequelize.QueryTypes.SELECT,
        }
    );

    if (
        !activeCreationHash ||
        activeCreationHash.creation_hash !== creationHash
    ) {
        throw new ApiError({ type: 'error_api_account_creation_progress' });
    }

    try {
        await services.createAccount({
            active,
            memo_key: publicKeys.memo,
            json_metadata: metadata,
            owner,
            posting,
            new_account_name: username,
        });
    } catch (cause) {
        await database.updateUsers(
            {
                creation_hash: null,
            },
            { where: { email: decoded.email } }
        );
        // steem-js error messages are so long that the log is clipped causing
        // errors in scalyr parsing
        cause.message = cause.message.split('\n').slice(0, 2);
        throw new ApiError({
            type: 'error_api_create_account',
            cause,
            status: 500,
        });
    }

    await database.updateUsers(
        {
            status: 'created',
        },
        { where: { email: decoded.email } }
    );

    // try {
    //     await services.gatekeeperMarkSignupCreated(user);
    // } catch (error) {
    //     logger.warn({ error }, 'gatekeeper.signup_mark_created failed');
    // }

    const params = [
        username,
        {
            phone: user.phone_number.replace(/[^+0-9]+/g, ''),
            email: user.email,
        },
    ];

    services.conveyorCall('set_user_data', params).catch(error => {
        // TODO: this should retry more than once
        req.log.warn(
            error,
            'Unable to store user data in conveyor... retrying'
        );
        setTimeout(() => {
            // eslint-disable-next-line
            services.conveyorCall('set_user_data', params).catch(error => {
                req.log.error(error, 'Unable to store user data in conveyor');
            });
        }, 5 * 1000);
    });

    // Post to Condenser's account recovery endpoint.
    services
        .condenserTransfer(email, username, publicKeys.owner)
        .catch(error => {
            req.log.error(error, 'Unable to send recovery info to condenser');
        });

    // Add user to newsletter subscription list
    await addNewsletterSubscriber(username, decoded.email);

    return { success: true };
}

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
async function handleCheckUsername(req) {
    const { username } = req.body;

    await database.logAction({
        action: 'check_username',
        ip: req.ip,
        metadata: { username },
    });

    try {
        accountNameIsValid(username);
    } catch (e) {
        throw new ApiError({
            type: e.message,
            status: 200,
        });
    }

    const userExists = await services.checkUsername(username);
    if (userExists) {
        throw new ApiError({
            type: 'error_api_username_used',
            status: 200,
        });
    }

    const usernameExist = await database.countUsers({
        username,
    });

    if (usernameExist) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_user_exist',
        });
    }

    // const usernameIsBooked = await database.usernameIsBooked(username);
    // if (usernameIsBooked) {
    //     throw new ApiError({
    //         type: 'error_api_username_reserved',
    //         status: 200,
    //     });
    // }
    return { success: true };
}

/**
 * Return the country code using maxmind database
 */
async function handleGuessCountry(req) {
    return { location: services.locationFromIp(req.ip) };
}

/**
 * Collect the analytics data
 */
async function handleAnalytics(req) {
    const { event_id, superkey, total, t } = req.query;
    /**
     * Temporary events relationship.
     * 1 => https://steemwallet.app/
     * 2 => https://anon.steem.network/
     * 3 => https://account.buildteam.io/apps/steem-account
     * 4 => https://widget.steem.ninja/widget.html
     * 5 => https://actifit.io/signup
     * 6 => the total of @steem account claim-account
     * 7 => the total of @steem account used claim-account
     * 8 => the total of @steem account used 3steem created account
     * 9 => the total of all claim-account on blockchain
     * 10 => the total of all used claim-account
     * 11 => the total of all used 3steem created account
     */
    if (event_id < 1 || event_id > 11) {
        throw new ApiError({
            type: 'error_event_id',
            status: 200,
        });
    }

    // action limit
    await database.logAction({
        action: 'analytics',
        ip: req.ip,
    });
    await database.actionLimit(req.ip);

    if (superkey) {
        // In super mode we can update `total` and `created_at` fields.
        const SUPERKEY_ENV = process.env.ANALYTICS_UPDATE_SUPERKEY;
        if (!SUPERKEY_ENV) {
            throw new ApiError({
                type: 'error_analytics_update_superkey_not_set',
                status: 200,
            });
        }
        if (superkey !== SUPERKEY_ENV) {
            throw new ApiError({
                type: 'error_superkey',
                status: 200,
            });
        }
        const where = {
            event_id,
            created_at: `${t}T00:00:00Z`,
        };
        const data = {
            total,
        };
        try {
            await database.updateAnalytics(where, data);
        } catch (error) {
            req.log.error(error, 'Unable to store analytics data');
            return { success: true };
        }
    } else {
        // In normal mode we only update `total` by adding 1.
        const today = new Date().toISOString().replace(/T.+/, '');
        const where = {
            event_id,
            created_at: `${today}T00:00:00Z`,
        };
        const data = {
            total: 1,
        };
        try {
            await database.updateAnalytics(where, data, true);
        } catch (error) {
            req.log.error(error, 'Unable to store analytics data');
            return { success: true };
        }
    }
    return { success: true };
}

async function handleRequestEmailCode(ip, email, log) {
    if (!email) {
        throw new ApiError({
            type: 'error_api_email_required',
            field: 'email',
        });
    }
    // format check
    if (!isEmail(email)) {
        throw new ApiError({
            type: 'error_api_email_format',
            field: 'email',
        });
    }
    // bad domains check
    if (badDomains.includes(email.split('@')[1])) {
        throw new ApiError({
            type: 'error_api_domain_blacklisted',
            field: 'email',
        });
    }

    await database.actionLimitNew(ip);

    await database.logAction({
        action: 'request_email_code',
        ip,
        metadata: { email },
    });

    // duplicate check
    const emailIsInUse = await database.emailIsInUse(email);
    if (emailIsInUse) {
        throw new ApiError({
            type: 'error_api_email_used',
            field: 'email',
        });
    }

    const emailRegistered = await services.conveyorCall('is_email_registered', [
        email,
    ]);
    if (emailRegistered) {
        throw new ApiError({
            type: 'error_api_email_used',
            field: 'email',
        });
    }

    let record = null;

    const existingRecord = await database.findEmailRecord({
        where: {
            email,
        },
    });

    if (existingRecord) {
        record = existingRecord;
    } else {
        try {
            const newEmailRecord = await database.createEmailRecord({
                email,
                email_normalized: normalizeEmail(email),
                last_attempt_verify_email: new Date(1588291200000),
                email_code: null,
                email_code_attempts: 0,
                email_code_sent: 0,
                email_code_generated: null,
            });
            record = newEmailRecord;
        } catch (e) {
            log.error(e, 'insert email code record error');
            throw new ApiError({
                type: 'error_api_general',
                field: 'email',
            });
        }
    }

    const minusOneMinute = Date.now() - 60000;
    const minusOneDay = Date.now() - 86400000;

    const usersLastAttempt = record.last_attempt_verify_email
        ? record.last_attempt_verify_email.getTime()
        : undefined;

    const dailySentTimes = record.email_code_sent
        ? record.email_code_sent.get
        : undefined;

    const lastRequestTime = record.email_code_generated
        ? record.email_code_generated.getTime()
        : undefined;

    // if an email has requested code over 5 times with 24 hours, throw an error.
    if (dailySentTimes && lastRequestTime) {
        if (dailySentTimes >= 5 && lastRequestTime >= minusOneDay) {
            throw new ApiError({
                field: 'email',
                type: 'error_api_request_too_much',
            });
        }
    }

    // If the user's last attempt was less than or exactly a minute ago, throw an error.
    if (usersLastAttempt && usersLastAttempt >= minusOneMinute) {
        throw new ApiError({
            field: 'email',
            type: 'error_api_wait_one_minute',
        });
    }

    const captchaCode = Math.floor(Math.random() * 1000000).toString();

    // Update the user to reflect that the verification email was sent.
    record.email_code_attempts = 0;
    record.email_code = captchaCode;
    // count every 24 hours
    if (record.email_code_generated >= minusOneDay) {
        record.email_code_sent += 1;
        record.email_code_generated = new Date();
    } else {
        record.email_code_sent = 1;
        record.email_code_generated = new Date();
    }
    record.last_attempt_verify_email = new Date();
    await record.save();

    // Send the email.
    await services.sendEmail(record.email, 'email_code', { code: captchaCode });

    return { success: true, email, xref: record.ref_code };
}

/**
 * remove token usage & record phone information to new table
 * compare to old request sms func
 */
async function handleRequestSmsNew(req) {
    if (!req.body.phoneNumber) {
        throw new ApiError({
            type: 'error_api_phone_required',
            field: 'phoneNumber',
        });
    }
    if (!req.body.prefix) {
        throw new ApiError({
            type: 'error_api_country_code_required',
            field: 'phoneNumber',
        });
    }

    const countryCode = req.body.prefix.split('_')[1];
    if (!countryCode) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_prefix_invalid',
        });
    }

    let phoneNumber = phoneUtil.parse(req.body.phoneNumber, countryCode);

    const isValid = phoneUtil.isValidNumber(phoneNumber);

    if (!isValid) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_phone_invalid',
        });
    }

    phoneNumber = phoneUtil.format(phoneNumber, PNF.E164);

    const phoneExists = await database.phoneIsInUse(phoneNumber);

    if (phoneExists) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_phone_used',
        });
    }

    const phoneRegistered = await services.conveyorCall('is_phone_registered', [
        phoneNumber,
    ]);

    if (phoneRegistered) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_api_phone_used',
        });
    }

    await database.logAction({
        action: 'try_number',
        ip: req.ip,
        metadata: { phoneNumber },
    });

    try {
        await services.validatePhone(phoneNumber);
    } catch (cause) {
        throw new ApiError({
            field: 'phoneNumber',
            type: 'error_phone_invalid',
            cause,
        });
    }

    await database.actionLimitNew(req.ip);

    let record = null;

    const existingRecord = await database.findPhoneRecord({
        where: {
            phone_number: phoneNumber,
        },
    });

    if (existingRecord) {
        record = existingRecord;
    } else {
        const newPhoneRecord = await database.createPhoneRecord({
            phone_number: phoneNumber,
            last_attempt_verify_phone_number: new Date(1588291200000),
            phone_code: null,
            phone_code_attempts: 0,
            phone_code_sent: 0,
            phone_code_generated: new Date(),
        });
        record = newPhoneRecord;
    }

    const minusOneDay = Date.now() - 86400000;
    const minusOneMinute = Date.now() - 60000;

    const usersLastAttempt = record.last_attempt_verify_phone_number
        ? record.last_attempt_verify_phone_number.getTime()
        : undefined;

    const dailySentTimes = record.phone_code_sent
        ? record.phone_code_sent
        : undefined;

    const lastRequestTime = record.phone_code_generated
        ? record.phone_code_generated.getTime()
        : undefined;

    // if an email has requested code over 5 times with 24 hours, throw an error.
    if (dailySentTimes && lastRequestTime) {
        if (dailySentTimes >= 5 && lastRequestTime >= minusOneDay) {
            throw new ApiError({
                field: 'phone',
                type: 'error_api_request_too_much',
            });
        }
    }

    // If the user's last attempt was less than or exactly a minute ago, throw an error.
    if (usersLastAttempt && usersLastAttempt >= minusOneMinute) {
        throw new ApiError({
            field: 'phone',
            type: 'error_api_wait_one_minute',
        });
    }

    await database.logAction({
        action: 'send_sms',
        ip: req.ip,
        metadata: { phoneNumber },
    });

    const phoneCode = generateCode(5);

    try {
        await services.sendSMS(
            phoneNumber,
            `${phoneCode} is your Steem confirmation code, 
            Please keep your code secure. 
            The code will expire in 30 minutes.`
        );
    } catch (cause) {
        if (cause.code === 21614 || cause.code === 21211) {
            throw new ApiError({
                cause,
                field: 'phoneNumber',
                type: 'error_phone_format',
            });
        } else {
            throw cause;
        }
    }

    record.phone_code_attempts = 0;
    record.phone_code = phoneCode;
    // count every 24 hours
    if (record.phone_code_generated >= minusOneDay) {
        record.phone_code_sent += 1;
        record.phone_code_generated = new Date();
    } else {
        record.phone_code_sent = 1;
        record.phone_code_generated = new Date();
    }
    record.last_attempt_verify_phone_number = new Date();
    await record.save();

    return { success: true, phoneNumber, ref: record.ref_code };
}

async function handleConfirmEmailCode(req) {
    const currentEmail = req.body.email;
    const minusHalfHour = Date.now() - 1800000;

    if (!req.body.code) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_code_required',
        });
    }

    const record = await database.findEmailRecord({
        where: { email: currentEmail },
    });

    if (!record) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_unknown_email',
        });
    }

    // incorrect input over 100 times
    if (record.email_code_attempts >= 100) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_request_too_much',
        });
    }

    // code expires after 30 mins from generated time
    if (record.email_code_generated <= minusHalfHour) {
        record.email_code = null;
        record.email_code_attempts = 0;
        record.save();
        throw new ApiError({
            field: 'code',
            type: 'error_api_email_code_invalid',
        });
    }

    // try code
    record.email_code_attempts += 1;
    // if doesn't match
    if (record.email_code !== req.body.code) {
        await record.save();
        throw new ApiError({
            field: 'code',
            type: 'error_api_email_code_invalid',
        });
    }

    return { success: true };
}

async function handleConfirmSmsNew(req) {
    if (!req.body.code) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_code_required',
        });
    }

    const record = await database.findPhoneRecord({
        where: { phone_number: req.body.phoneNumber },
    });

    if (!record) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_unknown_phone_number',
        });
    }

    if (record.phone_code_attempts >= 100) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_phone_too_many',
        });
    }

    const minusHalfHour = Date.now() - 1800000;
    // code expires after 30 mins from generated time
    if (record.phone_code_generated <= minusHalfHour) {
        record.phone_code = null;
        record.phone_code_attempts = 0;
        record.save();
        throw new ApiError({
            field: 'code',
            type: 'error_api_phone_code_invalid',
        });
    }

    record.phone_code_attempts += 1;
    if (record.phone_code !== req.body.code) {
        await record.save();
        throw new ApiError({
            field: 'code',
            type: 'error_api_phone_code_invalid',
        });
    }

    return { success: true };
}

async function finalizeSignupNew(
    ip,
    recaptcha,
    email,
    emailCode,
    fingerprint,
    phoneNumber,
    phoneCode,
    username,
    xref
) {
    if (!recaptcha) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_recaptcha_required',
        });
    }

    try {
        await services.verifyCaptcha(recaptcha, ip);
    } catch (e) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_recaptcha_invalid',
        });
    }

    if (!username) {
        throw new ApiError({
            field: 'username',
            type: 'error_api_username_required',
        });
    }

    if (!email) {
        throw new ApiError({
            field: 'email',
            type: 'error_api_email_required',
        });
    }

    if (!phoneNumber) {
        throw new ApiError({
            field: 'phone',
            type: 'error_api_phone_required',
        });
    }

    if (!emailCode) {
        throw new ApiError({
            field: 'email_code',
            type: 'error_api_code_required',
        });
    }

    if (!phoneCode) {
        throw new ApiError({
            field: 'phone_code',
            type: 'error_api_code_required',
        });
    }

    const phoneRecord = await database.findPhoneRecord({
        where: {
            phone_number: phoneNumber,
        },
    });
    const emailRecord = await database.findEmailRecord({
        where: {
            email,
        },
    });

    if (!phoneRecord) {
        throw new ApiError({
            field: 'phone_code',
            type: 'error_api_unknown_phone_number',
        });
    }

    if (!emailRecord) {
        throw new ApiError({
            field: 'email_code',
            type: 'error_api_unknown_email',
        });
    }

    if (phoneRecord.phone_code !== phoneCode) {
        throw new ApiError({
            field: 'phone_code',
            type: 'error_api_phone_code_invalid',
        });
    }

    if (emailRecord.email_code !== emailCode) {
        throw new ApiError({
            field: 'email_code',
            type: 'error_api_email_code_invalid',
        });
    }

    const usernameExist = await database.countUsers({
        username,
    });

    if (usernameExist) {
        throw new ApiError({
            field: 'code',
            type: 'error_api_user_exist',
        });
    }

    await database.createUser({
        email,
        email_is_verified: true,
        phone_number: phoneNumber,
        phone_number_is_verified: true,
        ip,
        account_is_created: false,
        created_at: new Date(),
        updated_at: null,
        fingerprint,
        username,
        tracking_id: xref || generateTrackingId(),
    });

    return { success: true };
}

async function handleCreateAccountNew(req) {
    // Do not allow account creations if REACT_DISABLE_ACCOUNT_CREATION is set to true
    if (process.env.REACT_DISABLE_ACCOUNT_CREATION === 'true') {
        throw new ApiError({
            type: 'Account creation temporarily disabled',
            status: 503,
        });
    }

    const { username, public_keys, phoneNumber, email } = req.body; // eslint-disable-line camelcase

    if (!username) {
        throw new ApiError({ type: 'error_api_username_required' });
    }
    try {
        accountNameIsValid(username);
    } catch (e) {
        throw new ApiError({
            type: e.message,
        });
    }
    if (!public_keys) {
        // eslint-disable-line camelcase
        throw new ApiError({ type: 'error_api_public_keys_required' });
    }
    if (!email) {
        throw new ApiError({ type: 'error_api_email_required' });
    }
    if (!phoneNumber) {
        throw new ApiError({ type: 'error_api_phone_required' });
    }
    const user = await database.findUser({
        where: {
            username,
            email,
            phone_number: phoneNumber,
        },
    });
    if (!user) {
        throw new ApiError({ type: 'error_api_user_exists_not' });
    }
    if (user.account_is_created === true) {
        throw new ApiError({
            type: 'error_api_user_exist',
        });
    }
    const creationHash = hash.sha256(crypto.randomBytes(32)).toString('hex');
    await database.updateUsers(
        {
            creation_hash: creationHash,
        },
        {
            where: {
                email,
                username,
                phone_number: phoneNumber,
            },
        }
    );
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
    const [activeCreationHash] = await database.query(
        'SELECT SQL_NO_CACHE creation_hash FROM users WHERE email = ? and phone_number = ? and username = ?',
        {
            replacements: [email, phoneNumber, username],
            type: database.Sequelize.QueryTypes.SELECT,
        }
    );

    if (
        !activeCreationHash ||
        activeCreationHash.creation_hash !== creationHash
    ) {
        throw new ApiError({ type: 'error_api_account_creation_progress' });
    }

    try {
        await services.createAccount({
            active,
            memo_key: publicKeys.memo,
            json_metadata: metadata,
            owner,
            posting,
            new_account_name: username,
        });
    } catch (cause) {
        await database.updateUsers(
            {
                creation_hash: null,
            },
            {
                where: {
                    email,
                    username,
                    phone_number: phoneNumber,
                },
            }
        );
        // steem-js error messages are so long that the log is clipped causing
        // errors in scalyr parsing
        cause.message = cause.message.split('\n').slice(0, 2);
        throw new ApiError({
            type: 'error_api_create_account',
            cause,
            status: 500,
        });
    }

    await database.updateUsers(
        {
            status: 'created',
            account_is_created: true,
        },
        {
            where: {
                email,
                username,
                phone_number: phoneNumber,
            },
        }
    );

    // try {
    //     await services.gatekeeperMarkSignupCreated(user);
    // } catch (error) {
    //     logger.warn({ error }, 'gatekeeper.signup_mark_created failed');
    // }

    const params = [
        username,
        {
            phone: user.phone_number.replace(/[^+0-9]+/g, ''),
            email: user.email,
        },
    ];

    services.conveyorCall('set_user_data', params).catch(error => {
        // TODO: this should retry more than once
        req.log.warn(
            error,
            'Unable to store user data in conveyor... retrying'
        );
        setTimeout(() => {
            // eslint-disable-next-line
            services.conveyorCall('set_user_data', params).catch(error => {
                req.log.error(error, 'Unable to store user data in conveyor');
            });
        }, 5 * 1000);
    });

    // Post to Condenser's account recovery endpoint.
    services
        .condenserTransfer(email, username, publicKeys.owner)
        .catch(error => {
            req.log.error(error, 'Unable to send recovery info to condenser');
        });

    // Add user to newsletter subscription list
    await addNewsletterSubscriber(username, email);

    return { success: true };
}

module.exports = {
    handleRequestEmail,
    handleRequestSms,
    handleConfirmEmail,
    handleConfirmSms,
    handleConfirmAccount,
    handleCreateAccount,
    handleCheckUsername,
    handleGuessCountry,
    handleAnalytics,
    handleRequestEmailCode,
    handleRequestSmsNew,
    handleConfirmSmsNew,
    finalizeSignupNew,
    handleConfirmEmailCode,
    handleCreateAccountNew,
};
