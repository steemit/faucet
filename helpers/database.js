import crypto from 'crypto';
import moment from 'moment';
import db from '../db/models/index.js';
import ApiError from './errortypes.js';
import { normalizeEmail } from './validator.js';
import cache from './cache.js';

const { Sequelize, sequelize } = db;
const { Op } = Sequelize;

/**
 * Throws if user or ip exceeds number of allowed actions within time period.
 */
export async function actionLimit(
  ip,
  user_id = null,
  ipLimit = 32,
  userActionLimit = 4
) {
  const created_at = {
    [Op.gte]: moment().subtract(20, 'hours').toDate(),
  };
  const promises = [
    db.actions.count({
      where: { ip, created_at, action: { [Op.ne]: 'check_username' } },
    }),
  ];
  if (user_id) {
    promises.push(db.actions.count({ where: { user_id, created_at } }));
  }
  const [ipActions, userActions] = await Promise.all(promises);
  if (userActions > userActionLimit || ipActions > ipLimit) {
    throw new ApiError({ type: 'error_api_actionlimit' });
  }
}

export async function emailIsInUse(email) {
  // Normalize email
  const normalized = normalizeEmail(email);
  const userCount = await db.users.count({
    where: {
      email_normalized: normalized,
      // email_is_verified: true,
    },
  });
  return userCount > 0;
}

export const logAction = async (data) => db.actions.create(data);

export const findUser = async (where) => db.users.findOne(where);
export const findUsers = async (query) => db.users.findAll(query);
export const countUsers = async (where) => db.users.count({ where });

export const usernameIsBooked = async (username) => {
  const user = await findUser({
    where: {
      username,
      email_is_verified: true,
    },
    order: [['username_booked_at', 'DESC']],
  });
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return (
    user && user.username_booked_at.getTime() + oneWeek >= new Date().getTime()
  );
};

export const createUser = async (data) => db.users.create(data);

export async function phoneIsInUse(phone_number) {
  const userCount = await db.users.count({
    where: {
      phone_number,
      // phone_number_is_verified: true,
    },
  });
  return userCount > 0;
}

export const updateUsers = async (data, where) => db.users.update(data, where);

export const query = async (q, options) => db.sequelize.query(q, options);

export const createEmailRecord = async (data) => db.emailcode.create(data);
export const findEmailRecord = async (where) => db.emailcode.findOne(where);
export const createPhoneRecord = async (data) => db.phonecode.create(data);
export const findPhoneRecord = async (where) => db.phonecode.findOne(where);
export const updatePhoneRecord = async (data, where) =>
  db.phonecode.update(data, where);
export const deletePhoneRecord = async (where) =>
  db.phonecode.destroy({ where });
export const deleteEmailRecord = async (where) =>
  db.emailcode.destroy({ where });

export function buildAdvisoryLockKey(rawKey) {
  const digest = crypto
    .createHash('sha256')
    .update(String(rawKey))
    .digest('hex')
    .slice(0, 32);
  return `faucet:${digest}`;
}

/**
 * Acquire non-transactional MySQL session advisory locks (GET_LOCK) in sorted
 * order and release them in reverse order in finally. Opens NO InnoDB transaction
 * and locks NO table or row.
 */
export async function withAdvisoryLocks(lockKeys, optionsOrFn, maybeFn) {
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;
  const options =
    typeof optionsOrFn === 'function' ? {} : optionsOrFn || {};
  const {
    timeoutSec = 10,
    timeoutErrorType = 'error_api_wait_one_minute',
    timeoutField = 'general',
    timeoutStatus = 429,
  } = options;

  const sortedLockNames = Array.from(
    new Set(lockKeys.map((key) => buildAdvisoryLockKey(key)))
  ).sort();

  const connection = await sequelize.connectionManager.getConnection({
    type: 'WRITE',
  });
  const acquiredLocks = [];
  let connectionBroken = false;

  try {
    for (const lockName of sortedLockNames) {
      const rows = await sequelize.query(
        'SELECT GET_LOCK(:lockName, :timeoutSec) AS acquired',
        {
          replacements: { lockName, timeoutSec },
          type: Sequelize.QueryTypes.SELECT,
          transaction: { connection },
        }
      );
      if (Number(rows?.[0]?.acquired) !== 1) {
        throw new ApiError({
          type: timeoutErrorType,
          field: timeoutField,
          status: timeoutStatus,
        });
      }
      acquiredLocks.push(lockName);
    }
    return await fn();
  } finally {
    for (const lockName of acquiredLocks.reverse()) {
      try {
        await sequelize.query(
          'SELECT RELEASE_LOCK(:lockName) AS released',
          {
            replacements: { lockName },
            type: Sequelize.QueryTypes.SELECT,
            transaction: { connection },
          }
        );
      } catch {
        connectionBroken = true;
      }
    }
    if (connectionBroken) {
      await sequelize.connectionManager
        .destroyConnection(connection)
        .catch(() => {});
    } else {
      sequelize.connectionManager.releaseConnection(connection);
    }
  }
}

