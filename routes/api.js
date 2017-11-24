const express = require('express');
const fetch = require('isomorphic-fetch');
const steem = require('steem');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const generateCode = require('../src/utils/phone-utils').generateCode;
const { checkStatus } = require('../src/utils/fetch');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const badDomains = require('../bad-domains');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

const sendConfirmationEmail = async (req, res) => {
  const date = new Date();
  const oneMinLater = new Date(date.setTime(date.getTime() - 60000));
  const user = await req.db.users.findOne({ where: { email: req.query.email } });

  if (user.email_is_verified) {
    const errors = [{ field: 'email', error: 'error_api_email_verified' }];
    res.status(400).json({ errors });
  } else if (
    !user.last_attempt_verify_email ||
    user.last_attempt_verify_email.getTime() < oneMinLater
  ) {
    // create an email token valid for 24 hours
    const mailToken = jwt.sign({
      type: 'confirm_email',
      email: req.query.email,
    }, process.env.JWT_SECRET, { expiresIn: '1d' });
    req.mail.send(req.query.email, 'confirm_email', {
      url: `${req.protocol}://${req.get('host')}/confirm-email?token=${mailToken}`,
    },
    (err) => {
      if (!err) {
        const token = jwt.sign({
          type: 'signup',
          email: req.query.email,
        }, process.env.JWT_SECRET);

        req.db.users.update({
          last_attempt_verify_email: new Date(),
        }, { where: { email: req.query.email } });

        res.json({ success: true, token });
      } else {
        const errors = [{ field: 'email', error: 'error_api_sent_email_failed' }];
        res.status(500).json({ errors });
      }
    });
  } else {
    const errors = [{ field: 'email', error: 'error_api_wait' }];
    res.status(400).json({ errors });
  }
};

router.get('/request_email', async (req, res) => {
  const errors = [];
  if (!req.query.recaptcha) {
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
    }
  }

  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${req.query.recaptcha}&remoteip=${req.ip}`);
  const body = await response.json();
  if (!body.success) {
    errors.push({ field: 'recaptcha', error: 'error_api_recaptcha_invalid' });
  }

  if (errors.length === 0) {
    const userExist = await req.db.users.count({
      where: {
        email: req.query.email,
      },
    });

    if (userExist === 0) {
      req.db.users.create({
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
        username: req.query.username,
        username_booked_at: new Date(),
      }).then(async () => { await sendConfirmationEmail(req, res); });
    } else {
      req.db.users.update({
        username: req.query.username,
        username_booked_at: new Date(),
      }, { where: { email: req.query.email } });

      await sendConfirmationEmail(req, res);
    }
  } else {
    res.status(400).json({ errors });
  }
});

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
            body: `${phoneCode} is your SteemConnect confirmation code`,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
          }).then(() => {
            res.json({ success: true });
          }).catch((error) => {
            const status = error.status || 400;
            res.status(status).json(error);
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

  await req.mail.send(email, 'reject_account', {},
    (err) => {
      if (err) {
        throw new Error(err);
      }
    });
};

const approveAccount = async (req, email) => {
  await req.db.users.update({
    status: 'approved',
  }, { where: { email } });

  const mailToken = jwt.sign({
    type: 'create_account',
    email,
  }, process.env.JWT_SECRET, { expiresIn: '7d' });

  req.mail.send(email, 'create_account', {
    url: `${req.protocol}://${req.get('host')}/create-account?token=${mailToken}`,
  },
  (err) => {
    if (err) {
      throw new Error(err);
    }
  });
};

const sendAccountInformation = async (req, email) => {
  const user = await req.db.users.findOne({ where: { email } });
  if (user && user.email_is_verified && user.phone_number_is_verified) {
    // TODO change to the steemit endpoint
    let result;
    try {
      result = await fetch(`${req.protocol}://${req.get('host')}/api/check`)
        .then(checkStatus)
        .then(res => res.text());
    } catch (err) {
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
          }, { where: { email: decoded.email } });
          await sendAccountInformation(req, decoded.email);
          res.json({ success: true, completed: user.email_is_verified });
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

router.get('/confirm_email', async (req, res) => {
  if (!req.query.token) {
    res.status(400).json({ error: 'error_api_token_required' });
  } else {
    let decoded;
    try {
      decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      if (decoded.type === 'confirm_email') {
        const user = await req.db.users.findOne({ where: { email: decoded.email } });
        const token = jwt.sign({
          type: 'signup',
          email: decoded.email,
        }, process.env.JWT_SECRET);
        if (!user) {
          res.status(400).json({ error: 'error_api_email_exists_not' });
        } else {
          if (!user.email_is_verified) {
            await req.db.users.update({
              email_is_verified: true,
            }, { where: { email: decoded.email } });
            await sendAccountInformation(req, decoded.email);
          }
          res.json({
            success: true,
            completed: user.phone_number_is_verified,
            email: user.email,
            username: user.username,
            token,
          });
        }
      } else {
        res.status(400).json({ error: 'error_api_token_invalid' });
      }
    } catch (err) {
      res.status(500).json({ error: 'error_api_token_invalid' });
    }
  }
});

router.get('/guess_country', (req, res) => {
  const location = req.geoip.get(req.ip);
  res.json({ location });
});

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
          const accounts = await steem.api.getAccountsAsync([user.username]);
          if (accounts && accounts.length > 0 && accounts.find(a => a.name === user.username)) {
            res.json({ success: true, username: '', reservedUsername: user.username });
          }
          res.json({ success: true, username: user.username, reservedUsername: '' });
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
        if (user.status === 'approved') {
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
            (err) => {
              if (err) {
                console.log(err);
                res.status(500).json({ error: 'error_api_create_account', detail: err });
              } else {
                req.db.users.update({
                  username: req.query.username,
                  status: 'created',
                }, { where: { email: decoded.email } });

                res.json({ success: true });
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

router.get('/check_username', async (req, res) => {
  const username = req.query.username;
  const accounts = await steem.api.getAccountsAsync([req.query.username]);
  if (accounts && accounts.length > 0 && accounts.find(a => a.name === username)) {
    res.json({ error: 'error_api_username_used' });
  } else {
    const user = await req.db.users.findOne({ where: { username, email_is_verified: true }, order: 'username_booked_at DESC' });
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (
      user &&
      (user.username_booked_at.getTime() + oneWeek) >= new Date().getTime() &&
      user.email !== req.query.email
    ) {
      res.json({ error: 'error_api_username_reserved' });
    } else {
      res.json({ success: true });
    }
  }
});

module.exports = router;
