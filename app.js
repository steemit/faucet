/* eslint-disable new-cap,global-require,no-param-reassign */
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const steem = require('@steemit/steem-js');
const Raven = require('raven');
const mail = require('./helpers/mail');
const db = require('./db/models');
const twilio = require('./helpers/twilio');
const geoip = require('./helpers/maxmind');
const getClientConfig = require('./helpers/getClientConfig');

const clientConfig = getClientConfig();

if (process.env.STEEMJS_URL) {
  steem.api.setOptions({ url: process.env.STEEMJS_URL });
}

http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;
const app = express();
const server = http.Server(app);

if (process.env.NODE_ENV !== 'production') { require('./webpack/webpack')(app); }

const hbs = require('hbs');

hbs.registerHelper('clientConfig', () => clientConfig);
hbs.registerHelper('baseCss', () => new hbs.SafeString(process.env.NODE_ENV !== 'production' ? '' : '<link rel="stylesheet" href="/css/base.css" type="text/css" media="all"/>'));
hbs.registerPartials(`${__dirname}/views/partials`);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.enable('trust proxy');

if (process.env.SENTRY_DSN) {
  Raven.config(process.env.SENTRY_DSN).install();
  app.use(Raven.requestHandler());
}

app.use((req, res, next) => {
  req.steem = steem;
  req.twilio = twilio;
  req.mail = mail;
  req.db = db;
  req.geoip = geoip;
  next();
});

app.use(logger(process.env.LOG_FORMAT || 'dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));
app.use('/', require('./routes'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
if (process.env.SENTRY_DSN) {
  app.use(Raven.errorHandler());
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.log(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : err;

  // render the error page
  res.status(err.status || 500);
  res.json({ errors: [{ field: 'general', error: 'error_api_general' }] });
});

module.exports = { app, server };
