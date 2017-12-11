import steem from '@steemit/steem-js';
import validator from 'validator';
import badDomains from '../../bad-domains';

export const accountNotExist = (rule, value, callback) => {
  steem.api.getAccounts([value], (err, result) => {
    if (result[0]) {
      callback(['Account name is not available']);
    } else {
      callback();
    }
  });
};

// https://github.com/steemit/condenser/blob/eaf8a02658b8deaef376ec90b81d0866e52582cc/app/utils/ChainValidation.js#L4
export const validateAccountName = (rule, value, callback, intl) => {
  let i;
  let label;
  let len;
  let segment = '';

  if (!value) {
    return callback(intl.formatMessage({ id: 'error_username_required' }));
  }

  const length = value.length;

  if (length < 3) {
    return callback(intl.formatMessage({ id: 'error_validation_account_min' }));
  }
  if (length > 16) {
    return callback(intl.formatMessage({ id: 'error_validation_account_max' }));
  }

  if (/\./.test(value)) {
    segment = '_segment';
  }

  const ref = value.split('.');

  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z]/.test(label)) {
      return callback(intl.formatMessage({ id: `error_validation_account${segment}_start` }));
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      return callback(intl.formatMessage({ id: `error_validation_account${segment}_alpha` }));
    }
    if (/--/.test(label)) {
      return callback(intl.formatMessage({ id: `error_validation_account${segment}_dash` }));
    }
    if (!/[a-z0-9]$/.test(label)) {
      return callback(intl.formatMessage({ id: `error_validation_account${segment}_end` }));
    }
    if (!(label.length >= 3)) {
      return callback(intl.formatMessage({ id: `error_validation_account${segment}_min` }));
    }
  }
  return callback();
};

export const validateEmail = (rule, value, callback) => {
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

export const validateEmailDomain = (rule, value, callback) => {
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
