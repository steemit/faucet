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

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

/**
 * Checks for the email step
 * Recaptcha, bad domains and existence with conveyor are verified
 * A token containing the email is generated for the next steps
 * The user is then temporary stored in the database until the process is completed
 * and his account created in the Steem blockchain
 * NB: Chinese residents can't use google services so we skip the recaptcha validation for them
 */
router.get('/request_email', async (req, res) => {
  const errors = [];
  const location = req.geoip.get(req.ip);
  let skipRecaptcha = false;
  if (location && location.country && location.country.iso_code === 'CN') {
    skipRecaptcha = true;
  }
  if (!skipRecaptcha && !req.query.recaptcha) {
    errors.push({ field: 'recaptcha', error: 'error_api_recaptcha_required' });
  } else if (!req.query.email) {
    errors.push({ field: 'email', error: 'error_api_email_required' });
  } else if (!validator.isEmail(req.query.email)) {
    errors.push({ field: 'email', error: 'error_api_email_format' });
  } else if (badDomains.includes(req.query.email.split('@')[1])) {
    errors.push({ field: 'email', error: 'error_api_domain_blacklisted' });
  } else {
    const userCount = await req.db.users.count({
      where: {
        email: req.query.email,
        email_is_verified: true,
      },
    });
    if (userCount > 0) {
      errors.push({ field: 'email', error: 'error_api_email_used' });
    } else {
      try {
        const emailRegistered = await conveyor.api.signedCall('conveyor.is_email_registered', [req.query.email], conveyorAccount, conveyorKey);
        if (emailRegistered) {
          errors.push({ field: 'email', error: 'error_api_email_used' });
        }
      } catch (err) {
        req.log.error(err, '/request_email', 'conveyor.is_email_registered');
        errors.push({ field: 'email', error: 'error_api_general' });
      }
    }
  }

  if (!skipRecaptcha) {
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${req.query.recaptcha}&remoteip=${req.ip}`);
    const body = await response.json();
    if (!body.success) {
      errors.push({ field: 'recaptcha', error: 'error_api_recaptcha_invalid' });
    }
  }

  if (errors.length === 0) {
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
      res.json({ success: true, token });
    } else {
      await req.db.users.update({
        username: req.query.username,
        username_booked_at: new Date(),
      }, { where: { email: req.query.email } });
      res.json({ success: true, token });
    }
  } else {
    res.status(400).json({ errors });
  }
});

/**
 * Checks the phone validity and use with the conveyor
 * The user can only request one code every minute to prevent flood
 */
router.get('/request_sms', async (req, res) => {
  let decoded;
  const errors = [];

  if (!req.query.token) {
    errors.push({ field: 'phoneNumber', error: 'error_api_token_required' });
  }
  if (!req.query.phoneNumber) {
    errors.push({ field: 'phoneNumber', error: 'error_api_phone_required' });
  }
  if (!req.query.prefix) {
    errors.push({ field: 'prefix', error: 'error_api_country_code_required' });
  }

  try {
    decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
  } catch (err) {
    errors.push({ field: 'phoneNumber', error: 'error_api_token_invalid' });
  }
  if (errors.length === 0) {
    if (decoded && decoded.type === 'signup') {
      // eslint-disable-next-line no-unused-vars
      const [countryPrefix, countryCode] = req.query.prefix.split('_');
      if (countryCode) {
        const phoneNumber = phoneUtil.format(
          phoneUtil.parse(req.query.phoneNumber, countryCode),
          PNF.INTERNATIONAL);
        const user = await req.db.users.findOne({
          where: {
            email: decoded.email,
          },
        });

        const date = new Date();
        const oneMinLater = new Date(date.setTime(date.getTime() - 60000));

        if (!user) {
          errors.push({ field: 'phoneNumber', error: 'error_api_unknown_user' });
        } else if (user.last_attempt_verify_phone_number &&
          user.last_attempt_verify_phone_number.getTime() > oneMinLater
        ) {
          errors.push({ field: 'phoneNumber', error: 'error_api_wait' });
        }

        const phoneExists = await req.db.users.count({
          where: {
            phone_number: phoneNumber,
            phone_number_is_verified: true,
          },
        });

        if (phoneExists > 0) {
          errors.push({ field: 'phoneNumber', error: 'error_api_phone_used' });
        } else {
          try {
            const phoneRegistered = await conveyor.api.signedCall('conveyor.is_phone_registered', [phoneNumber.replace(/\s*/g, '')], conveyorAccount, conveyorKey);
            if (phoneRegistered) {
              errors.push({ field: 'phoneNumber', error: 'error_api_phone_used' });
            }
          } catch (err) {
            req.log.error(err, '/request_sms', 'conveyor.is_phone_registered');
            errors.push({ field: 'phoneNumber', error: 'error_api_general' });
          }
        }

        if (errors.length === 0) {
          const phoneCode = generateCode(5);
          req.db.users.update({
            last_attempt_verify_phone_number: new Date(),
            phone_code: phoneCode,
            phone_number: phoneNumber,
            phone_code_attempts: 0,
          }, { where: { email: decoded.email } });

          req.twilio.messages.create({
            body: `${phoneCode} is your Steem confirmation code`,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
          }).then(() => {
            res.json({ success: true, phoneNumber });
          }).catch((error) => {
            req.log.error('/request_sms', 'req.twilio.messages.create', error);
            errors.push({ field: 'phoneNumber', error: 'error_api_general' });
            res.status(500).json({ errors });
          });
        }
      } else {
        errors.push({ field: 'prefix', error: 'error_api_prefix_invalid' });
      }
    } else {
      errors.push({ field: 'phoneNumber', error: 'error_api_token_invalid_type' });
    }
  }
  if (errors.length > 0) {
    res.status(500).json({ errors });
  }
});

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

const rejectAccount = async (req, email, locale) => {
  await req.db.users.update({
    status: 'rejected',
  }, { where: { email } });

  await req.mail.send(email, 'reject_account', locale, {},
    (err) => {
      if (err) {
        throw new Error(err);
      }
    });
};

/**
 * Send the email to user to continue the account creation process
 */
const approveAccount = async (req, email, locale) => {
  try {
    const mailToken = jwt.sign({
      type: 'create_account',
      email,
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    req.mail.send(email, 'create_account', locale, {
      url: `${req.protocol}://${req.get('host')}/create-account?token=${mailToken}`,
    },
    (err) => {
      if (err) {
        throw new Error(err);
      }
    });
  } catch (err) {
    req.log.error(err, 'approveAccount');
  }
};

