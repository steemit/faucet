import steem from 'steem';

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
export const validateAccountName = (rule, value, callback) => {
  let i;
  let label;
  let len;
  let suffix;

  const length = value.length;
  const ref = value.split('.');

  suffix = 'Account name should ';
  if (!value) {
    return callback([`${suffix}not be empty`]);
  }
  if (length < 3) {
    return callback([`${suffix}be longer`]);
  }
  if (length > 16) {
    return callback([`${suffix}be shorter`]);
  }

  if (/\./.test(value)) {
    suffix = 'Each account segment should ';
  }

  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z]/.test(label)) {
      return callback([`${suffix}start with a letter`]);
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      return callback([`${suffix}have only letters, digits, or dashes`]);
    }
    if (/--/.test(label)) {
      return callback([`${suffix}have only one dash in a row`]);
    }
    if (!/[a-z0-9]$/.test(label)) {
      return callback([`${suffix}end with a letter or digit`]);
    }
    if (!(label.length >= 3)) {
      return callback([`${suffix}be longer`]);
    }
  }
  callback();
};
