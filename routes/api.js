const express = require('express');

const { hash } = require('@steemit/steem-js/lib/auth/ecc');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const generateCode = require('../src/utils/phone-utils').generateCode;

const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const badDomains = require('../bad-domains');

const moment = require('moment');
const db = require('./../db/models');
const services = require('../helpers/services');
const geoip = require('../helpers/maxmind');
const { generateTrackingId } = require('../helpers/stepLogger');

const { Sequelize } = db;
const { Op } = Sequelize;

class ApiError extends Error {
    constructor({
        type = 'error_api_general',
        field = 'general',
        status = 400,
        cause,
    }) {
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

/**
 * Throws if user or ip exceeds number of allowed actions within time period.
 */
async function actionLimit(ip, user_id = null) {
    const created_at = {
        [Op.gte]: moment()
            .subtract(20, 'hours')
            .toDate(),
    };
    const promises = [
        db.actions.count({
            where: { ip, created_at, action: { [Op.ne]: 'check_username' } },
        }),
    ];
    if (user_id) {
        promises.push(db.actions.count({ where: { user_id, created_at } }));
    }
    const [ipActions, userActions] = await Promise.all(promises);
    if (userActions > 4 || ipActions > 32) {
        throw new ApiError({ type: 'error_api_actionlimit' });
    }
}

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

function apiMiddleware(handler) {
    return (req, res) => {
        handler(req, res)
            .then(result => {
                res.json(result);
            })
            .catch(error => {
                let err = error;
                if (!(err instanceof ApiError)) {
                    err = new ApiError({
                        type: 'error_api_general',
                        status: 500,
                        cause: err,
                    });
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

router.get(
    '/',
    apiMiddleware(async () => {
        const rv = { ok: true };
        return rv;
    })
);

/**
 * Checks for the email step
 * Recaptcha, bad domains and existence with conveyor are verified
 * A token containing the email is generated for the next steps
 * The user is then temporary stored in the database until the process is completed
 * and his account created in the Steem blockchain
 * NB: Chinese residents can't use google services so we skip the recaptcha validation for them
 */
router.post(
    '/request_email',
    apiMiddleware(async req => {
        const location = geoip.get(req.ip);

        let skipRecaptcha = false;
        if (
            location &&
            location.country &&
            location.country.iso_code === 'CN'
        ) {
            skipRecaptcha = true;
        }
        if (!skipRecaptcha && !req.body.recaptcha) {
            throw new ApiError({
                type: 'error_api_recaptcha_required',
                field: 'recaptcha',
            });
        }
        if (!req.body.email) {
            throw new ApiError({
                type: 'error_api_email_required',
                field: 'email',
            });
        }
        if (!validator.isEmail(req.body.email)) {
            throw new ApiError({
                type: 'error_api_email_format',
                field: 'email',
            });
        }
        if (badDomains.includes(req.body.email.split('@')[1])) {
            throw new ApiError({
                type: 'error_api_domain_blacklisted',
                field: 'email',
            });
        }

        await actionLimit(req.ip);

        await db.actions.create({
            action: 'request_email',
            ip: req.ip,
            metadata: { email: req.body.email },
        });

        const userCount = await db.users.count({
            where: {
                email: req.body.email,
                email_is_verified: true,
            },
        });
        if (userCount > 0) {
            throw new ApiError({
                type: 'error_api_email_used',
                field: 'email',
            });
        }

        const emailRegistered = await services.conveyorCall(
            'is_email_registered',
            [req.body.email]
        );
        if (emailRegistered) {
            throw new ApiError({
                type: 'error_api_email_used',
                field: 'email',
            });
        }

        if (!skipRecaptcha) {
            try {
                await services.verifyCaptcha(req.body.recaptcha, req.ip);
            } catch (cause) {
                throw new ApiError({
                    type: 'error_api_recaptcha_invalid',
                    field: 'recaptcha',
                    cause,
                });
            }
        }

        let user = await db.users.findOne({
            where: {
                email: req.body.email,
            },
        });

        if (!user) {
            user = await db.users.create({
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
                tracking_id: req.body.xref || generateTrackingId(),
            });
        } else {
            user.username = req.body.username;
            user.username_booked_at = new Date();
            await user.save();
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
                url: `${req.protocol}://${req.get(
                    'host'
                )}/confirm-email?token=${mailToken}`,
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
    })
);

/**
 * Checks the phone validity and use with the conveyor
 * The user can only request one code every minute to prevent flood
 */
router.post(
    '/request_sms',
    apiMiddleware(async req => {
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

        let phoneNumber = phoneUtil.parse(req.body.phoneNumber, countryCode);

        const isValid = phoneUtil.isValidNumber(phoneNumber);

        if (!isValid) {
            throw new ApiError({
                field: 'phoneNumber',
                type: 'error_phone_invalid',
            });
        }

        phoneNumber = phoneUtil.format(phoneNumber, PNF.E164);

        try {
            await services.validatePhone(phoneNumber);
        } catch (cause) {
            throw new ApiError({
                field: 'phoneNumber',
                type: 'error_phone_invalid',
                cause,
            });
        }

        const user = await db.users.findOne({
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

        await actionLimit(req.ip, user.id);

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

        const phoneExists = await db.users.count({
            where: {
                phone_number: phoneNumber,
                phone_number_is_verified: true,
            },
        });

        if (phoneExists > 0) {
            throw new ApiError({
                field: 'phoneNumber',
                type: 'error_api_phone_used',
            });
        }

        const phoneRegistered = await services.conveyorCall(
            'is_phone_registered',
            [phoneNumber]
        );

        if (phoneRegistered) {
            throw new ApiError({
                field: 'phoneNumber',
                type: 'error_api_phone_used',
            });
        }

        const phoneCode = user.phone_code || generateCode(5);
        await db.users.update(
            {
                last_attempt_verify_phone_number: new Date(),
                phone_code: phoneCode,
                phone_number: phoneNumber,
                phone_code_attempts: 0,
            },
            { where: { email: decoded.email } }
        );

        await db.actions.create({
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
    })
);

/**
 * Called both after email and phone verification,
 * if both steps are completed classifies the signup and sets the user state.
 */
const finalizeSignup = async user => {
    // only act if both email and phone is verified
    if (!user.phone_number_is_verified || !user.email_is_verified) {
        return false;
    }
    const status = await services.classifySignup(user);
    // TODO: send out approval email if status is 'approved'
    if (status === 'approved') {
        throw new Error('Not implemented');
    }
    user.status = status;
    await user.save();
    return true;
};

// TODO: this should be a POST request like all other api calls
router.get(
    '/confirm_email',
    apiMiddleware(async req => {
        const decoded = verifyToken(req.query.token, 'confirm_email');
        const user = await db.users.findOne({
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
            await finalizeSignup(user);
        }

        return {
            approved: user.approved,
            completed: user.phone_number_is_verified && user.email_is_verified,
            email: user.email,
            success: true,
            token,
            username: user.username,
        };
    })
);

/**
 * Verify the SMS code and then ask the gatekeeper for the status of the account
 * do decide the next step
 */
router.post(
    '/confirm_sms',
    apiMiddleware(async req => {
        const decoded = verifyToken(req.body.token, 'signup');

        if (!req.body.code) {
            throw new ApiError({
                field: 'code',
                type: 'error_api_code_required',
            });
        }

        const user = await db.users.findOne({
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

        const completed = await finalizeSignup(user);

        return { success: true, completed };
    })
);

/** Return the country code using maxmind database */
router.get(
    '/guess_country',
    apiMiddleware(async req => {
        const location = geoip.get(req.ip);
        return { location };
    })
);

/**
 * After the account approval, the user receive an email to continue the creation process.
 * We verify that the account is confirmed, confirm the email
 * and initialize his username if it's still available
 * Rejected accounts are marked as pending review
 */
router.post(
    '/confirm_account',
    apiMiddleware(async req => {
        const decoded = verifyToken(req.body.token, 'create_account');

        const user = await db.users.findOne({
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

        await db.users.update(
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
    })
);

/**
 * Create the account on the blockchain using steem-js
 * Send the data to the conveyor that will store the user account
 * Remove the user information from our database
 */
router.post(
    '/create_account',
    apiMiddleware(async req => {
        const { username, public_keys, token, email } = req.body; // eslint-disable-line camelcase
        const decoded = verifyToken(token, 'create_account');
        if (!username) {
            throw new ApiError({ type: 'error_api_username_required' });
        }
        if (!public_keys) {
            // eslint-disable-line camelcase
            throw new ApiError({ type: 'error_api_public_keys_required' });
        }
        if (!email) {
            throw new ApiError({ type: 'error_api_email_required' });
        }
        const user = await db.users.findOne({
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
        const creationHash = hash
            .sha256(crypto.randomBytes(32))
            .toString('hex');
        await db.users.update(
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
        const [activeCreationHash] = await db.sequelize.query(
            'SELECT SQL_NO_CACHE creation_hash FROM users WHERE email = ?',
            {
                replacements: [decoded.email],
                type: db.sequelize.QueryTypes.SELECT,
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
                memoKey: publicKeys.memo,
                metadata,
                owner,
                posting,
                username,
            });
        } catch (cause) {
            await db.users.update(
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

        await db.users.update(
            {
                status: 'created',
            },
            { where: { email: decoded.email } }
        );

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
                    req.log.error(
                        error,
                        'Unable to store user data in conveyor'
                    );
                });
            }, 5 * 1000);
        });

        // Post to Condenser's account recovery endpoint.
        services
            .condenserTransfer(email, username, publicKeys.owner)
            .catch(error => {
                req.log.error(
                    error,
                    'Unable to send recovery info to condenser'
                );
            });

        return { success: true };
    })
);

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
router.post(
    '/check_username',
    apiMiddleware(async req => {
        const { username } = req.body;
        if (!username || username.length < 3) {
            throw new ApiError({ type: 'error_api_username_invalid' });
        }
        await db.actions.create({
            action: 'check_username',
            ip: req.ip,
            metadata: { username },
        });

        const userExists = await services.checkUsername(username);
        if (userExists) {
            throw new ApiError({
                type: 'error_api_username_used',
                status: 200,
            });
        }
        const user = await db.users.findOne({
            where: {
                username,
                email_is_verified: true,
            },
            order: [['username_booked_at', 'DESC']],
        });
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (
            user &&
            user.username_booked_at.getTime() + oneWeek >= new Date().getTime()
        ) {
            throw new ApiError({
                type: 'error_api_username_reserved',
                status: 200,
            });
        }
        return { success: true };
    })
);

module.exports = router;
