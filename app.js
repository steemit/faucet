/* eslint-disable new-cap,global-require,no-param-reassign */
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const steem = require('steem');
const mail = require('./helpers/mail');
const db = require('./db/models');
const twilio = require('./helpers/twilio');
const geoip = require('./helpers/maxmind');

steem.api.setOptions({ url: 'wss://steemd-int.steemit.com' });
http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;
const app = express();
const server = http.Server(app);

if (process.env.NODE_ENV !== 'production') { require('./webpack/webpack')(app); }

const hbs = require('hbs');

hbs.registerPartials(`${__dirname}/views/partials`);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.enable('trust proxy');

app.use((req, res, next) => {
  req.steem = steem;
  req.twilio = twilio;
  req.mail = mail;
  req.db = db;
  req.geoip = geoip;
  next();
});

app.use(logger('dev'));
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
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : err;

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

module.exports = { app, server };
