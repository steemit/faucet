const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  res.json({});
});

router.get('/submit_phone', (req, res) => {
  const { countryCode, phoneNumber } = req.query;
  req.twilio.messages.create({
    body: '12345 is your SteemConnect confirmation code',
    to: `+${countryCode}${phoneNumber}`,
    from: '+12062028357',
  }).then((result) => {
    res.json(result);
  }).catch((error) => {
    const status = error.status || 400;
    res.status(status).json(error);
  });
});

module.exports = router;
