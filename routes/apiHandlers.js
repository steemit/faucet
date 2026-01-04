import jwt from 'jsonwebtoken';
import mail from '../helpers/mail.js';
import { getLogChild } from '../helpers/logger.js';
import services from '../helpers/services.js';
import database from '../helpers/database.js';
import ApiError from '../helpers/errortypes.js';
import { parsePhoneNumber } from 'react-phone-number-input';
import {
  accountNameIsValid,
  normalizeEmail,
  isEmail,
} from '../helpers/validator.js';
import { getEnv, generateCode } from '../helpers/common.js';

const logger = getLogChild({ module: 'api_handlers' });

/**
 * Check the validity and blockchain availability of a username
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

async function handleRequestEmailCode(req) {
  const ip = req.ip;
  const email = req.body?.email;
  const locale = req.body?.locale;
  // check email value empty
  if (!email) {
    throw new ApiError({
      type: 'error_api_email_required',
      field: 'email',
    });
  }
  // email format check
  if (!isEmail(email)) {
    throw new ApiError({
      type: 'error_api_email_format',
      field: 'email',
    });
  }
  // white list check
  const emailDomain = email.split('@')[1];
  const whiteEmailDomains = await database.getWhiteEmailDomain();
  if (!whiteEmailDomains.includes(emailDomain)) {
    throw new ApiError({
      type: 'error_api_email_domain',
      field: 'email',
      data: { whiteEmailDomains },
    });
  }
  // account creation policy check
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

  // action limit check
  await database.actionLimitNew(ip, 'request_email_code');

  // log action
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
  if (locale === 'zh-cn') {
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
  // check captcha
  if (getEnv('TURNSTILE_SWITCH') !== 'OFF') {
    const captcha = req.body.phoneCaptcha;
    if (!captcha) {
      throw new ApiError({
        field: 'phoneNumber',
        type: 'error_api_captcha_required',
      });
    }
    try {
      await services.verifyCaptcha(captcha, req.ip);
    } catch (cause) {
      throw new ApiError({
        field: 'phoneNumber',
        type: 'error_api_captcha_invalid',
        cause,
      });
    }
  }
  /*
    Parse Phone Number 
      eg. +1 234 567 8910
      parsedPhoneNumber: {
        countryCallingCode: '1',
        country: 'US',
        nationalNumber: '2345678910',
        number: '+12345678910',
      }
  */
  const parsedPhoneNumber = parsePhoneNumber(req.body?.phoneNumber);
  if (!parsedPhoneNumber) {
    throw new ApiError({
      type: 'error_phone_invalid',
      field: 'phoneNumber',
    });
  }
  // like 1_us
  const prefix =
    `${parsedPhoneNumber.countryCallingCode}_${parsedPhoneNumber.country}`.toLowerCase();
  // record sms tracker
  services.recordSmsTracker({
    sendType: 'get_in',
    countryCode: prefix,
    phoneNumber: parsedPhoneNumber.nationalNumber,
  });
  // check pending claimed accounts
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
  // check country number block list
  const countryNumberList = getEnv('COUNTRY_NUMBER')
    ? getEnv('COUNTRY_NUMBER').split(',')
    : '';
  if (countryNumberList.indexOf(parsedPhoneNumber.countryCallingCode) !== -1) {
    req.log.warn({ phoneNumber: req.body }, 'sms_phone_number_hit_block_list');
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_country_blocked',
    });
  }

  const phoneExists = await database.phoneIsInUse(parsedPhoneNumber.number);

  if (phoneExists) {
    throw new ApiError({
      field: 'phoneNumber',
      type: 'error_api_phone_used',
    });
  }

  const phoneRegistered = await services.conveyorCall('is_phone_registered', [
    parsedPhoneNumber.number,
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
      phoneNumber: parsedPhoneNumber.number,
      countryNumber: parsedPhoneNumber.countryCallingCode,
    },
  });

  try {
    // check phone valid by twilio
    // attention: this may take some money
    await services.validatePhone(parsedPhoneNumber.number);
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
      phone_number: parsedPhoneNumber.number,
    },
  });

  if (existingRecord) {
    record = existingRecord;
    record.phone_code = null;
  } else {
    const newPhoneRecord = await database.createPhoneRecord({
      phone_number: parsedPhoneNumber.number,
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
    parsedPhoneNumber.countryCallingCode,
    parsedPhoneNumber.number
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
    const tempMetadata = tempNumber.metadata
      ? JSON.parse(tempNumber.metadata)
      : null;
    if (tempMetadata === null) {
      throw new ApiError({
        field: 'phone',
        type: 'error_api_unknown_phone',
      });
    }
    lastPhoneCodeRecord = await database.findPhoneRecord({
      where: { phone_number: tempMetadata.phoneNumber },
    });
    if (lastPhoneCodeRecord != null && !lastPhoneCodeRecord.phone_code) {
      if (
        lastPhoneCodeRecord.last_attempt_verify_phone_number.getTime() >=
        minusOneMinute
      ) {
        req.log.warn(
          { phoneNumber: parsedPhoneNumber.number },
          'hfp:lower_than_one_minute'
        );
        services.recordSmsTracker({
          sendType: 'hit_hfp_1',
          countryCode: parsedPhoneNumber.countryCallingCode,
          phoneNumber: parsedPhoneNumber.number,
        });
        throw new ApiError({
          field: 'phone',
          type: 'error_api_wait_one_minute',
        });
      }
      const count = await database.countTryNumber(
        parsedPhoneNumber.countryCallingCode,
        highFrequencyRange
      );
      if (
        count >= highFrequencyCount &&
        lastPhoneCodeRecord.last_attempt_verify_phone_number.getTime() >=
          minusOneHour
      ) {
        req.log.warn(
          { phoneNumber: parsedPhoneNumber.number },
          'hfp:lower_than_one_hour'
        );
        services.recordSmsTracker({
          sendType: 'hit_hfp_2',
          countryCode: parsedPhoneNumber.countryCallingCode,
          phoneNumber: parsedPhoneNumber.number,
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
  if (
    delaySendBlockCountryNumbers.indexOf(
      parsedPhoneNumber.countryCallingCode
    ) !== -1
  ) {
    const delaySendTimeout = getEnv('DELAY_SEND_SMS_TIMEOUT')
      ? parseInt(getEnv('DELAY_SEND_SMS_TIMEOUT').split(','), 10) * 1000
      : 3600 * 1000;
    if (hitNumbers.length > 0) {
      const tempNumber = hitNumbers[0];
      // if sending interval time lower than delaySendTimeout, throw err
      if (now - tempNumber.created_at.getTime() <= delaySendTimeout) {
        req.log.warn(
          { phoneNumber: parsedPhoneNumber.number },
          'delay sending code, lower than DELAY_SEND_SMS_TIMEOUT'
        );
        services.recordSmsTracker({
          sendType: 'hit_delay_sending_1',
          countryCode: parsedPhoneNumber.countryCallingCode,
          phoneNumber: parsedPhoneNumber.number,
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
          { phoneNumber: parsedPhoneNumber.number },
          'delay sending code when last same country number does not register success'
        );
        services.recordSmsTracker({
          sendType: 'hit_delay_sending_2',
          countryCode: parsedPhoneNumber.countryCallingCode,
          phoneNumber: parsedPhoneNumber.number,
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
      phoneNumber: parsedPhoneNumber.number,
      countryNumber: parsedPhoneNumber.countryCallingCode,
    },
  });
  services.recordSmsTracker({
    sendType: 'before_send_sms',
    countryCode: parsedPhoneNumber.countryCallingCode,
    phoneNumber: parsedPhoneNumber.number,
  });

  const phoneCode = generateCode(6);
  const countryCodeList = getEnv('COUNTRY_CODE')
    ? getEnv('COUNTRY_CODE').split(',')
    : '';

  try {
    if (countryCodeList.indexOf(parsedPhoneNumber.countryCallingCode) !== -1) {
      // legacy send method
      let msg;
      if (req.body.locale === 'zh-cn') {
        msg = `[Steemit] 验证码为: ${phoneCode}，有效期30分钟。请勿泄漏给他人。`;
      } else {
        msg = `[Steemit] verification code: ${phoneCode}, which will expire after 30 minutes. Please do not disclose code to others.`;
      }
      const response = await services.sendSMS(parsedPhoneNumber.number, msg);
      services.recordSmsTracker({
        sendType: 'after_send_sms_1',
        countryCode: parsedPhoneNumber.countryCallingCode,
        phoneNumber: parsedPhoneNumber.number,
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
      // new send code method
      const response = await services.sendSMSCode(parsedPhoneNumber.number);
      services.recordSmsTracker({
        sendType: 'after_send_sms_2',
        countryCode: parsedPhoneNumber.countryCallingCode,
        phoneNumber: parsedPhoneNumber.number,
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
    req.log.warn(
      { cause, phoneNumber: parsedPhoneNumber.number },
      'sms_send_error'
    );
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
  if (countryCodeList.indexOf(parsedPhoneNumber.countryCallingCode) !== -1) {
    // legacy send method
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

  return {
    success: true,
    phoneNumber: parsedPhoneNumber.number,
    ref: record.ref_code,
  };
}

async function handleConfirmEmailCode(req) {
  const currentEmail = req.body.email;
  const minusHalfHour = Date.now() - 1800000;

  if (!currentEmail) {
    throw new ApiError({
      type: 'error_api_email_required',
      field: 'email_code',
    });
  }

  if (!req.body.code) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_code_required',
    });
  }

  const record = await database.findEmailRecord({
    where: { email: currentEmail },
  });

  if (!record) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_unknown_email',
    });
  }

  // incorrect input over 100 times
  if (record.email_code_attempts >= 100) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_phone_too_many',
    });
  }

  // code expires after 30 mins from generated time
  if (record.email_code_generated <= minusHalfHour) {
    record.email_code = null;
    record.email_code_attempts = 0;
    record.save();
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_email_code_invalid',
    });
  }

  // try code
  record.email_code_attempts += 1;
  // if doesn't match
  if (record.email_code !== req.body.code) {
    await record.save();
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_email_code_invalid',
    });
  }

  return { success: true };
}

async function handleConfirmSms(req) {
  if (!req.body.code) {
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_code_required',
    });
  }

  if (!req.body.phoneNumber) {
    throw new ApiError({
      type: 'error_api_phone_required',
      field: 'phone_code',
    });
  }

  if (req.body.code.length !== 6) {
    throw new ApiError({
      type: 'error_api_code_length_required',
      field: 'phone_code',
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
      field: 'phone_code',
      type: 'error_api_findPhoneRecord_failed',
      cause,
    });
  }

  req.log.info({ record }, 'handleConfirmSms_findPhoneRecord_result');

  if (record === null) {
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_unknown_phone_number',
    });
  }

  if (record.phone_code_attempts >= 50) {
    throw new ApiError({
      field: 'phone_code',
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
      field: 'phone_code',
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
      field: 'phone_code',
      type: 'error_api_phone_code_invalid',
    });
  }

  if (record.phone_code !== req.body.code) {
    await record.save();
    throw new ApiError({
      field: 'phone_code',
      type: 'error_api_phone_code_invalid',
    });
  }

  return { success: true };
}

