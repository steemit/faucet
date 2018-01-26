const cloneDeep = require('lodash/cloneDeep');
const util = require('util');
const express = require('express');
const fetch = require('isomorphic-fetch');
const steem = require('@steemit/steem-js');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const generateCode = require('../src/utils/phone-utils').generateCode;
const { checkStatus } = require('../src/utils/fetch');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const badDomains = require('../bad-domains');

const conveyorAccount = process.env.CONVEYOR_USERNAME;
const conveyorKey = process.env.CONVEYOR_POSTING_WIF;
const conveyor = cloneDeep(steem);

conveyor.api.setOptions({ url: 'https://conveyor.steemitdev.com' });
conveyor.api.signedCall = util.promisify(conveyor.api.signedCall).bind(conveyor.api);

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
    handler(req, res).then((result) => {
      res.json(result);
    }).catch((error) => {
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

/**
 * Checks for the email step
 * Recaptcha, bad domains and existence with conveyor are verified
 * A token containing the email is generated for the next steps
 * The user is then temporary stored in the database until the process is completed
 * and his account created in the Steem blockchain
 * NB: Chinese residents can't use google services so we skip the recaptcha validation for them
 */
router.get('/request_email', apiMiddleware(async (req) => {
  const location = req.geoip.get(req.ip);
  let skipRecaptcha = false;
  if (location && location.country && location.country.iso_code === 'CN') {
    skipRecaptcha = true;
  }
  if (!skipRecaptcha && !req.query.recaptcha) {
    throw new ApiError({ type: 'error_api_recaptcha_required', field: 'recaptcha' });
  }

  if (!req.query.email) {
    throw new ApiError({ type: 'error_api_email_required', field: 'email' });
  }
  if (!validator.isEmail(req.query.email)) {
    throw new ApiError({ type: 'error_api_email_format', field: 'email' });
  }
  if (badDomains.includes(req.query.email.split('@')[1])) {
    throw new ApiError({ type: 'error_api_domain_blacklisted', field: 'email' });
  }

  const userCount = await req.db.users.count({
    where: {
      email: req.query.email,
      email_is_verified: true,
    },
  });
  if (userCount > 0) {
    throw new ApiError({ type: 'error_api_email_used', field: 'email' });
  }

  const emailRegistered = await conveyor.api.signedCall(
    'conveyor.is_email_registered', [req.query.email],
    conveyorAccount, conveyorKey,
  );
  if (emailRegistered) {
    throw new ApiError({ type: 'error_api_email_used', field: 'email' });
  }

  if (!skipRecaptcha) {
    try {
      await verifyCaptcha(req.query.recaptcha, req.ip);
    } catch (cause) {
      throw new ApiError({ type: 'error_api_recaptcha_invalid', field: 'recaptcha', cause });
    }
  }

  const userExist = await req.db.users.count({
    where: {
      email: req.query.email,
    },
  });

  const token = jwt.sign({
    type: 'signup',
    email: req.query.email,
  }, process.env.JWT_SECRET);

  if (userExist === 0) {
    await req.db.users.create({
      email: req.query.email,
      email_is_verified: false,
      last_attempt_verify_email: null,
      phone_number: '',
      phone_number_is_verified: false,
      last_attempt_verify_phone_number: null,
      ip: req.ip,
      account_is_created: false,
      created_at: new Date(),
      updated_at: null,
      fingerprint: JSON.parse(req.query.fingerprint),
      metadata: { query: JSON.parse(req.query.query) },
      username: req.query.username,
      username_booked_at: new Date(),
    });
  } else {
    await req.db.users.update({
      username: req.query.username,
      username_booked_at: new Date(),
    }, { where: { email: req.query.email } });
  }

  return { success: true, token };
}));

/**
 * Checks the phone validity and use with the conveyor
 * The user can only request one code every minute to prevent flood
 */
router.get('/request_sms', apiMiddleware(async (req) => {
  const decoded = verifyToken(req.query.token, 'signup');

  if (!req.query.phoneNumber) {
    throw new ApiError({ type: 'error_api_phone_required', field: 'phoneNumber' });
  }
  if (!req.query.prefix) {
    throw new ApiError({ type: 'error_api_country_code_required', field: 'prefix' });
  }

  const countryCode = req.query.prefix.split('_')[1];
  if (!countryCode) {
    throw new ApiError({ field: 'prefix', type: 'error_api_prefix_invalid' });
  }

  const phoneNumber = phoneUtil.format(
    phoneUtil.parse(req.query.phoneNumber, countryCode),
    PNF.INTERNATIONAL,
  );
  const user = await req.db.users.findOne({
    where: {
      email: decoded.email,
    },
  });

  if (!user) {
    throw new ApiError({ field: 'phoneNumber', type: 'error_api_unknown_user' });
  }

  const date = new Date();
  const oneMinLater = new Date(date.setTime(date.getTime() - 60000));

  if (
    user.last_attempt_verify_phone_number &&
    user.last_attempt_verify_phone_number.getTime() > oneMinLater
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

  const phoneRegistered = await conveyor.api.signedCall('conveyor.is_phone_registered', [phoneNumber.replace(/\s*/g, '')], conveyorAccount, conveyorKey);
  if (phoneRegistered) {
    throw new ApiError({ field: 'phoneNumber', type: 'error_api_phone_used' });
  }

  const phoneCode = generateCode(5);
  await req.db.users.update({
    last_attempt_verify_phone_number: new Date(),
    phone_code: phoneCode,
    phone_number: phoneNumber,
    phone_code_attempts: 0,
  }, { where: { email: decoded.email } });

  await req.twilio.messages.create({
    body: `${phoneCode} is your Steem confirmation code`,
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
  });

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
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

/**
 * Verify the SMS code and then ask the gatekeeper for the status of the account
 * do decide the next step
 */
router.get('/confirm_sms', apiMiddleware(async (req) => {
  const decoded = verifyToken(req.query.token, 'signup');

  if (!req.query.code) {
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
  if (user.phone_code !== req.query.code) {
    req.db.users.update(
      { phone_code_attempts: user.phone_code_attempts + 1 },
      { where: { email: decoded.email } },
    ).catch((error) => {
      req.log.error(error, 'Unable to update number of failed attempts');
    });
    throw new ApiError({ field: 'code', type: 'error_api_code_invalid' });
  }

  await req.db.users.update({
    phone_number_is_verified: true,
    phone_code_attempts: user.phone_code_attempts + 1,
  }, { where: { email: decoded.email } });

  sendAccountInformation(req, decoded.email).catch((error) => {
    // TODO: this should be put in a queue and retry on error
    req.log.error(error, 'Unable to send verification mail');
  });

  return { success: true };
}));

/** Return the country code using maxmind database */
router.get('/guess_country', apiMiddleware(async (req) => {
  const location = req.geoip.get(req.ip);
  return { location };
}));

/**
 * After the account approval, the user receive an email to continue the creation process.
 * We verify that the account is confirmed, confirm the email
 * and initialize his username if it's still available
 * Rejected accounts are marked as pending review
 */
router.get('/confirm_account', apiMiddleware(async (req) => {
  const decoded = verifyToken(req.query.token, 'create_account');
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
    return { success: true, username: '', reservedUsername: user.username };
  }
  return { success: true, username: user.username, reservedUsername: '', query: user.metadata.query };
}));

/**
 * Create the account on the blockchain using steem-js
 * Send the data to the conveyor that will store the user account
 * Remove the user information from our database
 */
router.get('/create_account', apiMiddleware(async (req) => {
  const { username, public_keys, token } = req.query; // eslint-disable-line camelcase
  const decoded = verifyToken(token, 'create_account');
  if (!username) {
    throw new ApiError({ type: 'error_api_username_required' });
  }
  if (!public_keys) { // eslint-disable-line camelcase
    throw new ApiError({ type: 'error_api_public_keys_required' });
  }

  const user = await req.db.users.findOne({ where: { email: decoded.email } });
  if (!user) {
    throw new ApiError({ type: 'error_api_user_exists_not' });
  }
  if (user.status !== 'approved') {
    throw new ApiError({ type: 'error_api_account_verification_pending' });
  }

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
    throw new ApiError({ type: 'error_api_create_account', cause });
  }

  const params = [username, { phone: user.phone_number.replace(/\s*/g, ''), email: user.email }];
  conveyor.api.signedCall('conveyor.set_user_data', params, conveyorAccount, conveyorKey).then(() => {
    const rv = req.db.users.destroy({ where: { email: decoded.email } });
    return rv;
  }).catch((error) => {
    // TODO: this should be put in a queue and retry on error
    req.log.error(error, 'Unable to store user data in conveyor');
  });

  return { success: true };
}));

/**
 * Endpoint called by the faucet admin to approve accounts
 * The email allowing the users to continue the creation process is sent
 * to all approved accounts
 */
router.get('/approve_account', apiMiddleware(async (req) => {
  const decoded = verifyToken(req.query.token);
  await Promise.all(decoded.emails.map(email => approveAccount(req, email)));
  return { success: true };
}));

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
router.post('/check_username', apiMiddleware(async (req) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    throw new ApiError({ type: 'error_api_username_invalid' });
  }
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