export async function findEmailRecordsByNormalized(email) {
  const normalized = normalizeEmail(email);
  return db.emailcode.findAll({
    where: {
      [Op.or]: [{ email_normalized: normalized }, { email }],
    },
    order: [['id', 'DESC']],
  });
}

export async function findEmailRecordByNormalized(email) {
  const normalized = normalizeEmail(email);
  return db.emailcode.findOne({
    where: {
      [Op.or]: [{ email_normalized: normalized }, { email }],
    },
    order: [['id', 'DESC']],
  });
}

export async function deleteEmailRecordsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }
  return db.emailcode.destroy({
    where: {
      id: { [Op.in]: ids },
    },
  });
}

export async function deleteEmailRecordByNormalized(email) {
  const normalized = normalizeEmail(email);
  return db.emailcode.destroy({
    where: {
      [Op.or]: [{ email_normalized: normalized }, { email }],
    },
  });
}

export async function clearExpiredEmailCode(id) {
  const [affected] = await db.emailcode.update(
    {
      email_code: null,
      email_code_attempts: 0,
    },
    { where: { id } }
  );
  return affected;
}

export async function incrementEmailCodeAttempts(id, maxAttempts = 10) {
  const [affected] = await db.emailcode.update(
    {
      email_code_attempts: Sequelize.literal(
        'COALESCE(email_code_attempts, 0) + 1'
      ),
    },
    {
      where: {
        id,
        [Op.or]: [
          { email_code_attempts: null },
          { email_code_attempts: { [Op.lt]: maxAttempts } },
        ],
      },
    }
  );
  return affected === 1;
}

export async function consumeEmailCodeForSignup({
  id,
  expectedCode,
  jtiMarker,
  minGeneratedAt,
  maxAttempts = 10,
  now = new Date(),
}) {
  const [affected] = await db.emailcode.update(
    {
      email_code: jtiMarker,
      email_code_generated: now,
    },
    {
      where: {
        id,
        email_code: expectedCode,
        email_code_generated: { [Op.gt]: minGeneratedAt },
        [Op.or]: [
          { email_code_attempts: null },
          { email_code_attempts: { [Op.lt]: maxAttempts } },
        ],
      },
    }
  );
  return affected === 1;
}

export async function claimEmailSignupJti({
  id,
  expectedMarker,
  creatingMarker,
  minGeneratedAt,
}) {
  const [affected] = await db.emailcode.update(
    {
      email_code: creatingMarker,
    },
    {
      where: {
        id,
        email_code: expectedMarker,
        email_code_generated: { [Op.gt]: minGeneratedAt },
      },
    }
  );
  return affected === 1;
}

export async function restoreEmailSignupJti({
  id,
  creatingMarker,
  expectedMarker,
}) {
  const [affected] = await db.emailcode.update(
    {
      email_code: expectedMarker,
    },
    {
      where: {
        id,
        email_code: creatingMarker,
      },
    }
  );
  return affected === 1;
}

/**
 * remove user id references
 * to remove username reserve mechanism
 */
export async function actionLimitNew(ip, action = 'default', ipLimit = 32) {
  const created_at = {
    [Op.gte]: moment().subtract(20, 'hours').toDate(),
  };
  const promises = [
    db.actions.count({
      where: { ip, created_at, action: { [Op.eq]: action } },
    }),
  ];
  const [ipActions] = await Promise.all(promises);
  if (ipActions >= ipLimit) {
    throw new ApiError({ type: 'error_api_actionlimit' });
  }
}

