import jwt from 'jsonwebtoken';
import GLPN from 'google-libphonenumber';
import mail from '../helpers/mail.js';
import { getLogChild } from '../helpers/logger.js';
import services from '../helpers/services.js';
import database from '../helpers/database.js';
import ApiError from '../helpers/errortypes.js';
import badDomains from '../helpers/badDomains.js';
import {
  accountNameIsValid,
  normalizeEmail,
  isEmail,
} from '../helpers/validator.js';
import { getEnv, generateTrackingId, generateCode } from '../helpers/common.js';
import { getTronAccount, updateTronUser } from '../helpers/tron.js';

const PNF = GLPN.PhoneNumberFormat;
const phoneUtil = GLPN.PhoneNumberUtil.getInstance();
const logger = getLogChild({ module: 'api_handlers' });

/**
 * Check the validity and blockchain availability of a username
 * Accounts created with the faucet can book a username for one week
 */
async function handleCheckUsername(req) {
  const { username } = req.body;

  await database.logAction({
    action: 'check_username',
    ip: req.ip,
    metadata: { username },
  });

  try {
    accountNameIsValid(username);
  } catch (e) {
    throw new ApiError({
      type: e.message,
      status: 200,
    });
  }

  const userExists = await services.checkUsername(username);
  if (userExists) {
    throw new ApiError({
      type: 'error_api_username_used',
      status: 200,
    });
  }

  const usernameExist = await database.countUsers({
    username,
  });

  if (usernameExist) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_user_exist',
    });
  }

  // const usernameIsBooked = await database.usernameIsBooked(username);
  // if (usernameIsBooked) {
  //     throw new ApiError({
  //         type: 'error_api_username_reserved',
  //         status: 200,
  //     });
  // }
  return { success: true };
}

/**
 * Return the country code using maxmind database
 */
async function handleGuessCountry(req) {
  return { location: services.locationFromIp(req.ip) };
}

/**
 * Collect the analytics data
 */
async function handleAnalytics(req) {
  const { event_id, superkey, total, t } = req.query;
  /**
   * Temporary API.
   */
  if (event_id < 1) {
    throw new ApiError({
      type: 'error_event_id',
      status: 200,
    });
  }

  // action limit
  await database.logAction({
    action: 'analytics',
    ip: req.ip,
  });
  await database.actionLimit(req.ip);

  if (superkey) {
    // In super mode we can update `total` and `created_at` fields.
    const SUPERKEY_ENV = getEnv('ANALYTICS_UPDATE_SUPERKEY');
    if (!SUPERKEY_ENV) {
      throw new ApiError({
        type: 'error_analytics_update_superkey_not_set',
        status: 200,
      });
    }
    if (superkey !== SUPERKEY_ENV) {
      throw new ApiError({
        type: 'error_superkey',
        status: 200,
      });
    }
    const where = {
      event_id,
      created_at: `${t}T00:00:00Z`,
    };
    const data = {
      total,
    };
    try {
      await database.updateAnalytics(where, data);
    } catch (error) {
      req.log.error(error, 'Unable to store analytics data');
      return { success: true };
    }
  } /* else {
        // In normal mode we only update `total` by adding 1.
        const today = new Date().toISOString().replace(/T.+/, '');
        const where = {
            event_id,
            created_at: `${today}T00:00:00Z`,
        };
        const data = {
            total: 1,
        };
        try {
            await database.updateAnalytics(where, data, true);
        } catch (error) {
            req.log.error(error, 'Unable to store analytics data');
            return { success: true };
        }
    } */
  return { success: true };
}

