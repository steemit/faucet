const express = require('express');
const request = require('async-request');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

router.get('/submit_email', async (req, res) => {
  const response = await request('https://www.google.com/recaptcha/api/siteverify',{
    method: 'POST',
    data: {
      secret: process.env.RECAPTCHA_SECRET,
      response: req.query.recaptcha,
      remoteip: req.connection.remoteAddress
    }
  });

  const body = JSON.parse(response.body);
  if(body.success) {
    const userCount = await req.db.users.count({ where: { email: req.query.email } });
    if(userCount > 0) {
      res.json({ error: 'Email already used.'});
    } else
      res.json({ success: true });
  } else {
    res.json({ error: 'Recaptcha invalid.'});
  }
});

module.exports = router;
