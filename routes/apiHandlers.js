import crypto from 'crypto';
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

const EMAIL_COOLDOWN_MS = 60 * 1000;
const EMAIL_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_DAILY_MAX_SENDS = 5;
const EMAIL_CODE_TTL_MS = 30 * 60 * 1000;
const MAX_EMAIL_CODE_ATTEMPTS = 10;
const SIGNUP_JWT_EXPIRES_IN = '30m';

function isSixDigitCode(code) {
  return typeof code === 'string' && /^\d{6}$/.test(code);
}

function codesMatch(expected, actual) {
  if (!isSixDigitCode(expected) || !isSixDigitCode(actual)) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(actual, 'utf8')
  );
}

function buildJtiMarker(jti, username) {
  return `JTI:${jti}:${username}`;
}

function buildCreatingMarker(jti, username) {
  return `CREATING:${jti}:${username}`;
}

async function isConveyorEmailRegistered(email, normalizedEmail) {
  if (await services.conveyorCall('is_email_registered', { email })) {
    return true;
  }
  if (
    normalizedEmail &&
    normalizedEmail !== email &&
    (await services.conveyorCall('is_email_registered', {
      email: normalizedEmail,
    }))
  ) {
    return true;
  }
  return false;
}

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
  const normalizedEmail = normalizeEmail(email);
  // white list check (case-insensitive domain match)
  const emailDomain = email.split('@')[1].toLowerCase();
  const privateWhiteEmailDomains = (
    await database.getPrivateWhiteEmailDomain()
  ).map((d) => String(d).toLowerCase());
  if (!privateWhiteEmailDomains.includes(emailDomain)) {
    const whiteEmailDomains = await database.getWhiteEmailDomain();
    const normalizedWhitelist = whiteEmailDomains.map((d) =>
      String(d).toLowerCase()
    );
    if (!normalizedWhitelist.includes(emailDomain)) {
      throw new ApiError({
        type: 'error_api_email_domain',
        field: 'email',
        data: { whiteEmailDomains },
      });
    }
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
    metadata: { email, email_normalized: normalizedEmail },
  });

  return database.withAdvisoryLocks(
    [`email:${normalizedEmail}`],
    {
      timeoutSec: 5,
      timeoutErrorType: 'error_api_wait_one_minute',
      timeoutField: 'email',
      timeoutStatus: 429,
    },
    async () => {
      // duplicate check under lock
      const emailIsInUse = await database.emailIsInUse(email);
      if (emailIsInUse) {
        throw new ApiError({
          type: 'error_api_email_used',
          field: 'email',
        });
      }

      const emailRegistered = await isConveyorEmailRegistered(
        email,
        normalizedEmail
      );
      if (emailRegistered) {
        throw new ApiError({
          type: 'error_api_email_used',
          field: 'email',
        });
      }

      const existingRecords = await database.findEmailRecordsByNormalized(
        email
      );
      const nowMs = Date.now();
      const minusOneMinute = nowMs - EMAIL_COOLDOWN_MS;
      const minusOneDay = nowMs - EMAIL_DAILY_WINDOW_MS;

      let lastAttemptMs = 0;
      let dailySentTimes = 0;
      let earliestWindowStartMs = null;

      for (const row of existingRecords) {
        if (row.last_attempt_verify_email) {
          const attemptMs = row.last_attempt_verify_email.getTime();
          if (attemptMs > lastAttemptMs) {
            lastAttemptMs = attemptMs;
          }
        }
        if (
          row.email_code_first_sent &&
          row.email_code_first_sent.getTime() >= minusOneDay
        ) {
          dailySentTimes += row.email_code_sent || 0;
          const firstMs = row.email_code_first_sent.getTime();
          if (earliestWindowStartMs === null || firstMs < earliestWindowStartMs) {
            earliestWindowStartMs = firstMs;
          }
        }
      }

      // Enforce 24-hour quota across all normalized variants
      if (
        earliestWindowStartMs !== null &&
        dailySentTimes >= EMAIL_DAILY_MAX_SENDS
      ) {
        throw new ApiError({
          field: 'email',
          type: 'error_api_request_too_much',
        });
      }

      // Enforce 1-minute cooldown across all normalized variants
      if (lastAttemptMs > 0 && lastAttemptMs >= minusOneMinute) {
        throw new ApiError({
          field: 'email',
          type: 'error_api_wait_one_minute',
        });
      }

      // Clean up any legacy duplicate variant rows for the same normalized email
      if (existingRecords.length > 1) {
        const duplicateIds = existingRecords
          .slice(1)
          .map((r) => r.id)
          .filter(Boolean);
        await database.deleteEmailRecordsByIds(duplicateIds);
      }

      const captchaCode = generateCode(6);
      const now = new Date(nowMs);
      const nextFirstSent =
        earliestWindowStartMs !== null
          ? new Date(earliestWindowStartMs)
          : now;
      const nextSentCount =
        earliestWindowStartMs !== null ? dailySentTimes + 1 : 1;

      let record = existingRecords[0] || null;
      let wasCreated = false;
      let previousSnapshot = null;

      // Persist quota & cooldown BEFORE calling SES
      if (record) {
        previousSnapshot = {
          email: record.email,
          email_normalized: record.email_normalized,
          email_code: record.email_code,
          email_code_attempts: record.email_code_attempts,
          email_code_sent: record.email_code_sent,
          email_code_generated: record.email_code_generated,
          email_code_first_sent: record.email_code_first_sent,
          last_attempt_verify_email: record.last_attempt_verify_email,
        };
        record.email = email;
        record.email_normalized = normalizedEmail;
        record.email_code_attempts = 0;
        record.email_code = captchaCode;
        record.email_code_generated = now;
        record.email_code_first_sent = nextFirstSent;
        record.email_code_sent = nextSentCount;
        record.last_attempt_verify_email = now;
        await record.save();
      } else {
        try {
          record = await database.createEmailRecord({
            email,
            email_normalized: normalizedEmail,
            last_attempt_verify_email: now,
            email_code: captchaCode,
            email_code_attempts: 0,
            email_code_sent: nextSentCount,
            email_code_generated: now,
            email_code_first_sent: nextFirstSent,
          });
          wasCreated = true;
        } catch (e) {
          logger.error(e, 'insert email code record error');
          throw new ApiError({
            type: 'error_api_general',
            field: 'email',
          });
        }
      }

      // Send the email; roll back quota reservation if delivery fails
      try {
        if (locale === 'zh-cn') {
          await services.sendEmail(email, 'email_code_zh', {
            code: captchaCode,
          });
        } else {
          await services.sendEmail(email, 'email_code', {
            code: captchaCode,
          });
        }
      } catch (cause) {
        if (wasCreated && record?.id) {
          await database.deleteEmailRecordsByIds([record.id]).catch(() => {});
        } else if (record && previousSnapshot) {
          Object.assign(record, previousSnapshot);
          await record.save().catch(() => {});
        }
        throw new ApiError({
          field: 'email',
          type: 'error_api_sent_email_failed',
          cause,
        });
      }

      return { success: true, email, xref: record.ref_code };
    }
  );
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

  const phoneRegistered = await services.conveyorCall('is_phone_registered', {
    phone: parsedPhoneNumber.number,
  });

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
  const currentEmail = req.body?.email;
  const code = req.body?.code;
  const minusHalfHour = Date.now() - EMAIL_CODE_TTL_MS;

  if (!currentEmail) {
    throw new ApiError({
      type: 'error_api_email_required',
      field: 'email_code',
    });
  }

  if (!code) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_code_required',
    });
  }

  if (!isSixDigitCode(code)) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_email_code_invalid',
    });
  }

  await database.actionLimitNew(req.ip, 'check_email_code', 60);

  const normalizedEmail = normalizeEmail(currentEmail);

  // Serialized per email: concurrent guesses must not all be checked against
  // the same snapshot of the attempt counter.
  return database.withAdvisoryLocks(
    [`email:${normalizedEmail}`],
    {
      timeoutSec: 5,
      timeoutErrorType: 'error_api_wait_one_minute',
      timeoutField: 'email_code',
      timeoutStatus: 429,
    },
    async () => {
      const record = await database.findEmailRecordByNormalized(currentEmail);

      if (!record) {
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_unknown_email',
        });
      }

      if ((record.email_code_attempts || 0) >= MAX_EMAIL_CODE_ATTEMPTS) {
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_phone_too_many',
        });
      }

      // code expires after 30 mins from generated time
      if (
        !record.email_code ||
        !isSixDigitCode(record.email_code) ||
        !record.email_code_generated ||
        record.email_code_generated.getTime() <= minusHalfHour
      ) {
        if (
          record.email_code_generated &&
          record.email_code_generated.getTime() <= minusHalfHour
        ) {
          await database.clearExpiredEmailCode(record.id);
        }
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_email_code_invalid',
        });
      }

      if (!codesMatch(record.email_code, code)) {
        // Only a wrong guess spends the attempt budget. The frontend re-checks
        // a correct code on every submit, and finalizeSignup turns records that
        // reached the cap away.
        const incremented = await database.incrementEmailCodeAttempts(
          record.id,
          MAX_EMAIL_CODE_ATTEMPTS
        );
        await database.logAction({
          action: 'check_email_code',
          ip: req.ip,
          metadata: { email_normalized: normalizedEmail },
        });
        if (!incremented) {
          throw new ApiError({
            field: 'email_code',
            type: 'error_api_phone_too_many',
          });
        }
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_email_code_invalid',
        });
      }

      return { success: true };
    }
  );
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

  try {
    accountNameIsValid(username);
  } catch (e) {
    throw new ApiError({
      field: 'username',
      type: e.message,
    });
  }

  if (!email) {
    throw new ApiError({
      field: 'email',
      type: 'error_api_email_required',
    });
  }

  if (!isEmail(email)) {
    throw new ApiError({
      field: 'email',
      type: 'error_api_email_format',
    });
  }

  if (!emailCode) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_code_required',
    });
  }

  if (!isSixDigitCode(emailCode)) {
    throw new ApiError({
      field: 'email_code',
      type: 'error_api_email_code_invalid',
    });
  }

  await database.actionLimitNew(ip, 'create_user_attempt', 60);

  const normalizedEmail = normalizeEmail(email);

  const emailIsInUse = await database.emailIsInUse(email);
  if (emailIsInUse) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  const emailRegistered = await isConveyorEmailRegistered(
    email,
    normalizedEmail
  );
  if (emailRegistered) {
    throw new ApiError({
      type: 'error_api_email_used',
      field: 'email',
    });
  }

  const userExistsOnChain = await services.checkUsername(username);
  if (userExistsOnChain) {
    throw new ApiError({
      field: 'username',
      type: 'error_api_username_used',
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

  // Serialized per email (see handleConfirmEmailCode): the attempt counter is
  // read, compared and consumed without another request interleaving.
  const jti = await database.withAdvisoryLocks(
    [`email:${normalizedEmail}`],
    {
      timeoutSec: 5,
      timeoutErrorType: 'error_api_account_creation_progress',
      timeoutField: 'general',
      timeoutStatus: 409,
    },
    async () => {
      const emailRecord = await database.findEmailRecordByNormalized(email);

      if (!emailRecord) {
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_unknown_email',
        });
      }

      if ((emailRecord.email_code_attempts || 0) >= MAX_EMAIL_CODE_ATTEMPTS) {
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_phone_too_many',
        });
      }

      const now = new Date();
      const minGeneratedAt = new Date(now.getTime() - EMAIL_CODE_TTL_MS);

      if (
        !emailRecord.email_code ||
        !isSixDigitCode(emailRecord.email_code) ||
        !emailRecord.email_code_generated ||
        emailRecord.email_code_generated <= minGeneratedAt
      ) {
        if (
          emailRecord.email_code_generated &&
          emailRecord.email_code_generated <= minGeneratedAt
        ) {
          await database.clearExpiredEmailCode(emailRecord.id);
        }
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_email_code_invalid',
        });
      }

      if (!codesMatch(emailRecord.email_code, emailCode)) {
        const incremented = await database.incrementEmailCodeAttempts(
          emailRecord.id,
          MAX_EMAIL_CODE_ATTEMPTS
        );
        await database.logAction({
          action: 'create_user_attempt',
          ip,
          metadata: { email_normalized: normalizedEmail },
        });
        if (!incremented) {
          throw new ApiError({
            field: 'email_code',
            type: 'error_api_phone_too_many',
          });
        }
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_email_code_invalid',
        });
      }

      // Atomically consume the 6-digit verification code and bind one-time JTI + username
      const jti = crypto.randomUUID();
      const jtiMarker = buildJtiMarker(jti, username);
      const consumed = await database.consumeEmailCodeForSignup({
        id: emailRecord.id,
        expectedCode: emailCode,
        jtiMarker,
        minGeneratedAt,
        maxAttempts: MAX_EMAIL_CODE_ATTEMPTS,
        now,
      });

      if (!consumed) {
        throw new ApiError({
          field: 'email_code',
          type: 'error_api_email_code_invalid',
        });
      }

      return jti;
    }
  );

  const token = jwt.sign(
    {
      type: 'signup_new',
      username,
      email,
      email_normalized: normalizedEmail,
    },
    getEnv('JWT_SECRET'),
    {
      algorithm: 'HS256',
      expiresIn: SIGNUP_JWT_EXPIRES_IN,
      jwtid: jti,
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

  let publicKeys;
  try {
    publicKeys =
      typeof public_keys === 'string' ? JSON.parse(public_keys) : public_keys;
  } catch (cause) {
    throw new ApiError({ type: 'error_api_public_keys_required', cause });
  }
  if (
    !publicKeys ||
    typeof publicKeys !== 'object' ||
    !publicKeys.owner ||
    !publicKeys.active ||
    !publicKeys.posting ||
    !publicKeys.memo
  ) {
    throw new ApiError({ type: 'error_api_public_keys_required' });
  }

  let parsedFingerprint = {};
  if (fingerprint) {
    try {
      parsedFingerprint =
        typeof fingerprint === 'string' ? JSON.parse(fingerprint) : fingerprint;
    } catch {
      parsedFingerprint = {};
    }
  }

  let decoded;

  try {
    decoded = jwt.verify(token, getEnv('JWT_SECRET'), {
      algorithms: ['HS256'],
      maxAge: SIGNUP_JWT_EXPIRES_IN,
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

  if (!decoded.jti || !decoded.username || !decoded.email) {
    throw new ApiError({
      type: 'error_api_token_invalid',
    });
  }

  try {
    accountNameIsValid(decoded.username);
  } catch (e) {
    throw new ApiError({
      type: e.message,
    });
  }

  const normalizedEmail = normalizeEmail(decoded.email);
  const expectedMarker = buildJtiMarker(decoded.jti, decoded.username);
  const creatingMarker = buildCreatingMarker(decoded.jti, decoded.username);
  const minGeneratedAt = new Date(Date.now() - EMAIL_CODE_TTL_MS);

  const weightThreshold = 1;
  const accountAuths = [];
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

  const user = await database.withAdvisoryLocks(
    [`email:${normalizedEmail}`, `user:${decoded.username}`],
    {
      timeoutSec: 5,
      timeoutErrorType: 'error_api_account_creation_progress',
      timeoutField: 'general',
      timeoutStatus: 409,
    },
    async () => {
      const emailRecord = await database.findEmailRecordByNormalized(
        decoded.email
      );
      if (
        !emailRecord ||
        emailRecord.email_code !== expectedMarker ||
        !emailRecord.email_code_generated ||
        emailRecord.email_code_generated <= minGeneratedAt
      ) {
        throw new ApiError({
          type: 'error_api_token_invalid',
        });
      }

      const claimed = await database.claimEmailSignupJti({
        id: emailRecord.id,
        expectedMarker,
        creatingMarker,
        minGeneratedAt,
      });
      if (!claimed) {
        throw new ApiError({
          type: 'error_api_token_invalid',
        });
      }

      const userExists = await services.checkUsername(decoded.username);
      if (userExists) {
        await database
          .deleteEmailRecordByNormalized(decoded.email)
          .catch(() => {});
        throw new ApiError({
          type: 'error_api_username_used',
          status: 200,
        });
      }

      const usernameExist = await database.countUsers({
        username: decoded.username,
      });
      if (usernameExist) {
        await database
          .deleteEmailRecordByNormalized(decoded.email)
          .catch(() => {});
        throw new ApiError({
          field: 'code',
          type: 'error_api_user_exist',
        });
      }

      const emailIsInUse = await database.emailIsInUse(decoded.email);
      if (emailIsInUse) {
        await database
          .deleteEmailRecordByNormalized(decoded.email)
          .catch(() => {});
        throw new ApiError({
          type: 'error_api_email_used',
          field: 'email',
        });
      }

      const emailRegistered = await isConveyorEmailRegistered(
        decoded.email,
        normalizedEmail
      );
      if (emailRegistered) {
        await database
          .deleteEmailRecordByNormalized(decoded.email)
          .catch(() => {});
        throw new ApiError({
          type: 'error_api_email_used',
          field: 'email',
        });
      }

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
        const existsAfterError = await services
          .checkUsername(decoded.username)
          .catch(() => true);
        if (!existsAfterError) {
          await database
            .restoreEmailSignupJti({
              id: emailRecord.id,
              creatingMarker,
              expectedMarker,
            })
            .catch(() => {});
        } else {
          await database
            .deleteEmailRecordByNormalized(decoded.email)
            .catch(() => {});
        }
        if (cause && typeof cause.message === 'string') {
          // steem-js error messages are so long that the log is clipped causing
          // errors in scalyr parsing
          cause.message = cause.message.split('\n').slice(0, 2);
        }
        throw new ApiError({
          type: 'error_api_create_account',
          cause,
          status: 500,
        });
      }

      // add user info into db
      let createdUser;
      try {
        const createdTime = new Date();
        createdUser = await database.createUser({
          email: decoded.email,
          email_normalized: normalizedEmail,
          email_is_verified: true,
          ip: req.ip,
          account_is_created: true,
          status: 'created',
          created_at: createdTime,
          updated_at: createdTime,
          fingerprint: parsedFingerprint,
          username: decoded.username,
          tracking_id,
        });
      } catch (cause) {
        req.log.error({ decoded, cause }, 'create user in database error');
        await database
          .deleteEmailRecordByNormalized(decoded.email)
          .catch(() => {});
        throw new ApiError({
          type: 'error_api_insert_user_into_db_failed',
          cause,
          status: 500,
        });
      }

      try {
        await database.deleteEmailRecordByNormalized(decoded.email);
      } catch (err) {
        req.log.warn(err, 'remove email code record error');
      }

      return createdUser;
    }
  );

  const params = {
    account: decoded.username,
    userData: {
      email: user.email,
    },
  };

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
  const tosParams = { uid: decoded.username, tag: 'accepted_tos_20180614' };
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

  // activity tag analytics, reg source
  try {
    req.log.info({ activityTags }, 'activity_tag_analytics_starting');
    if (Array.isArray(activityTags)) {
      activityTags.forEach((tag) => {
        services.recordActivityTracker({
          trackingId: tracking_id,
          activityTag: tag,
          username: decoded.username,
        });
      });
    }
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
  handleRequestEmailCode,
  handleConfirmEmailCode,
  finalizeSignup,
};