async function handleRequestEmailCode(ip, email, locale) {
  const isEnoughPendingClaimedAccounts =
    await services.getPendingClaimedAccountsAsync();
  if (isEnoughPendingClaimedAccounts === false) {
    logger.warn(
      { isEnoughPendingClaimedAccounts },
      'pending_claimed_accounts_is_not_enough'
    );
    throw new ApiError({
      field: 'email',
      type: 'signup_free_tip3',
    });
  }
  if (!email) {
    throw new ApiError({
      type: 'error_api_email_required',
      field: 'email',
    });
  }
  // format check
  if (!isEmail(email)) {
    throw new ApiError({
      type: 'error_api_email_format',
      field: 'email',
    });
  }
  // bad domains check
  if (badDomains.includes(email.split('@')[1])) {
    logger.warn({ email }, 'error_api_domain_blacklisted');
    return { success: true, token: null, xref: null };
  }

  await database.actionLimitNew(ip, 'request_email_code');

  await database.logAction({
    action: 'request_email_code',
    ip,
    metadata: { email },
  });

  // duplicate check
  const emailIsInUse = await database.emailIsInUse(email);
  if (emailIsInUse) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  const emailRegistered = await services.conveyorCall('is_email_registered', [
    email,
  ]);
  if (emailRegistered) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  let record = null;

  const existingRecord = await database.findEmailRecord({
    where: {
      email,
    },
  });

  if (existingRecord) {
    record = existingRecord;
  } else {
    try {
      const newEmailRecord = await database.createEmailRecord({
        email,
        email_normalized: normalizeEmail(email),
        last_attempt_verify_email: new Date(1588291200000),
        email_code: null,
        email_code_attempts: 0,
        email_code_sent: 0,
        email_code_generated: null,
        email_code_first_sent: null,
      });
      record = newEmailRecord;
    } catch (e) {
      logger.error(e, 'insert email code record error');
      throw new ApiError({
        type: 'error_api_general',
        field: 'email',
      });
    }
  }

  const minusOneMinute = Date.now() - 60000;
  const minusOneDay = Date.now() - 86400000;

  const usersLastAttempt = record.last_attempt_verify_email
    ? record.last_attempt_verify_email.getTime()
    : undefined;

  const dailySentTimes = record.email_code_sent
    ? record.email_code_sent
    : undefined;

  const lastRequestTime = record.email_code_first_sent
    ? record.email_code_first_sent.getTime()
    : undefined;

  // if an email has requested code over 5 times with 24 hours, throw an error.
  if (dailySentTimes && lastRequestTime) {
    if (dailySentTimes >= 5 && lastRequestTime >= minusOneDay) {
      throw new ApiError({
        field: 'email',
        type: 'error_api_request_too_much',
      });
    }
  }

  // If the user's last attempt was less than or exactly a minute ago, throw an error.
  if (usersLastAttempt && usersLastAttempt >= minusOneMinute) {
    throw new ApiError({
      field: 'email',
      type: 'error_api_wait_one_minute',
    });
  }

  const captchaCode = (100000 + Math.round(Math.random() * 899999)).toString();

  // Send the email.
  if (locale === 'zh') {
    await services.sendEmail(record.email, 'email_code_zh', {
      code: captchaCode,
    });
  } else {
    await services.sendEmail(record.email, 'email_code', {
      code: captchaCode,
    });
  }

  // Update the user to reflect that the verification email was sent.
  record.email_code_attempts = 0;
  record.email_code = captchaCode;
  record.email_code_generated = new Date();
  // count every 24 hours
  if (record.email_code_generated >= minusOneDay) {
    record.email_code_sent += 1;
  } else {
    record.email_code_sent = 1;
    record.email_code_first_sent = new Date();
  }
  if (
    !record.email_code_first_sent ||
    record.email_code_first_sent < minusOneDay
  ) {
    record.email_code_first_sent = new Date();
    record.email_code_sent = 1;
  }
  record.last_attempt_verify_email = new Date();
  await record.save();

  return { success: true, email, xref: record.ref_code };
}

/**
 * remove token usage & record phone information to new table
 * compare to old request sms func
 */
