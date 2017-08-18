const express = require('express');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const request = require('async-request');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

const sendConfirmationEmail = async (req, res) => {
  const date = new Date();
  const oneMinLater = new Date(date.setTime(date.getTime() - 60000));
  const user = await req.db.users.findOne({ where: { email: req.query.email } });

  if (user.email_is_verified) {
    const errors = [{ field: 'email', error: 'Email already verified.' }];
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
        const errors = [{ field: 'form', error: 'Failed to send confirmation email.' }];
        res.status(500).json({ errors });
      }
    });
  } else {
    const errors = [{ field: 'form', error: 'Please wait at least one minute between retries.' }];
    res.status(400).json({ errors });
  }
};

router.get('/request_email', async (req, res) => {
  const errors = [];
  if (!req.query.email) {
    errors.push({ field: 'email', error: 'Email is required.' });
  } else if (!validator.isEmail(req.query.email)) {
    errors.push({ field: 'email', error: 'Please provide a valid email' });
  }

  if (!req.query.recaptcha) {
    errors.push({ field: 'recaptcha', error: 'Recaptcha is required.' });
  } else {
    const response = await request('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      data: {
        secret: process.env.RECAPTCHA_SECRET,
        response: req.query.recaptcha,
        remoteip: req.connection.remoteAddress,
      },
    });

    const body = JSON.parse(response.body);
    if (!body.success) {
      errors.push({ field: 'recaptcha', error: 'Recaptcha is invalid.' });
    }
  }

  if (errors.length === 0) {
    const userCount = await req.db.users.count({
      where: {
        email: req.query.email,
        email_is_verified: true,
      },
    });

    if (userCount > 0) {
      errors.push({ field: 'email', error: 'Email already used.' });
      res.status(400).json({ errors });
    } else {
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
          ip: req.connection.remoteAddress,
          ua: req.headers['user-agent'],
          account_is_created: false,
          created_at: new Date(),
          updated_at: null,
        }).then(async () => { await sendConfirmationEmail(req, res); });
      } else {
        await sendConfirmationEmail(req, res);
      }
    }
  } else {
    res.status(400).json({ errors });
  }
});

router.get('/request_sms', (req, res) => {
  res.json({});
});

router.get('/confirm_sms', (req, res) => {
  res.json({});
});

router.get('/confirm_email', async (req, res) => {
  if (!req.query.token) {
    res.status(400).json({ error: 'Token is required.' });
  } else {
    let decoded;
    try {
      decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      if (decoded.type === 'confirm_email') {
        const user = await req.db.users.findOne({ where: { email: decoded.email } });
        if (!user) {
          res.status(400).json({ error: 'Email doesn\'t exist.' });
        } else if (user.email_is_verified) {
          res.status(400).json({ error: 'Email already verified.' });
        } else {
          req.db.users.update({
            email_is_verified: true,
          }, { where: { email: decoded.email } })
            .then(() => res.json({ success: true }));
        }
      } else {
        res.status(400).json({ error: 'Invalid token.' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Invalid token.' });
    }
  }
});

module.exports = router;
