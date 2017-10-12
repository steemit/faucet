const express = require('express');
const fetch = require('isomorphic-fetch');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const steem = require('steem');
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
    const errors = [{ field: 'email', error: 'Email already verified' }];
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
        const errors = [{ field: 'email', error: 'Failed to send confirmation email' }];
        res.status(500).json({ errors });
      }
    });
  } else {
    const errors = [{ field: 'email', error: 'Please wait at least one minute between retries' }];
    res.status(400).json({ errors });
  }
};

router.get('/request_email', async (req, res) => {
  const errors = [];
  if (!req.query.recaptcha) {
    errors.push({ field: 'recaptcha', error: 'Recaptcha is required' });
  } else if (!req.query.email) {
    errors.push({ field: 'email', error: 'Email is required' });
  } else if (!validator.isEmail(req.query.email)) {
    errors.push({ field: 'email', error: 'Please provide a valid email' });
  } else if (badDomains.includes(req.query.email.split('@')[1])) {
    errors.push({ field: 'email', error: 'This domain name is blacklisted, please provide another email' });
  } else {
    const userCount = await req.db.users.count({
      where: {
        email: req.query.email,
        email_is_verified: true,
      },
    });
    if (userCount > 0) {
      errors.push({ field: 'email', error: 'Email already used' });
    }
  }

  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${req.query.recaptcha}&remoteip=${req.ip}`);
  const body = await response.json();
  if (!body.success) {
    errors.push({ field: 'recaptcha', error: 'Recaptcha is invalid' });
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
    errors.push({ field: 'phoneNumber', error: 'Token is required' });
  }
  if (!req.query.phoneNumber) {
    errors.push({ field: 'phoneNumber', error: 'Phone number is required' });
  }
  if (!req.query.prefix) {
    errors.push({ field: 'prefix', error: 'Country code is required' });
  }

  try {
    decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
  } catch (err) {
    errors.push({ field: 'phoneNumber', error: 'Invalid token' });
  }
  if (errors.length === 0) {
    if (decoded && decoded.type === 'signup') {
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
          errors.push({ field: 'phoneNumber', error: 'Unknown user' });
        } else if (user.last_attempt_verify_phone_number &&
          user.last_attempt_verify_phone_number.getTime() > oneMinLater
        ) {
          errors.push({ field: 'phoneNumber', error: 'Please wait at least one minute between retries' });
        }

        const phoneExists = await req.db.users.count({
          where: {
            phone_number: phoneNumber,
            phone_number_is_verified: true,
          },
        });

        if (phoneExists > 0) {
          errors.push({ field: 'phoneNumber', error: 'Phone number already used' });
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
        errors.push({ field: 'prefix', error: `Invalid prefix: ${countryPrefix} ${countryCode}` });
      }
    } else {
      errors.push({ field: 'phoneNumber', error: 'Invalid token type' });
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
    const result = await fetch('http://localhost:3000/api/check')
      .then(checkStatus)
      .then(res => res.text());

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
    errors.push({ field: 'code', error: 'Token is required' });
  }
  if (!req.query.code) {
    errors.push({ field: 'code', error: 'Code is required' });
  }

  try {
    decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
  } catch (err) {
    errors.push({ field: 'code', error: 'Invalid token' });
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
          errors.push({ field: 'code', error: 'Phone already verified' });
        } else if (user.phone_code_attempts >= 5) {
          errors.push({ field: 'code', error: 'Too many attempts, please request a new code' });
        } else if (user.phone_code !== req.query.code) {
          errors.push({ field: 'code', error: 'Invalid code' });
          req.db.users.update({
            phone_code_attempts: user.phone_code_attempts + 1,
          }, { where: { email: decoded.email } });
        } else if (user.phone_code === req.query.code) {
          await req.db.users.update({
            phone_number_is_verified: true,
            phone_code_attempts: user.phone_code_attempts + 1,
          }, { where: { email: decoded.email } });
          await sendAccountInformation(req, decoded.email);
          res.json({ success: true });
        }
      } else {
        errors.push({ field: 'code', error: 'Unknown user' });
      }
    } else {
      errors.push({ field: 'code', error: 'Invalid token type' });
    }
  }
  if (errors.length > 0) {
    res.status(500).json({ errors });
  }
});

router.get('/confirm_email', async (req, res) => {
  if (!req.query.token) {
    res.status(400).json({ error: 'Token is required' });
  } else {
    let decoded;
    try {
      decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      if (decoded.type === 'confirm_email') {
        const user = await req.db.users.findOne({ where: { email: decoded.email } });
        if (!user) {
          res.status(400).json({ error: 'Email doesn\'t exist' });
        } else if (user.email_is_verified) {
          res.status(400).json({ error: 'Email already verified' });
        } else {
          await req.db.users.update({
            email_is_verified: true,
          }, { where: { email: decoded.email } });
          await sendAccountInformation(req, decoded.email);
          res.json({ success: true });
        }
      } else {
        res.status(400).json({ error: 'Invalid token' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Invalid token' });
    }
  }
});

router.get('/guess_country', (req, res) => {
  const location = req.geoip.get(req.ip);
  res.json({ location });
});

router.get('/approve_account', async (req, res) => {
  try {
    await approveAccount(req, req.query.email);
    res.json({ success: true });
  } catch (err) {
    const errors = [{ field: 'email', error: 'Failed to send approve account email' }];
    res.status(500).json({ errors });
  }
});

router.get('/reject_account', async (req, res) => {
  try {
    await rejectAccount(req, req.query.email);
    res.json({ success: true });
  } catch (err) {
    const errors = [{ field: 'email', error: 'Failed to send reject account email' }];
    res.status(500).json({ errors });
  }
});

router.get('/check_username', async (req, res) => {
  const username = req.query.username;
  const accounts = await steem.api.getAccountsAsync([req.query.username]);
  if (accounts && accounts.length > 0 && accounts.find(a => a.name === username)) {
    res.json({ error: 'Username already used' });
  }

  const user = await req.db.users.findOne({ where: { username }, order: 'username_booked_at DESC' });
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (user && (user.username_booked_at.getTime() + oneWeek) >= new Date().getTime()) {
    res.json({ error: 'Username reserved' });
  }

  res.json({ success: true });
});

module.exports = router;
