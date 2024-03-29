/* eslint-disable radix */
/* eslint-disable new-cap,global-require,no-param-reassign */
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const db = require('./db/models');
const getClientConfig = require('./helpers/getClientConfig');
const logger = require('./helpers/logger');
const moment = require('moment');
const fs = require('fs');

const { Sequelize } = db;
const { Op } = Sequelize;

http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;

const app = express();
const clientConfig = getClientConfig();
const clientConfigObject = JSON.parse(clientConfig);

// database cleanup task
// removes actions and completed requests older than 60 days
async function cleanupDb() {
  const expiry = process.env.DATABASE_EXPIRY ? parseInt(process.env.DATABASE_EXPIRY) : 60;
  const numActions = await db.actions.destroy({
    where: { created_at: { [Op.lt]: moment().subtract(expiry, 'days').toDate() } },
  });
  if (numActions > 0) {
    logger.info('removed %d old actions', numActions);
  }
  const numUsers = await db.users.destroy({
    where: { updated_at: { [Op.lt]: moment().subtract(expiry, 'days').toDate() } },
  });
  if (numUsers > 0) {
    logger.info('removed %d old users', numUsers);
  }
}
setInterval(() => {
  logger.debug('running db cleanup');
  cleanupDb().catch((error) => {
    logger.error(error, 'error cleaning database');
  });
}, 60 * 60 * 1000);

// logging middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  const reqId = req.headers['x-amzn-trace-id'] ||
                req.headers['x-request-id'] ||
                `dev-${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`;
  const reqIp = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress;
  req.log = logger.child({ req_id: reqId, ip: reqIp });
  req.log.debug({ req }, '<-- request');
  res.set('X-Request-Id', reqId);
  const logOut = () => {
    const delta = process.hrtime(start);
    const info = {
      ms: (delta[0] * 1e3) + (delta[1] / 1e6),
      code: res.statusCode,
    };
    req.log.info(info, '%s %s%s', req.method, req.baseUrl, req.url);
    req.log.debug({ res }, '--> response');
  };
  res.once('finish', logOut);
  res.once('close', logOut);
  next();
});

if (process.env.NODE_ENV !== 'production') {
  logger.info('running in development mode');
  require('./webpack/webpack')(app);
}

// get the base js filename
const publicJsPath = `${__dirname}/public/js`;
let baseJsFile;
if (process.env.NODE_ENV === 'production') {
  const files = fs.readdirSync(publicJsPath);
  files.sort((val1, val2) => {
    const stat1 = fs.statSync(`${publicJsPath}/${val1}`);
    const stat2 = fs.statSync(`${publicJsPath}/${val2}`);
    return stat2.mtime - stat1.mtime;
  });
  const reg = /^app.min.[\w]+.js$/;
  baseJsFile = files.find(f => reg.test(f));
}
if (baseJsFile === undefined) {
  baseJsFile = 'app.min.js';
}
logger.info(`The latest base js file is: ${baseJsFile}`);

const hbs = require('hbs');

hbs.registerHelper('clientConfig', () => clientConfig);
hbs.registerHelper('baseCss', () => new hbs.SafeString(process.env.NODE_ENV !== 'production' ? '' : '<link rel="stylesheet" href="/css/base.css" type="text/css" media="all"/>'));
hbs.registerHelper('baseJs', () => new hbs.SafeString(`<script type="text/javascript" src="/js/${baseJsFile}"></script>`));
hbs.registerHelper('recaptchaJs', () => new hbs.SafeString(process.env.RECAPTCHA_SWITCH !== 'OFF' ? '<script src="//www.google.com/recaptcha/api.js"></script>' : ''));
hbs.registerHelper('gaCode', () => {
  let gaCode = '';
  if (clientConfigObject) {
    gaCode = `<script async src="https://www.googletagmanager.com/gtag/js?id=${clientConfigObject.GOOGLE_ANALYTICS_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${clientConfigObject.GOOGLE_ANALYTICS_ID}');
  </script>`;
  }
  return new hbs.SafeString(gaCode);
});
hbs.registerPartials(`${__dirname}/views/partials`);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.enable('trust proxy');
app.disable('x-powered-by');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : err;

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
