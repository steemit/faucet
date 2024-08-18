import express from 'express';
import moment from 'moment';
import db from './db/models/index.js';
import logger from './helpers/logger.js';

// database cleanup task
// removes actions and completed requests older than 60 days
const { Sequelize } = db;
const { Op } = Sequelize;
const cleanIntervalTime = 60 * 60 * 1000;
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
}, cleanIntervalTime);

const app = express();

export default app;