/*
  API: /api/create_user
  Method: POST
  Params:
    - captcha: string
    - email: string
    - emailCode: string
    - phoneNumber: string
    - phoneCode: string
    - username: string
  This is for component UserInfo.js
*/

async function finalizeSignup(req) {
  const ip = req.ip;
  const captcha = req.body?.captcha;
  const email = req.body?.email;
  const emailCode = req.body?.emailCode;
  const username = req.body?.username;

  if (getEnv('TURNSTILE_SWITCH') !== 'OFF') {
    if (!captcha) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_captcha_required',
      });
    }
    try {
      await services.verifyCaptcha(captcha, ip);
    } catch (cause) {
      throw new ApiError({
        field: 'code',
        type: 'error_api_captcha_invalid',
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

  if (!emailCode) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_code_required',
    });
  }

  const emailIsInUse = await database.emailIsInUse(email);
  if (emailIsInUse) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  const emailRecord = await database.findEmailRecord({
    where: {
      email,
    },
  });

  if (!emailRecord) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_unknown_email',
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

  const token = jwt.sign(
    {
      type: 'signup_new',
      username,
      email,
    },
    getEnv('JWT_SECRET'),
    {
      algorithm: 'HS256',
    }
  );

  return { success: true, token };
}

// final create user on Blockchain and insert into database
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
    tracking_id,
    locale,
    activityTags,
    source, // format: app|tag (eg. condenser|submit_post)
  } = req.body;

  if (!public_keys) {
    throw new ApiError({ type: 'error_api_public_keys_required' });
  }

  if (!token) {
    throw new ApiError({ type: 'error_api_token_required' });
  }

  if (!tracking_id) {
    throw new ApiError({ type: 'error_api_tracking_id_required' });
  }

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

  // Create user on Steem Chain.
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
      ip: req.ip,
      account_is_created: true,
      status: 'created',
      created_at: createdTime,
      updated_at: createdTime,
      fingerprint: fingerprint ? JSON.parse(fingerprint) : {},
      username: decoded.username,
      tracking_id,
    });
  } catch (cause) {
    req.log.error({ decoded, cause }, 'create user in database error');
    throw new ApiError({
      type: 'error_api_insert_user_into_db_failed',
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
    if (locale === 'zh-cn') {
      await services.sendEmail(decoded.email, 'register_success_zh', {
        username: decoded.username,
        email: decoded.email,
      });
    } else {
      await services.sendEmail(decoded.email, 'register_success', {
        username: decoded.username,
        email: decoded.email,
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
  } catch (err) {
    req.log.warn(err, 'remove email code record error');
  }

  // activity tag analytics, reg source
  try {
    req.log.info({ activityTags }, 'activity_tag_analytics_starting');
    activityTags.forEach((tag) => {
      services.recordActivityTracker({
        trackingId: tracking_id,
        activityTag: tag,
        username: decoded.username,
      });
    });
    const regSource = source ? source.split('|') : [];
    req.log.info({ regSource }, 'reg_source_record_starting');
    if (regSource.length > 0) {
      services.recordSource({
        trackingId: tracking_id,
        app: regSource[0],
        from_page: regSource[1],
      });
    }
  } catch (err) {
    req.log.warn(err, 'activity tag analytics error');
  }

  return { success: true };
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
  finalizeSignup,
};