/**
 * Check for the status of an account using the steemit gatekeeper
 * An account can have approved, rejected or manual_review status
 */
const sendAccountInformation = async (req, email, locale) => {
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
      await rejectAccount(req, email, locale);
    } else if (result === 'approved') {
      await approveAccount(req, email, locale);
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
router.get('/confirm_sms', async (req, res) => {
  let decoded;
  const errors = [];

  if (!req.query.token) {
    errors.push({ field: 'code', error: 'error_api_token_required' });
  }
  if (!req.query.code) {
    errors.push({ field: 'code', error: 'error_api_code_required' });
  }

  try {
    decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
  } catch (err) {
    errors.push({ field: 'code', error: 'error_api_token_invalid' });
  }

  if (errors.length === 0) {
    if (decoded && decoded.type === 'signup') {
      const user = await req.db.users.findOne({
        where: {
          email: decoded.email,
        },
      });
      if (user) {
        if (user.phone_number_is_verified) {
          errors.push({ field: 'code', error: 'error_api_phone_verified' });
        } else if (user.phone_code_attempts >= 5) {
          errors.push({ field: 'code', error: 'error_api_phone_too_many' });
        } else if (user.phone_code !== req.query.code) {
          errors.push({ field: 'code', error: 'error_api_code_invalid' });
          req.db.users.update({
            phone_code_attempts: user.phone_code_attempts + 1,
          }, { where: { email: decoded.email } });
        } else if (user.phone_code === req.query.code) {
          await req.db.users.update({
            phone_number_is_verified: true,
            phone_code_attempts: user.phone_code_attempts + 1,
            locale: req.query.locale || 'en',
          }, { where: { email: decoded.email } });
          await sendAccountInformation(req, decoded.email, req.query.locale || 'en');
          res.json({ success: true });
        }
      } else {
        errors.push({ field: 'code', error: 'error_api_unknown_user' });
      }
    } else {
      errors.push({ field: 'code', error: 'error_api_token_invalid_type' });
    }
  }
  if (errors.length > 0) {
    res.status(500).json({ errors });
  }
});

/** Return the country code using maxmind database */
router.get('/guess_country', (req, res) => {
  const location = req.geoip.get(req.ip);
  res.json({ location });
});

/**
 * After the account approval, the user receive an email to continue the creation process.
 * We verify that the account is confirmed, confirm the email
 * and initialize his username if it's still available
 * Rejected accounts are marked as pending review
 */
router.get('/confirm_account', async (req, res) => {
  if (!req.query.token) {
    res.status(400).json({ error: 'error_api_token_required' });
  } else {
    let decoded;
    try {
      decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      if (decoded.type === 'create_account') {
        const user = await req.db.users.findOne({ where: { email: decoded.email } });
        if (!user) {
          res.status(400).json({ error: 'error_api_user_exists_not' });
        } else if (user.status === 'manual_review' || user.status === 'rejected') {
          res.status(400).json({ error: 'error_api_account_verification_pending' });
        } else if (user.status === 'created') {
          res.status(400).json({ error: 'error_api_account_created' });
        } else if (user.status === 'approved') {
          await req.db.users.update({
            email_is_verified: true,
          }, { where: { email: decoded.email } });
          try {
            const accounts = await steem.api.getAccountsAsync([user.username]);
            if (accounts && accounts.length > 0 && accounts.find(a => a.name === user.username)) {
              res.json({ success: true, username: '', reservedUsername: user.username });
            }
            res.json({ success: true, username: user.username, reservedUsername: '', query: user.metadata.query });
          } catch (err) {
            req.log.error(err, '/confirm_account', 'steem.api.getAccountsAsync');
            res.status(500).json({ error: 'error_api_general' });
          }
        } else {
          res.status(400).json({ error: 'error_api_account_verification_pending' });
        }
      } else {
        res.status(400).json({ error: 'error_api_token_invalid' });
      }
    } catch (err) {
      res.status(500).json({ error: 'error_api_token_invalid' });
    }
  }
});

/**
 * Create the account on the blockchain using steem-js
 * Send the data to the conveyor that will store the user account
 * Remove the user information from our database
 */
router.get('/create_account', async (req, res) => {
  if (!req.query.token) {
    res.status(400).json({ error: 'error_api_token_required' });
  } else if (!req.query.username) {
    res.status(400).json({ error: 'error_api_username_required' });
  } else if (!req.query.public_keys) {
    res.status(400).json({ error: 'error_api_public_keys_required' });
  } else {
    let decoded;
    try {
      decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      if (decoded.type === 'create_account') {
        const user = await req.db.users.findOne({ where: { email: decoded.email } });
        if (!user) {
          res.status(400).json({ error: 'error_api_user_exists_not' });
        } else if (user.status === 'approved') {
          // eslint-disable-next-line camelcase
          const { username, public_keys } = req.query;
          const weightThreshold = 1;
          const accountAuths = [];
          const publicKeys = JSON.parse(public_keys);
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

          steem.broadcast.accountCreateWithDelegation(
            process.env.DELEGATOR_ACTIVE_WIF,
            process.env.CREATE_ACCOUNT_FEE,
            process.env.CREATE_ACCOUNT_DELEGATION,
            process.env.DELEGATOR_USERNAME,
            username,
            owner,
            active,
            posting,
            publicKeys.memo,
            JSON.stringify({}),
            [],
            async (err) => {
              if (err) {
                res.status(500).json({ error: 'error_api_create_account', detail: err });
              } else {
                const params = [username, { phone: user.phone_number.replace(/\s*/g, ''), email: user.email }];
                try {
                  await conveyor.api.signedCall('conveyor.set_user_data', params, conveyorAccount, conveyorKey);
                  req.db.users.destroy({ where: { email: decoded.email } });
                  res.json({ success: true });
                } catch (err2) {
                  req.log.error(err2, '/create_account', 'conveyor.set_user_data');
                  res.status(500).json({ error: 'error_api_general' });
                }
              }
            },
          );
        } else {
          res.status(400).json({ error: 'error_api_account_verification_pending' });
        }
      } else {
        res.status(400).json({ error: 'error_api_token_invalid' });
      }
    } catch (err) {
      res.status(500).json({ error: 'error_api_token_invalid' });
    }
  }
});

/**
 * Endpoint called by the faucet admin to approve accounts
 * The email allowing the users to continue the creation process is sent
 * to all approved accounts
 */
router.get('/approve_account', async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);

    await Promise.all(decoded.emails.map(email => (approveAccount(req, email))));
    res.json({ success: true });
  } catch (err) {
    const errors = [{ error: 'Failed to send approve account emails' }];
    res.status(500).json({ errors });
  }
});

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
router.get('/check_username', async (req, res) => {
  const username = req.query.username;
  let error = '';
  try {
    const accounts = await steem.api.getAccountsAsync([req.query.username]);
    if (accounts && accounts.length > 0 && accounts.find(a => a.name === username)) {
      error = 'error_api_username_used';
    }
  } catch (err) {
    req.log.error(err, '/check_username', 'steem.api.getAccountsAsync');
    error = 'error_api_general';
  }
  if (error === '') {
    const user = await req.db.users.findOne({ where: { username, email_is_verified: true }, order: [['username_booked_at', 'DESC']] });
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (
      user &&
      (user.username_booked_at.getTime() + oneWeek) >= new Date().getTime() &&
      user.email !== req.query.email
    ) {
      error = 'error_api_username_reserved';
    }
  }
  if (error !== '') {
    res.json({ error });
  } else {
    res.json({ success: true });
  }
});

module.exports = router;
