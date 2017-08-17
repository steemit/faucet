const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

router.get('/request_email', async (req, res) => {
  if (!req.query.email) {
    res.status(400).json({ error: 'Email is required.' });
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

      const token = jwt.sign({
        email: req.query.email,
      }, process.env.JWT_SECRET);

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
        }).then(() => {
          res.json({ success: true, token });
        });
      } else {
        res.json({ success: true, token });
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

router.get('/confirm_email', (req, res) => {
  res.json({});
});

module.exports = router;
