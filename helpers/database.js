const moment = require('moment');
const db = require('./../db/models');

const { Sequelize } = db;
const { Op } = Sequelize;

const { ApiError } = require('./errortypes');
const { normalizeEmail } = require('./validator');

/**
 * Throws if user or ip exceeds number of allowed actions within time period.
 */
async function actionLimit(
    ip,
    user_id = null,
    ipLimit = 32,
    userActionLimit = 4
) {
    const created_at = {
        [Op.gte]: moment()
            .subtract(20, 'hours')
            .toDate(),
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

async function emailIsInUse(email) {
    // Normalize email
    const normalized = normalizeEmail(email);
    const userCount = await db.users.count({
        where: {
            email_normalized: normalized,
            email_is_verified: true,
        },
    });
    return userCount > 0;
}

const logAction = async data => db.actions.create(data);

const findUser = async where => db.users.findOne(where);
const findUsers = async query => db.users.findAll(query);
const countUsers = async where => db.users.count({ where });

const usernameIsBooked = async username => {
    const user = await findUser({
        where: {
            username,
            email_is_verified: true,
        },
        order: [['username_booked_at', 'DESC']],
    });
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return (
        user &&
        user.username_booked_at.getTime() + oneWeek >= new Date().getTime()
    );
};

const createUser = async data => db.users.create(data);

async function phoneIsInUse(phone_number) {
    const userCount = await db.users.count({
        where: {
            phone_number,
            phone_number_is_verified: true,
        },
    });
    return userCount > 0;
}

const updateUsers = async (data, where) => db.users.update(data, where);

const query = async (q, options) => db.sequelize.query(q, options);

const findAnalyticsLog = async where => db.analytics.findAll(where);
const createAnalyticsLog = async (where, data) =>
    db.analytics.findOrCreate({ where, defaults: data });

const updateAnalytics = async (where, data, increase = false) => {
    const result = await createAnalyticsLog(where, data);
    if (result[1] === false) {
        // find exist data
        if (increase === true) {
            result[0].total += 1;
            await result[0].save();
        } else {
            result[0].total = data.total;
            await result[0].save();
        }
    }
    return true;
};

const createEmailRecord = async data => db.emailcode.create(data);

const findEmailRecord = async where => db.emailcode.findOne(where);

const createPhoneRecord = async data => db.phonecode.create(data);

const findPhoneRecord = async where => db.phonecode.findOne(where);

const updatePhoneRecord = async (data, where) =>
    db.phonecode.update(data, where);

const deletePhoneRecord = async where => db.phonecode.destroy(where);

/**
 * remove user id references
 * to remove username reserve mechanism
 */
async function actionLimitNew(ip, action, ipLimit = 32) {
    const created_at = {
        [Op.gte]: moment()
            .subtract(20, 'hours')
            .toDate(),
    };
    const promises = [
        db.actions.count({
            where: { ip, created_at, action: { [Op.eq]: action } },
        }),
    ];
    const ipActions = await Promise.all(promises);
    if (ipActions > ipLimit) {
        throw new ApiError({ type: 'error_api_actionlimit' });
    }
}

module.exports = {
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
    findAnalyticsLog,
    updateAnalytics,
    createEmailRecord,
    findEmailRecord,
    actionLimitNew,
    createPhoneRecord,
    findPhoneRecord,
    updatePhoneRecord,
    deletePhoneRecord,
};
