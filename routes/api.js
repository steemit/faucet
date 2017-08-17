const express = require('express');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

const sendConfirmationEmail = async (req, res) => {
  const date = new Date();
  const oneMinLater = new Date(date.setTime(date.getTime() - 60000));
  const user = await req.db.users.findOne({ where: { email: req.query.email } });

  if (user.email_is_verified) {
    res.status(400).json({ error: 'Email already verified.' });
  } else if (
    !user.last_attempt_verify_email ||
    user.last_attempt_verify_email.getTime() < oneMinLater
  ) {
    // create an email token valid for 24 hours
    const emailExpireAt = new Date(date.setTime(date.getTime() + 86460000));
    const mailToken = jwt.sign({
      email: req.query.email,
      emailExpireAt,
    }, process.env.JWT_SECRET);
    req.mail.send(req.query.email, 'confirm_email', {
      url: `${req.protocol}://${req.get('host')}/confirmemail?token=${mailToken}`,
    },
    (err) => {
      if (!err) {
        const token = jwt.sign({
          email: req.query.email,
        }, process.env.JWT_SECRET);

        req.db.users.update({
          last_attempt_verify_email: new Date(),
        }, { where: { email: req.query.email } });

        res.json({ success: true, token });
      } else {
        res.status(500).json({ error: 'Failed to send confirmation email.' });
      }
    });
  } else {
    res.status(400).json({ error: 'Please wait at least one minute between retries.' });
  }
};

router.get('/request_email', async (req, res) => {
  if (!req.query.email) {
    res.status(400).json({ error: 'Email is required.' });
  } else if (!validator.isEmail(req.query.email)) {
    res.status(400).json({ error: 'Please provide a valid email.' });
  } else {
    const userCount = await req.db.users.count({
      where: {
        email: req.query.email,
        email_is_verified: true,
      },
    });

    if (userCount > 0) {
      res.status(400).json({ error: 'Email already used.' });
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
        }).then(() => sendConfirmationEmail(req, res));
      } else {
        await sendConfirmationEmail(req, res);
      }
    }
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
      if (new Date(decoded.emailExpireAt).getTime() > new Date().getTime()) {
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
        res.status(400).json({ error: 'Token expired, please try again' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Invalid token.' });
    }
  }
});

module.exports = router;
