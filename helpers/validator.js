const steem = require('@steemit/steem-js');
const validator = require('validator');
const badDomains = require('../bad-domains');

const accountNotExist = (rule, value, callback) => {
    steem.api.getAccounts([value], (err, result) => {
        if (result[0]) {
            callback(['Account name is not available']);
        } else {
            callback();
        }
    });
};

const INVALID_ACCOUNTNAME_REASONS = {
    error_username_required: 'error_username_required',
    error_validation_account_min: 'error_validation_account_min',
    error_validation_account_max: 'error_validation_account_max',
    error_validation_account_start: 'error_validation_account_start',
    error_validation_account_segment_start:
        'error_validation_account_segment_start',
    error_validation_account_alpha: 'error_validation_account_alpha',
    error_validation_account_segment_alpha:
        'error_validation_account_segment_alpha',
    error_validation_account_dash: 'error_validation_account_dash',
    error_validation_account_segment_dash:
        'error_validation_account_segment_dash',
    error_validation_account_end: 'error_validation_account_end',
    error_validation_account_segment_end:
        'error_validation_account_segment_end',
    error_validation_account_segment_min:
        'error_validation_account_segment_min',
};

/**
 * If the name is invalid, emits one of INVALID_ACCOUNTNAME_REASONS.
 *
 * @param {string} name
 * @return {string|false}
 */
// https://github.com/steemit/condenser/blob/eaf8a02658b8deaef376ec90b81d0866e52582cc/app/utils/ChainValidation.js#L4
const accountNameIsInvalid = name => {
    let i;
    let label;
    let len;

    if (!name) {
        return INVALID_ACCOUNTNAME_REASONS.error_username_required;
    }

    const length = name.length;

    if (length < 3) {
        return INVALID_ACCOUNTNAME_REASONS.error_validation_account_min;
    }
    if (length > 16) {
        return INVALID_ACCOUNTNAME_REASONS.error_validation_account_max;
    }

    const hasSegment = /\./.test(name);

    const ref = name.split('.');

    for (i = 0, len = ref.length; i < len; i += 1) {
        label = ref[i];
        if (!/^[a-z]/.test(label)) {
            return hasSegment
                ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_start
                : INVALID_ACCOUNTNAME_REASONS.error_validation_account_start;
        }
        if (!/^[a-z0-9-]*$/.test(label)) {
            return hasSegment
                ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_alpha
                : INVALID_ACCOUNTNAME_REASONS.error_validation_account_alpha;
        }
        if (/--/.test(label)) {
            return hasSegment
                ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_dash
                : INVALID_ACCOUNTNAME_REASONS.error_validation_account_dash;
        }
        if (!/[a-z0-9]$/.test(label)) {
            return hasSegment
                ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_end
                : INVALID_ACCOUNTNAME_REASONS.error_validation_account_end;
        }
        if (!(label.length >= 3)) {
            return hasSegment
                ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_min
                : INVALID_ACCOUNTNAME_REASONS.error_validation_account_min;
        }
    }
    return false;
};

const validateEmail = (rule, value, callback) => {
    if (value) {
        if (!validator.isEmail(value)) {
            callback('Please input a valid email address');
        } else {
            callback();
        }
    } else {
        callback();
    }
};

const validateEmailDomain = (rule, value, callback) => {
    if (value) {
        const [email, domain] = value.split('@'); // eslint-disable-line no-unused-vars
        if (domain && badDomains.includes(domain)) {
            callback(
                'This domain name is blacklisted, please provide another email'
            );
        } else {
            callback();
        }
    } else {
        callback();
    }
};

module.exports = {
    accountNotExist,
    accountNameIsInvalid,
    validateEmail,
    validateEmailDomain,
};