async function handleRequestSms(req) {
  services.recordSmsTracker({
    sendType: 'get_in',
    countryCode: req.body.prefix,
    phoneNumber: req.body.phoneNumber,
  });
  const isEnoughPendingClaimedAccounts =
    await services.getPendingClaimedAccountsAsync();
  if (isEnoughPendingClaimedAccounts === false) {
    req.log.warn(
      { isEnoughPendingClaimedAccounts },
      'pending_claimed_accounts_is_not_enough'
    );
    throw new ApiError({
      field: 'code',
      type: 'signup_free_tip3',
    });
  }
  if (getEnv('RECAPTCHA_SWITCH') !== 'OFF') {
    const recaptcha = req.body.phone_recaptcha;
    if (!recaptcha) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_recaptcha_required',
      });
    }
    try {
      await services.verifyCaptcha(recaptcha, req.ip);
    } catch (cause) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_recaptcha_invalid',
        cause,
      });
    }
  }

  if (!req.body.phoneNumber) {
    throw new ApiError({
      type: 'error_api_phone_required',
      field: 'phoneNumber',
    });
  }
  if (!req.body.prefix) {
    throw new ApiError({
      type: 'error_api_country_code_required',
      field: 'phoneNumber',
    });
  }

  const countryCode = req.body.prefix.split('_')[1];
  const countryNumber = req.body.prefix.split('_')[0];
  if (!countryCode) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_prefix_invalid',
    });
  }
  if (!countryNumber) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_prefix_invalid',
    });
  }

  let phoneNumber = phoneUtil.parse(req.body.phoneNumber, countryCode);
  const countryNumberList = getEnv('COUNTRY_NUMBER')
    ? getEnv('COUNTRY_NUMBER').split(',')
    : '';
  if (countryNumberList.indexOf(countryNumber) !== -1) {
    req.log.warn({ phoneNumber: req.body }, 'sms_phone_number_hit_block_list');
    return { success: true, phoneNumber, ref: '' };
  }

  const isValid = phoneUtil.isValidNumber(phoneNumber);

  services.recordSmsTracker({
    sendType: 'fe_condition_fixed',
    countryCode: req.body.prefix,
    phoneNumber: req.body.phoneNumber,
  });

  if (!isValid) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_phone_invalid',
    });
  }

  phoneNumber = phoneUtil.format(phoneNumber, PNF.E164);

  const phoneExists = await database.phoneIsInUse(phoneNumber);

  if (phoneExists) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }

  const phoneRegistered = await services.conveyorCall('is_phone_registered', [
    phoneNumber,
  ]);

  if (phoneRegistered) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }

  await database.logAction({
    action: 'try_number',
    ip: req.ip,
    metadata: {
      phoneNumber,
      countryNumber,
    },
  });

  try {
    await services.validatePhone(phoneNumber);
  } catch (cause) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_phone_invalid',
      cause,
    });
  }

  // same ip policy
  await database.actionLimitNew(req.ip, 'try_number');

  let record = null;

  const existingRecord = await database.findPhoneRecord({
    where: {
      phone_number: phoneNumber,
    },
  });

  if (existingRecord) {
    record = existingRecord;
    record.phone_code = null;
  } else {
    const newPhoneRecord = await database.createPhoneRecord({
      phone_number: phoneNumber,
      last_attempt_verify_phone_number: new Date(1588291200000),
      phone_code: null,
      phone_code_attempts: 0,
      phone_code_sent: 0,
      phone_code_generated: new Date(),
      phone_code_first_sent: null,
    });
    record = newPhoneRecord;
  }
  const now = Date.now();
  const minusOneDay = now - 24 * 60 * 60 * 1000;
  const minusOneHour = now - 60 * 60 * 1000;
  const minusOneMinute = now - 60 * 1000;

  const usersLastAttempt = record.last_attempt_verify_phone_number
    ? record.last_attempt_verify_phone_number.getTime()
    : undefined;

  const dailySentTimes = record.phone_code_sent
    ? record.phone_code_sent
    : undefined;

  // the first time send code time in one day
  const lastRequestTime = record.phone_code_first_sent
    ? record.phone_code_first_sent.getTime()
    : undefined;

  // if an phone has requested code over 5 times with 24 hours, throw an error.
  if (dailySentTimes && lastRequestTime) {
    if (dailySentTimes >= 5 && lastRequestTime >= minusOneDay) {
      throw new ApiError({
        field: 'phone',
        type: 'error_api_request_too_much',
      });
    }
  }

  // If the user's last attempt was less than or exactly a minute ago, throw an error.
  if (usersLastAttempt && usersLastAttempt >= minusOneMinute) {
    throw new ApiError({
      field: 'phone',
      type: 'error_api_wait_one_minute',
    });
  }

  const hitNumbers = await database.findLastSendSmsByCountryNumber(
    countryNumber,
    phoneNumber
  );
  let lastPhoneCodeRecord = null;
  // high frequency policy for all countries (hfp)
  const highFrequencyRange = getEnv('HIGH_FREQUENCY_TIME_RANGE')
    ? parseInt(getEnv('HIGH_FREQUENCY_TIME_RANGE'), 10)
    : 2;
  const highFrequencyCount = getEnv('HIGH_FREQUENCY_COUNT')
    ? parseInt(getEnv('HIGH_FREQUENCY_COUNT'), 10)
    : 10;
  if (hitNumbers.length > 0) {
    const tempNumber = hitNumbers[0];
    lastPhoneCodeRecord = await database.findPhoneRecord({
      where: { phone_number: tempNumber.metadata.phoneNumber },
    });
    if (lastPhoneCodeRecord != null && !lastPhoneCodeRecord.phone_code) {
      if (
        lastPhoneCodeRecord.last_attempt_verify_phone_number.getTime() >=
        minusOneMinute
      ) {
        req.log.warn({ phoneNumber }, 'hfp:lower_than_one_minute');
        services.recordSmsTracker({
          sendType: 'hit_hfp_1',
          countryCode: req.body.prefix,
          phoneNumber: req.body.phoneNumber,
        });
        throw new ApiError({
          field: 'phone',
          type: 'error_api_wait_one_minute',
        });
      }
      const count = await database.countTryNumber(
        countryNumber,
        highFrequencyRange
      );
      if (
        count >= highFrequencyCount &&
        lastPhoneCodeRecord.last_attempt_verify_phone_number.getTime() >=
          minusOneHour
      ) {
        req.log.warn({ phoneNumber }, 'hfp:lower_than_one_hour');
        services.recordSmsTracker({
          sendType: 'hit_hfp_2',
          countryCode: req.body.prefix,
          phoneNumber: req.body.phoneNumber,
        });
        throw new ApiError({
          field: 'phone',
          type: 'error_api_wait_one_minute',
        });
      }
    }
  }

  // delay sending code when the country number in the block list
  const delaySendBlockCountryNumbers = getEnv('DELAY_SEND_SMS_COUNTRY_NUMBER')
    ? getEnv('DELAY_SEND_SMS_COUNTRY_NUMBER').split(',')
    : '';
  if (delaySendBlockCountryNumbers.indexOf(countryNumber) !== -1) {
    const delaySendTimeout = getEnv('DELAY_SEND_SMS_TIMEOUT')
      ? parseInt(getEnv('DELAY_SEND_SMS_TIMEOUT').split(','), 10) * 1000
      : 3600 * 1000;
    if (hitNumbers.length > 0) {
      const tempNumber = hitNumbers[0];
      // if sending interval time lower than delaySendTimeout, throw err
      if (now - tempNumber.created_at.getTime() <= delaySendTimeout) {
        req.log.warn(
          { phoneNumber },
          'delay sending code, lower than DELAY_SEND_SMS_TIMEOUT'
        );
        services.recordSmsTracker({
          sendType: 'hit_delay_sending_1',
          countryCode: req.body.prefix,
          phoneNumber: req.body.phoneNumber,
        });
        throw new ApiError({
          field: 'phone',
          type: 'error_api_wait_one_minute',
        });
      }
      // if there is one phone not registering success in 24 hours,
      // the same country number will be delayed.
      const delaySendTimeoutNotRegSuccess = getEnv(
        'DELAY_SEND_SMS_TIMEOUT_WHEN_REG_NOT_SUCCESS'
      )
        ? parseInt(
            getEnv('DELAY_SEND_SMS_TIMEOUT_WHEN_REG_NOT_SUCCESS').split(','),
            10
          ) * 1000
        : 7200 * 1000;
      if (
        lastPhoneCodeRecord != null &&
        now - lastPhoneCodeRecord.last_attempt_verify_phone_number.getTime() <=
          delaySendTimeoutNotRegSuccess
      ) {
        req.log.warn(
          { phoneNumber },
          'delay sending code when last same country number does not register success'
        );
        services.recordSmsTracker({
          sendType: 'hit_delay_sending_2',
          countryCode: req.body.prefix,
          phoneNumber: req.body.phoneNumber,
        });
        throw new ApiError({
          field: 'phone',
          type: 'error_api_wait_one_minute',
        });
      }
    }
  }

  await database.logAction({
    action: 'send_sms',
    ip: req.ip,
    metadata: {
      phoneNumber,
      countryNumber,
    },
  });
  services.recordSmsTracker({
    sendType: 'before_send_sms',
    countryCode: req.body.prefix,
    phoneNumber: req.body.phoneNumber,
  });

  const phoneCode = generateCode(6);
  const countryCodeList = getEnv('COUNTRY_CODE')
    ? getEnv('COUNTRY_CODE').split(',')
    : '';

  try {
    if (countryCodeList.indexOf(countryCode) !== -1) {
      let msg;
      if (req.body.locale === 'zh') {
        msg = `[Steemit] 验证码为: ${phoneCode}，有效期30分钟。请勿泄漏给他人。`;
      } else {
        msg = `[Steemit] verification code: ${phoneCode}, which will expire after 30 minutes. Please do not disclose code to others.`;
      }
      const response = await services.sendSMS(phoneNumber, msg);
      services.recordSmsTracker({
        sendType: 'after_send_sms_1',
        countryCode: req.body.prefix,
        phoneNumber: req.body.phoneNumber,
      });
      req.log.info(
        { response, ip: req.ip, req: req.body },
        'sms_response_info_in_country_code_list'
      );
      if (response && response.status !== 'pending') {
        throw new ApiError({
          cause: {},
          field: 'phoneNumber',
          type: 'error_api_sent_phone_code_failed',
        });
      }
    } else {
      const response = await services.sendSMSCode(phoneNumber);
      services.recordSmsTracker({
        sendType: 'after_send_sms_2',
        countryCode: req.body.prefix,
        phoneNumber: req.body.phoneNumber,
      });
      req.log.info(
        { response, ip: req.ip, req: req.body },
        'sms_response_info'
      );
      if (response && response.status !== 'pending') {
        throw new ApiError({
          cause: {},
          field: 'phoneNumber',
          type: 'error_api_sent_phone_code_failed',
        });
      }
    }
  } catch (cause) {
    req.log.warn({ cause, phoneNumber }, 'sms_send_error');
    if (cause.code === 21614 || cause.code === 21211) {
      throw new ApiError({
        cause,
        field: 'phoneNumber',
        type: 'error_phone_format',
      });
    } else {
      throw new ApiError({
        cause,
        field: 'phoneNumber',
        type: 'error_api_sent_phone_code_failed',
      });
    }
  }

  record.phone_code_attempts = 0;
  if (countryCodeList.indexOf(countryCode) !== -1) {
    record.phone_code = phoneCode;
  }
  record.phone_code_generated = new Date();
  // count every 24 hours
  if (record.phone_code_generated >= minusOneDay) {
    record.phone_code_sent += 1;
  } else {
    record.phone_code_sent = 1;
    record.phone_code_first_sent = new Date();
  }
  if (
    !record.phone_code_first_sent ||
    record.phone_code_first_sent < minusOneDay
  ) {
    record.phone_code_first_sent = new Date();
    record.phone_code_sent = 1;
  }
  record.last_attempt_verify_phone_number = new Date();
  await record.save();

  return { success: true, phoneNumber, ref: record.ref_code };
}

