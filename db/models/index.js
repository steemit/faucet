import Sequelize, { DataTypes } from 'sequelize';
import { readFileSync } from "fs";
import { getLogChild } from '../../helpers/logger.js';
import common, { getEnv } from '../../helpers/common.js';
import actions from './actions.js';
import analytics from './analytics.js';
import config from './config.js';
import emailcode from './emailcode.js';
import phonecode from './phonecode.js';
import users from './users.js';

const __dirname = common.getDirnameByUrl(import.meta.url);
const allConfig = JSON.parse(readFileSync(`${__dirname}/../config/config.json`));
const env = getEnv('DATABASE_NAME') || 'development';
const logger = getLogChild({ module: 'db' });
const dbConfig = allConfig[env];
dbConfig.logging = function(msg) {
  logger.debug(msg);
};

const sequelize = new Sequelize(getEnv(dbConfig.use_env_variable), dbConfig);
const modelsHelpers = {
  actions,
  analytics,
  config,
  emailcode,
  phonecode,
  users,
};
const db = {};

Object.keys(modelsHelpers).forEach(function(modelName) {
  db[modelName] = modelsHelpers[modelName](sequelize, DataTypes);
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
