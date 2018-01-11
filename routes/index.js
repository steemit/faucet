const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/.well-known/healthcheck.json', (req, res) => {
  res.json({ ok: true, date: new Date().toISOString() });
});

router.get('/*', (req, res) => {
  res.render('index', { title: 'Sign up on Steem' });
});

module.exports = router;