async function handleConfirmEmailCode(req) {
  const currentEmail = req.body.email;
  const minusHalfHour = Date.now() - 1800000;

  if (!currentEmail) {
    throw new ApiError({
      type: 'error_api_email_required',
      field: 'email',
    });
  }

  if (!req.body.code) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_code_required',
    });
  }

  const record = await database.findEmailRecord({
    where: { email: currentEmail },
  });

  if (!record) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_unknown_email',
    });
  }

  // incorrect input over 100 times
  if (record.email_code_attempts >= 100) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_phone_too_many',
    });
  }

  // code expires after 30 mins from generated time
  if (record.email_code_generated <= minusHalfHour) {
    record.email_code = null;
    record.email_code_attempts = 0;
    record.save();
    throw new ApiError({
      field: 'code',
      type: 'error_api_email_code_invalid',
    });
  }

  // try code
  record.email_code_attempts += 1;
  // if doesn't match
  if (record.email_code !== req.body.code) {
    await record.save();
    throw new ApiError({
      field: 'code',
      type: 'error_api_email_code_invalid',
    });
  }

  return { success: true };
}

async function handleConfirmSms(req) {
  if (!req.body.code) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_code_required',
    });
  }

  if (!req.body.phoneNumber) {
    throw new ApiError({
      type: 'error_api_phone_required',
      field: 'phoneNumber',
    });
  }

  if (req.body.code.length !== 6) {
    throw new ApiError({
      type: 'error_api_code_length_required',
      field: 'code',
    });
  }

  let record = null;

  try {
    record = await database.findPhoneRecord({
      where: { phone_number: req.body.phoneNumber },
    });
  } catch (cause) {
    req.log.warn({ cause }, 'error_api_findPhoneRecord_failed');
    throw new ApiError({
      field: 'code',
      type: 'error_api_findPhoneRecord_failed',
      cause,
    });
  }

  req.log.info({ record }, 'handleConfirmSmsNew_findPhoneRecord_result');

  if (record === null) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_unknown_phone_number',
    });
  }

  if (record.phone_code_attempts >= 50) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_phone_too_many',
    });
  }

  const minusHalfHour = Date.now() - 1800000;
  // code expires after 30 mins from generated time
  if (record.phone_code_generated <= minusHalfHour) {
    record.phone_code = null;
    record.phone_code_attempts = 0;
    record.save();
    throw new ApiError({
      field: 'code',
      type: 'error_api_phone_code_invalid',
    });
  }

  record.phone_code_attempts += 1;

  if (record.phone_code === null) {
    const response = await services.authSMSCode(
      req.body.phoneNumber,
      req.body.code
    );
    if (response === true) {
      record.phone_code = req.body.code;
      record.save();
      return { success: true };
    }
    await record.save();
    throw new ApiError({
      field: 'code',
      type: 'error_api_phone_code_invalid',
    });
  }

  if (record.phone_code !== req.body.code) {
    await record.save();
    throw new ApiError({
      field: 'code',
      type: 'error_api_phone_code_invalid',
    });
  }

  return { success: true };
}