/**
 * find last send sms action by country number
 */
export async function findLastSendSmsByCountryNumber(
  countryNumber,
  phoneNumber
) {
  let where = `where action = 'send_sms' and JSON_EXTRACT(metadata, '$.countryNumber') = :countryNumber`;
  const replacements = {
    countryNumber,
  };
  if (phoneNumber) {
    where = `${where} and JSON_EXTRACT(metadata, '$.phoneNumber') != :phoneNumber`;
    replacements.phoneNumber = phoneNumber;
  }
  const actions = await sequelize.query(
    `select * from actions ${where} order by id desc limit 1`,
    {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return actions;
}

/**
 * find number of try_number actions in last X hours with same country number
 */
export async function countTryNumber(countryNumber, hours) {
  let where = `where action = 'try_number' and JSON_EXTRACT(metadata, '$.countryNumber') = :countryNumber`;
  where = `${where} and now() - created_at <= :hours * 3600`;
  const replacements = {
    countryNumber,
    hours,
  };
  const records = await sequelize.query(
    `select count(*) as total from actions ${where}`,
    {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  if (records.length > 0) {
    return records[0].total;
  }
  return 0;
}

/**
 * Get config value from config table (with cache)
 * @param {string} key - Config key name
 * @param {*} defaultValue - Default value returned if config not found
 * @param {number} ttl - Cache expiration time in seconds, default 300 seconds (5 minutes)
 * @returns {Promise<*>} Config value
 */
export async function getConfigValue(key, defaultValue = null, ttl = 300) {
  const cacheKey = `config:${key}`;

  // Try to get from cache first
  const cachedValue = cache.get(cacheKey);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  // Cache miss, query from database
  try {
    const config = await db.config.findOne({
      where: { c_key: key },
    });

    let value = defaultValue;
    if (config && config.c_val) {
      // Try to parse JSON, return raw string if parsing fails
      try {
        value = JSON.parse(config.c_val);
      } catch {
        value = config.c_val;
      }
    }

    // Store in cache
    cache.set(cacheKey, value, ttl);

    return value;
  } catch {
    // Return default value on query failure, but don't cache error result
    return defaultValue;
  }
}

/**
 * Clear cache for specified config
 * @param {string} key - Config key name
 */
export function clearConfigCache(key) {
  const cacheKey = `config:${key}`;
  cache.delete(cacheKey);
}

/**
 * Get white email domain list from config table
 * Returns default ['gmail.com'] if config not found or parse fails
 */
export async function getWhiteEmailDomain() {
  const domains = await getConfigValue(
    'white_email_domain',
    ['gmail.com'],
    300
  );
  return Array.isArray(domains) ? domains : ['gmail.com'];
}

/**
 * Get private white email domain list from config table
 * Returns default [] if config not found or parse fails
 */
export async function getPrivateWhiteEmailDomain() {
  const domains = await getConfigValue('private_white_email_domain', [], 300);
  return Array.isArray(domains) ? domains : [];
}

export default {
  Sequelize,
  actionLimit,
  emailIsInUse,
  logAction,
  findUser,
  findUsers,
  countUsers,
  usernameIsBooked,
  createUser,
  phoneIsInUse,
  updateUsers,
  query,
  createEmailRecord,
  findEmailRecord,
  findEmailRecordsByNormalized,
  findEmailRecordByNormalized,
  deleteEmailRecordsByIds,
  deleteEmailRecordByNormalized,
  clearExpiredEmailCode,
  incrementEmailCodeAttempts,
  consumeEmailCodeForSignup,
  claimEmailSignupJti,
  restoreEmailSignupJti,
  buildAdvisoryLockKey,
  withAdvisoryLocks,
  actionLimitNew,
  createPhoneRecord,
  findPhoneRecord,
  updatePhoneRecord,
  deletePhoneRecord,
  deleteEmailRecord,
  findLastSendSmsByCountryNumber,
  countTryNumber,
  getWhiteEmailDomain,
  getPrivateWhiteEmailDomain,
  getConfigValue,
  clearConfigCache,
};
