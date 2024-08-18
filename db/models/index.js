import Sequelize, { DataTypes } from 'sequelize';
import { readFileSync } from "fs";
import logger from '../../helpers/logger.js';
import common from '../../helpers/common.js';
import actions from './actions.js';
import analytics from './analytics.js';
import emailcode from './emailcode.js';
import phonecode from './phonecode.js';
import users from './users.js';

const __dirname = common.getDirnameByUrl(import.meta.url);
const allConfig = JSON.parse(readFileSync(`${__dirname}/../config/config.json`));
const env = process.env.DATABASE_NAME || 'development';
const logChild = logger.child({ module: 'db' });
const config = allConfig[env];
config.logging = function(msg) {
  logChild.debug(msg);
};

const sequelize = new Sequelize(process.env[config.use_env_variable], config);
const modelsHelpers = {
  actions,
  analytics,
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
