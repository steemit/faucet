const express = require('express');
const passport = require('passport');
const router = express.Router();
const config = require('../config.json');
const authorizedDomains = config.google_auth_authorized_domains.join('|');

router.get('/google', passport.authenticate('google', {
  scope: ['https://www.googleapis.com/auth/userinfo.email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect:'/' }),
  (req, res) => {
    if (
      req.user && req.user.profile && req.user.profile.emails &&
      req.user.profile.emails.find(o => new RegExp('@('+ authorizedDomains+')$').test(o.value))
    ) {
      req.session.token = req.user.token;
      res.redirect('/dashboard');
    } else {
      req.session = null;
      res.redirect('/unauthorized');
    }
  }
);

router.get('/logout', (req, res) => {
  req.logout();
  req.session = null;
  res.redirect('/');
});

module.exports = router;