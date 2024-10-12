import http from 'http';
import https from 'https';
import path from 'path';
import express from 'express';
import hbs from 'hbs';
import moment from 'moment';
import bodyParser from 'body-parser';
import db from './db/models/index.js';
import logger, { getLogChild } from './helpers/logger.js';
import getClientConfig from './helpers/getClientConfig.js';
import { getEnv } from './helpers/common.js';
import webpack from './webpack/webpack.js';
import { getDirnameByUrl, outputReq, outputRes } from './helpers/common.js';
import genRoutes from './routes/index.js';
import apiRoutes from './routes/api.js';

// config server
http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;

// some var
const baseDir = getDirnameByUrl(import.meta.url);

// database cleanup task
// removes actions and completed requests older than 60 days
const { Sequelize } = db;
const { Op } = Sequelize;
const cleanIntervalTime = 60 * 60 * 1000;
async function cleanupDb() {
  const expiry = getEnv('DATABASE_EXPIRY')
    ? parseInt(getEnv('DATABASE_EXPIRY'))
    : 60;
  const numActions = await db.actions.destroy({
    where: {
      created_at: { [Op.lt]: moment().subtract(expiry, 'days').toDate() },
    },
  });
  if (numActions > 0) {
    logger.info('removed %d old actions', numActions);
  }
  const numUsers = await db.users.destroy({
    where: {
      updated_at: { [Op.lt]: moment().subtract(expiry, 'days').toDate() },
    },
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
}, cleanIntervalTime);

// load client config
const clientConfig = getClientConfig();
const clientConfigObject = JSON.parse(clientConfig);

// init server framework
const app = express();

// when is in dev environment
// start webpackMiddleware
if (getEnv('NODE_ENV') !== 'production') {
  logger.info('Running in development mode');
  webpack(app);
}

// logging middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  const reqId =
    req.headers['x-amzn-trace-id'] ||
    req.headers['x-request-id'] ||
    `dev-${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`;
  const reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req.log = getLogChild({ req_id: reqId, ip: reqIp });
  req.log.debug(outputReq(req), '<-- request');
  res.set('X-Request-Id', reqId);
  const logOut = () => {
    const delta = process.hrtime(start);
    const info = {
      ms: delta[0] * 1e3 + delta[1] / 1e6,
      code: res.statusCode,
    };
    req.log.info(info, '%s %s', req.method, req.url);
    req.log.debug(outputRes(res), '--> response');
  };
  res.once('finish', logOut);
  res.once('close', logOut);
  next();
});

// set hbs viewer
hbs.registerHelper('endsWith', (str, suffix) => {
  return str.endsWith(suffix);
});
hbs.registerHelper('clientConfig', () => clientConfig);
hbs.registerHelper('baseCss', () => new hbs.SafeString(
    getEnv('NODE_ENV') !== 'production'
      ? ''
      : '<link rel="stylesheet" href="/css/base.css" type="text/css" media="all"/>'
  )
);
hbs.registerHelper('recaptchaJs', () => new hbs.SafeString(
    getEnv('RECAPTCHA_SWITCH') !== 'OFF'
      ? '<script src="//www.google.com/recaptcha/api.js"></script>'
      : ''
  )
);
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
hbs.registerPartials(`${baseDir}/views/partials`);
app.set('views', path.join(baseDir, 'views'));
app.set('view engine', 'hbs');

// set route
app.use('/', genRoutes({
  baseDir,
}));
app.use('/api', apiRoutes);

// other settings
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(baseDir, 'public')));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// further error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : err;

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

export default app;
