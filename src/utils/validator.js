import steem from 'steem';
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

export const validateAccountNameMin = (rule, value, callback) => {
  if (value.length < 3) {
    callback(['Account name should be longer']);
  } else {
    callback();
  }
};

export const validateAccountNameMax = (rule, value, callback) => {
  if (value.length > 16) {
    callback(['Account name should be shorter']);
  } else {
    callback();
  }
};

export const validateAccountNameSegmentStart = (rule, value, callback) => {
  const ref = value.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    if (!/^[a-z]/.test(ref[i])) {
      callback(['Each account segment should start with a letter']);
      return;
    }
  }
  callback();
};

export const validateAccountNameSegmentAlphaNumeric = (rule, value, callback) => {
  const ref = value.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    if (!/^[a-z0-9-]*$/.test(ref[i])) {
      callback(['Each account segment should have only letters, digits, or dashes']);
      return;
    }
  }
  callback();
};

export const validateAccountNameSegmentDash = (rule, value, callback) => {
  const ref = value.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    if (/--/.test(ref[i])) {
      callback(['Each account segment should have only one dash in a row']);
      return;
    }
  }
  callback();
};

export const validateAccountNameSegmentEnd = (rule, value, callback) => {
  const ref = value.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    if (!/[a-z0-9]$/.test(ref[i])) {
      callback(['Each account segment should end with a letter or digit']);
      return;
    }
  }
  callback();
};

export const validateAccountNameSegmentMin = (rule, value, callback) => {
  const ref = value.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    if (!(ref[i].length >= 3)) {
      callback(['Each account segment should be longer']);
      return;
    }
  }
  callback();
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
