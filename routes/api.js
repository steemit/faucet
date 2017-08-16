const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

router.get('/request_email', (req, res) => {
  res.json({});
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
