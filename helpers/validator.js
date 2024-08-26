import steem from '@steemit/steem-js';
import validator from 'validator';

// const badDomains = require('../bad-domains');

export const accountNotExist = (rule, value, callback) => {
  steem.api.getAccounts([value], (err, result) => {
    if (result[0]) {
      callback(['Account name is not available']);
    } else {
      callback();
    }
  });
};

export const INVALID_ACCOUNTNAME_REASONS = {
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
  error_validation_account_segment_end: 'error_validation_account_segment_end',
  error_validation_account_segment_min: 'error_validation_account_segment_min',
};

export const INVALID_EMAIL_REASONS = {
  error_email_required: 'error_email_required',
  error_api_email_format: 'error_api_email_format',
  error_api_email_length: 'error_api_email_length',
};

/**
 * If the name is invalid, throws an error with a message set to one of INVALID_ACCOUNTNAME_REASONS.
 * See
 * https://github.com/steemit/condenser/blob/eaf8a02658b8deaef376ec90b81d0866e52582cc/app/utils/ChainValidation.js#L4
 *
 * @param {string} name
 * @return {boolean}
 */
export const accountNameIsValid = (name) => {
  let i;
  let label;
  let len;

  if (!name) {
    throw new Error(INVALID_ACCOUNTNAME_REASONS.error_username_required);
  }

  const length = name.length;

  if (length < 3) {
    throw new Error(INVALID_ACCOUNTNAME_REASONS.error_validation_account_min);
  }
  if (length > 16) {
    throw new Error(INVALID_ACCOUNTNAME_REASONS.error_validation_account_max);
  }

  const hasSegment = /\./.test(name);

  const ref = name.split('.');

  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z0-9-]*$/.test(label)) {
      throw new Error(
        hasSegment
          ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_alpha
          : INVALID_ACCOUNTNAME_REASONS.error_validation_account_alpha
      );
    }
    if (!/^[a-z]/.test(label)) {
      throw new Error(
        hasSegment
          ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_start
          : INVALID_ACCOUNTNAME_REASONS.error_validation_account_start
      );
    }
    if (/--/.test(label)) {
      throw new Error(
        hasSegment
          ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_dash
          : INVALID_ACCOUNTNAME_REASONS.error_validation_account_dash
      );
    }
    if (!/[a-z0-9]$/.test(label)) {
      throw new Error(
        hasSegment
          ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_end
          : INVALID_ACCOUNTNAME_REASONS.error_validation_account_end
      );
    }
    if (!(label.length >= 3)) {
      throw new Error(
        hasSegment
          ? INVALID_ACCOUNTNAME_REASONS.error_validation_account_segment_min
          : INVALID_ACCOUNTNAME_REASONS.error_validation_account_min
      );
    }
  }
  return true;
};

export const isEmail = (email) => {
  const reg =
    /^[\w]{1,20}([0-9.]{0,10})+[a-zA-Z0-9]{0,20}@[a-zA-Z0-9]{2,20}(?:\.[a-z]{2,20}){1,3}$/;
  return reg.test(email);
};

/**
 * if email is not valid, throw a error
 */
export const emailValid = (email) => {
  if (!email) {
    throw new Error(INVALID_EMAIL_REASONS.error_username_required);
  }
  if (!validator.isEmail(email)) {
    throw new Error(INVALID_EMAIL_REASONS.error_api_email_format);
  }
  if (!isEmail(email)) {
    throw new Error(INVALID_EMAIL_REASONS.error_api_email_length);
  }
  return true;
};
/**
 * Used in src/components/Form/Signup/Email.js
 * */
export const validateEmail = (rule, value, callback) => {
  if (value) {
    if (!validator.isEmail(value)) {
      callback('Please input a valid email address');
    } else if (!isEmail(value)) {
      callback('email is too long valid xx.xx@xx.xx each xx 20 max');
    } else {
      callback();
    }
  } else {
    callback();
  }
};

/**
 * Used in src/components/Form/Signup/Email.js
 * */
export const validateEmailDomain = (rule, value, callback) => {
  callback();
  // if (value) {
  //     const [email, domain] = value.split('@');
  //     if (domain && badDomains.includes(domain)) {
  //         callback(
  //             'This domain name is blacklisted, please provide another email'
  //         );
  //     } else {
  //         callback();
  //     }
  // } else {
  //     callback();
  // }
};

// Remove dots (if gmail) and plus sign aliases from an email address.
export const normalizeEmail = (email) => {
  const gmailDomains = ['gmail.com', 'googlemail.com'];

  const username = email.split('@')[0].replace(/\+.*/, '').toLowerCase();
  const domain = email.split('@')[1].toLowerCase();

  if (gmailDomains.includes(domain)) {
    return `${username.replace(/\./g, '')}@gmail.com`;
  }

  return `${username}@${domain}`;
};

// TODO: Finish this part code, when I re-construct frontend code.
// this func for frontend
// const getPendingClaimedAccounts = (callback) => {
//   const result = {};
//   if (!window.config || !window.config.CREATOR_INFO) {
//     return callback(result);
//   }
//   const accounts = window.config.CREATOR_INFO.split('|');
//   if (accounts.length === 0) {
//     return callback(result);
//   }
//   steem.api.getAccounts(accounts, (err, response) => {
//     if (err) {
//       /* eslint no-console: ["error", { allow: ["warn", "error"] }] */
//       console.error('getPendingClaimedAccounts:', err);
//       return callback();
//     }
//     if (response) {
//       response.forEach((el) => {
//         if (el) {
//           result[el.name] = el.pending_claimed_accounts;
//         }
//       });
//       callback(result);
//     } else {
//       callback(result);
//     }
//   });
// };

const validators = {
  accountNotExist,
  accountNameIsValid,
  validateEmail,
  validateEmailDomain,
  normalizeEmail,
  // getPendingClaimedAccounts,
  isEmail,
  emailValid,
  INVALID_ACCOUNTNAME_REASONS,
  INVALID_EMAIL_REASONS,
};

export default validators;