async function finalizeSignup(
  ip,
  recaptcha,
  email,
  emailCode,
  phoneNumber,
  phoneCode,
  username
) {
  if (getEnv('RECAPTCHA_SWITCH') !== 'OFF') {
    if (!recaptcha) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_recaptcha_required',
      });
    }
    try {
      await services.verifyCaptcha(recaptcha, ip);
    } catch (cause) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_recaptcha_invalid',
        cause,
      });
    }
  }

  if (!username) {
    throw new ApiError({
      field: 'username',
      type: 'error_api_username_required',
    });
  }

  if (!email) {
    throw new ApiError({
      field: 'email',
      type: 'error_api_email_required',
    });
  }

  if (!phoneNumber) {
    throw new ApiError({
      field: 'phone',
      type: 'error_api_phone_required',
    });
  }

  if (!emailCode) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_code_required',
    });
  }

  if (!phoneCode) {
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_code_required',
    });
  }

  const phoneExists = await database.phoneIsInUse(phoneNumber);
  if (phoneExists) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }

  const emailIsInUse = await database.emailIsInUse(email);
  if (emailIsInUse) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  const phoneRecord = await database.findPhoneRecord({
    where: {
      phone_number: phoneNumber,
    },
  });
  const emailRecord = await database.findEmailRecord({
    where: {
      email,
    },
  });

  if (!phoneRecord) {
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_unknown_phone_number',
    });
  }

  if (!emailRecord) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_unknown_email',
    });
  }

  if (phoneRecord.phone_code !== phoneCode) {
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_phone_code_invalid',
    });
  }

  if (emailRecord.email_code !== emailCode) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_email_code_invalid',
    });
  }

  const usernameExist = await database.countUsers({
    username,
  });

  if (usernameExist) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_user_exist',
    });
  }

  // await database.createUser({
  //     email,
  //     email_normalized: normalizeEmail(email),
  //     email_is_verified: true,
  //     phone_number: phoneNumber,
  //     phone_number_is_verified: true,
  //     ip,
  //     account_is_created: false,
  //     created_at: new Date(),
  //     updated_at: null,
  //     fingerprint,
  //     username,
  //     tracking_id: xref || generateTrackingId(),
  // });
  const token = jwt.sign(
    {
      type: 'signup_new',
      username,
      email,
      phoneNumber,
    },
    getEnv('JWT_SECRET'),
    {
      algorithm: 'HS256',
    }
  );

  return { success: true, token };
}

