const validator = require('validator');
const badDomains = require('../bad-domains');

// https://github.com/steemit/condenser/blob/eaf8a02658b8deaef376ec90b81d0866e52582cc/app/utils/ChainValidation.js#L4
const validateAccountName = (value) => {
  let i;
  let label;
  let len;
  let segment = '';

  if (!value) {
    return 'error_username_required';
  }

  const length = value.length;

  if (length < 3) {
    return 'error_validation_account_min';
  }
  if (length > 16) {
    return 'error_validation_account_max';
  }

  if (/\./.test(value)) {
    segment = '_segment';
  }

  const ref = value.split('.');

  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z]/.test(label)) {
      return `error_validation_account${segment}_start`;
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      return `error_validation_account${segment}_alpha`;
    }
    if (/--/.test(label)) {
      return `error_validation_account${segment}_dash`;
    }
    if (!/[a-z0-9]$/.test(label)) {
      return `error_validation_account${segment}_end`;
    }
    if (!(label.length >= 3)) {
      return `error_validation_account${segment}_min`;
    }
  }
  return null;
};

const validateEmail = (value) => {
  if (value) {
    if (!validator.isEmail(value)) {
      return 'Please input a valid email address';
    }
  }
  return null;
};

const validateEmailDomain = (value) => {
  if (value) {
    const [email, domain] = value.split('@'); // eslint-disable-line no-unused-vars
    if (domain && badDomains.includes(domain)) {
      return 'This domain name is blacklisted, please provide another email';
    }
  }
  return null;
};

module.exports = {
  validateAccountName,
  validateEmail,
  validateEmailDomain,
};
