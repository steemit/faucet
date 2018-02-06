const { ApiError } = require('./ApiError');
const validator = require('validator');
const badDomains = require('../bad-domains');

// https://github.com/steemit/condenser/blob/eaf8a02658b8deaef376ec90b81d0866e52582cc/app/utils/ChainValidation.js#L4
const validateAccountName = (rule, value, callback, intl) => {
  let i;
  let label;
  let len;
  let segment = '';

  if (!value) {
    if (callback) {
      return callback(intl.formatMessage({ id: 'error_username_required' }));
    }
    throw new ApiError({ type: 'error_username_required' });
  }

  const length = value.length;

  if (length < 3) {
    if (callback) {
      return callback(intl.formatMessage({ id: 'error_validation_account_min' }));
    }
    throw new ApiError({ type: 'error_validation_account_min' });
  }
  if (length > 16) {
    if (callback) {
      return callback(intl.formatMessage({ id: 'error_validation_account_max' }));
    }
    throw new ApiError({ type: 'error_validation_account_max' });
  }

  if (/\./.test(value)) {
    segment = '_segment';
  }

  const ref = value.split('.');

  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z]/.test(label)) {
      if (callback) {
        return callback(intl.formatMessage({ id: `error_validation_account${segment}_start` }));
      }
      throw new ApiError({ type: `error_validation_account${segment}_start` });
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      if (callback) {
        return callback(intl.formatMessage({ id: `error_validation_account${segment}_alpha` }));
      }
      throw new ApiError({ type: `error_validation_account${segment}_alpha` });
    }
    if (/--/.test(label)) {
      if (callback) {
        return callback(intl.formatMessage({ id: `error_validation_account${segment}_dash` }));
      }
      throw new ApiError({ type: `error_validation_account${segment}_dash` });
    }
    if (!/[a-z0-9]$/.test(label)) {
      if (callback) {
        return callback(intl.formatMessage({ id: `error_validation_account${segment}_end` }));
      }
      throw new ApiError({ type: `error_validation_account${segment}_end` });
    }
    if (!(label.length >= 3)) {
      if (callback) {
        return callback(intl.formatMessage({ id: `error_validation_account${segment}_min` }));
      }
      throw new ApiError({ type: `error_validation_account${segment}_min` });
    }
  }
  if (callback) {
    return callback();
  }
  return null;
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
      callback('This domain name is blacklisted, please provide another email');
    } else {
      callback();
    }
  } else {
    callback();
  }
};

module.exports = {
  validateAccountName,
  validateEmail,
  validateEmailDomain,
};