async function handleCreateAccount(req) {
  // Do not allow account creations if REACT_DISABLE_ACCOUNT_CREATION is set to true
  if (getEnv('REACT_DISABLE_ACCOUNT_CREATION') === 'true') {
    throw new ApiError({
      type: 'Account creation temporarily disabled',
      status: 503,
    });
  }

  const {
    public_keys,
    token,
    fingerprint,
    xref,
    locale,
    activityTags,
    tron_bind_data,
    source, // format: app|tag (eg. condenser|submit_post)
  } = req.body;

  if (!public_keys) {
    throw new ApiError({ type: 'error_api_public_keys_required' });
  }

  if (!token) {
    throw new ApiError({ type: 'error_api_token_required' });
  }

  if (!tron_bind_data) {
    throw new ApiError({ type: 'error_api_tron_bind_data_required' });
  }
  const tronBindData = JSON.parse(tron_bind_data);

  let decoded;

  try {
    decoded = jwt.verify(token, getEnv('JWT_SECRET'), {
      algorithm: 'HS256',
    });
  } catch (cause) {
    throw new ApiError({
      type: 'error_api_token_invalid',
      cause,
    });
  }

  if (decoded.type !== 'signup_new') {
    throw new ApiError({
      type: 'error_api_token_invalid_type',
    });
  }

  try {
    accountNameIsValid(decoded.username);
  } catch (e) {
    throw new ApiError({
      type: e.message,
    });
  }

  const userExists = await services.checkUsername(decoded.username);
  if (userExists) {
    throw new ApiError({
      type: 'error_api_username_used',
      status: 200,
    });
  }

  const usernameExist = await database.countUsers({
    username: decoded.username,
  });
  if (usernameExist) {
    throw new ApiError({
      field: 'code',
      type: 'error_api_user_exist',
    });
  }
  const emailIsInUse = await database.emailIsInUse(decoded.email);
  if (emailIsInUse) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }
  const emailRegistered = await services.conveyorCall('is_email_registered', [
    decoded.email,
  ]);
  if (emailRegistered) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }
  const phoneExists = await database.phoneIsInUse(decoded.phoneNumber);
  if (phoneExists) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }
  const phoneRegistered = await services.conveyorCall('is_phone_registered', [
    decoded.phoneNumber,
  ]);
  if (phoneRegistered) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }

  // let user = await database.findUser({
  //     where: {
  //         username: decoded.username,
  //         email: decoded.email,
  //         phone_number: decoded.phoneNumber,
  //     },
  // });

  // if (user) {
  //     throw new ApiError({ type: 'error_api_user_exist' });
  // }

  const weightThreshold = 1;
  const accountAuths = [];
  const publicKeys = JSON.parse(public_keys);
  const metadata = '{}';
  const owner = {
    weight_threshold: weightThreshold,
    account_auths: accountAuths,
    key_auths: [[publicKeys.owner, 1]],
  };
  const active = {
    weight_threshold: weightThreshold,
    account_auths: accountAuths,
    key_auths: [[publicKeys.active, 1]],
  };
  const posting = {
    weight_threshold: weightThreshold,
    account_auths: accountAuths,
    key_auths: [[publicKeys.posting, 1]],
  };

  // create user on Steem Chain.
  try {
    await services.createAccount({
      active,
      memo_key: publicKeys.memo,
      json_metadata: metadata,
      owner,
      posting,
      new_account_name: decoded.username,
    });
  } catch (cause) {
    // steem-js error messages are so long that the log is clipped causing
    // errors in scalyr parsing
    cause.message = cause.message.split('\n').slice(0, 2);
    throw new ApiError({
      type: 'error_api_create_account',
      cause,
      status: 500,
    });
  }

  // add user info into db
  let user;
  try {
    const createdTime = new Date();
    user = await database.createUser({
      email: decoded.email,
      email_normalized: normalizeEmail(decoded.email),
      email_is_verified: true,
      phone_number: decoded.phoneNumber,
      phone_number_is_verified: true,
      ip: req.ip,
      account_is_created: true,
      status: 'created',
      created_at: createdTime,
      updated_at: createdTime,
      fingerprint: fingerprint ? JSON.parse(fingerprint) : {},
      username: decoded.username,
      tracking_id: xref || generateTrackingId(),
    });
  } catch (cause) {
    req.log.error({ decoded, cause }, 'create user in database error');
    throw new ApiError({
      type: 'error_api_insert_user_into_db_failed',
      cause,
      status: 500,
    });
  }

  try {
    const updateTronUserResult = await updateTronUser(
      decoded.username,
      tronBindData
    );
    req.log.info(
      { decoded, updateTronUserResult },
      'bind_tron_address_success'
    );
  } catch (cause) {
    req.log.error(
      { decoded, tronBindData, cause },
      'error_api_bind_tron_addr_failed'
    );
    throw new ApiError({
      type: 'error_api_bind_tron_addr_failed',
      cause,
      status: 500,
    });
  }

  // try {
  //     await services.gatekeeperMarkSignupCreated(user);
  // } catch (error) {
  //     req.log.warn({ error }, 'gatekeeper.signup_mark_created failed');
  // }

  const params = [
    decoded.username,
    {
      phone: user.phone_number.replace(/[^+0-9]+/g, ''),
      email: user.email,
    },
  ];

  services.conveyorCall('set_user_data', params).catch((error) => {
    // TODO: this should retry more than once
    req.log.warn(error, 'Unable to store user data in conveyor... retrying');
    setTimeout(() => {
      services.conveyorCall('set_user_data', params).catch((error) => {
        req.log.error(error, 'Unable to store user data in conveyor');
      });
    }, 5 * 1000);
  });

  // TOS
  const tosParams = [decoded.username, 'accepted_tos_20180614'];
  services.conveyorCall('assign_tag', tosParams).catch((error) => {
    req.log.warn(error, 'Unable to store user tos in conveyor... retrying');
    setTimeout(() => {
      services.conveyorCall('assign_tag', tosParams).catch((error) => {
        req.log.error(error, 'Unable to store user tos in conveyor');
      });
    }, 5 * 1000);
  });

  // Post to Condenser's account recovery endpoint.
  services
    .condenserTransfer(decoded.email, decoded.username, publicKeys.owner)
    .catch((error) => {
      req.log.error(error, 'Unable to send recovery info to condenser');
    });

  // Send success email
  try {
    if (locale === 'zh') {
      await services.sendEmail(decoded.email, 'register_success_zh', {
        username: decoded.username,
        email: decoded.email,
        phoneNumber: decoded.phoneNumber,
      });
    } else {
      await services.sendEmail(decoded.email, 'register_success', {
        username: decoded.username,
        email: decoded.email,
        phoneNumber: decoded.phoneNumber,
      });
    }
  } catch (error) {
    req.log.warn(error, 'Send success register mail failed');
  }
  try {
    // Add user to newsletter subscription list
    await mail.addNewsletterSubscriber(decoded.username, decoded.email);
  } catch (err) {
    req.log.warn(err, 'addNewsletterSubscriber error');
  }

  try {
    await database.deleteEmailRecord({ email: user.email });
    await database.deletePhoneRecord({ phone_number: user.phone_number });
  } catch (err) {
    req.log.warn(err, 'remove email or phone code record error');
  }

  // activity tag analytics, reg source
  try {
    req.log.info({ activityTags }, 'activity_tag_analytics_starting');
    activityTags.forEach((tag) => {
      services.recordActivityTracker({
        trackingId: xref,
        activityTag: tag,
        username: decoded.username,
      });
    });
    const regSource = source ? source.split('|') : [];
    req.log.info({ regSource }, 'reg_source_record_starting');
    if (regSource.length > 0) {
      services.recordSource({
        trackingId: xref,
        app: regSource[0],
        from_page: regSource[1],
      });
    }
  } catch (err) {
    req.log.warn(err, 'activity tag analytics error');
  }

  return { success: true };
}

async function handleCreateTronAddr() {
  const tronUser = await getTronAccount();
  return tronUser;
}

export default {
  handleRequestSms,
  handleConfirmSms,
  handleCreateAccount,
  handleCheckUsername,
  handleGuessCountry,
  handleAnalytics,
  handleRequestEmailCode,
  handleConfirmEmailCode,
  handleCreateTronAddr,
  finalizeSignup,
};
