/**
 * Service helpers, any external call is made through one of these.
 * This allows us to test the signup process without having the full stack setup.
 *
 * All service helpers should use a mock variant if the DEBUG_MODE env var is set.
 */

import steem from '@steemit/steem-js';
import jwt from 'jsonwebtoken';
import { getLogChild } from './logger.js';
import mail from './mail.js';
import twilio from './twilio.js';
import { getEnv } from './common.js';
import geoip from './maxmind.js';

const logger = getLogChild({ module: 'helper_services' });

const DEBUG_MODE = getEnv('DEBUG_MODE') !== undefined;
if (DEBUG_MODE) {
  logger.warn('!! Running in debug mode !!');
}

const condenserSecret = getEnv('CREATE_USER_SECRET');
const condenserUrl = getEnv('CREATE_USER_URL');
const conveyorAccount = getEnv('CONVEYOR_USERNAME');
const conveyorKey = getEnv('CONVEYOR_POSTING_WIF');
const recaptchaSecret = getEnv('RECAPTCHA_SECRET');
const PENDING_CLAIMED_ACCOUNTS_THRESHOLD = getEnv(
  'PENDING_CLAIMED_ACCOUNTS_THRESHOLD'
)
  ? getEnv('PENDING_CLAIMED_ACCOUNTS_THRESHOLD')
  : 50;
const CREATOR_INFO = getEnv('CREATOR_INFO') ? getEnv('CREATOR_INFO') : '';
const rpcNode = getEnv('STEEMJS_URL');
if (rpcNode) {
  steem.api.setOptions({ url: rpcNode });
}

/**
 * Send a SMS.
 * @param to Message recipient, e.g. +1234567890.
 * @param body Message body.
 */
export async function sendSMS(to, body) {
  if (DEBUG_MODE) {
    logger.warn('Send SMS to %s with body: %s', to, body);
  } else {
    return twilio.sendMessage(to, body);
  }
}

/**
 * Send a SMS Code.
 * @param to Message recipient, e.g. +1234567890.
 */
export async function sendSMSCode(to) {
  if (DEBUG_MODE) {
    logger.warn('Send SMS to %s', to);
  } else {
    return twilio.sendAuthCode(to);
  }
}

/**
 * Auth a SMS Code.
 * @param to Message recipient, e.g. +1234567890.
 * @param code Auth Code.
 */
export async function authSMSCode(to, code) {
  if (DEBUG_MODE) {
    logger.warn('Send SMS to %s with code: %s', to, code);
    return true;
  }
  let result;
  try {
    result = await twilio.checkAuthCode(to, code);
    if (result.status === 'approved') {
      return true;
    }
  } catch (err) {
    logger.warn(
      '[Check Error]Phone %s with code %s, err: %s',
      to,
      code,
      JSON.stringify(err)
    );
    return false;
  }
  logger.warn(
    '[Check Error]Phone %s with code %s, result: %s',
    to,
    code,
    JSON.stringify(result)
  );
  return false;
}

/**
 * Validate phone number.
 * @param number Number to validate, e.g. +1234567890.
 */
export async function validatePhone(number) {
  if (DEBUG_MODE) {
    logger.warn('Validate %s', number);
  } else {
    return twilio.isValidNumber(number);
  }
}

/**
 * Send an email.
 * @param to Message recipient, e.g. foo@example.com.
 * @param template Template to use, e.g. `account_reminder`.
 * @param context (optional) Template variables as key value pair.
 */
export async function sendEmail(to, template, context) {
  if (DEBUG_MODE) {
    logger.warn(
      { mailCtx: context },
      'Send Email to %s using template %s',
      to,
      template
    );
  } else {
    return mail.send(to, template, context);
  }
}

/**
 * Send out the approval email.
 * @param to Email to send approval token to.
 * @param baseUrl Url where application is served.
 */
export async function sendApprovalEmail(to, baseUrl) {
  const mailToken = jwt.sign(
    {
      type: 'create_account',
      email: to,
    },
    getEnv('JWT_SECRET'),
    {
      algorithm: 'HS256',
    }
  );
  await sendEmail(to, 'create_account', {
    url: `${baseUrl}/create-account?token=${mailToken}`,
  });
}

/**
 * Call conveyor method.
 * @param method Method name of method to be called, without prefix e.g. `is_phone_registered`.
 * @param params (optional) Parameters for the call.
 */
export async function conveyorCall(method, params) {
  if (DEBUG_MODE) {
    logger.warn({ callParams: params }, 'Conveyor call %s', method);
    switch (method) {
      case 'is_email_registered':
        return (params.email || params[0]) === 'taken@steemit.com';
      case 'is_phone_registered':
        return (params.phone || params[0]) === '+12345678900';
      case 'set_user_data':
        return;
      default:
        throw new Error(`No mock implementation for ${method}`);
    }
  } else {
    return steem.api.signedCallAsync(
      `conveyor.${method}`,
      params,
      conveyorAccount,
      conveyorKey
    );
  }
}

/**
 * Verify Google recaptcha.
 * @param recaptcha Challenge.
 * @param ip Remote addr of client.
 */
export async function verifyCaptcha(recaptcha, ip) {
  if (DEBUG_MODE) {
    logger.warn('Verify captcha for %s', ip);
  } else {
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptcha}&remoteip=${ip}`;
    const response = await (await fetch(url)).json();
    if (!response.success) {
      const codes = response['error-codes'] || ['unknown'];
      throw new Error(`Captcha verification failed: ${codes.join()}`);
    }
  }
}

/**
 * Create new steem account.
 * @param payload Account create with delegation operation.
 */
export async function createAccount(payload) {
  if (DEBUG_MODE) {
    logger.warn({ accountPayload: payload }, 'Creating new account');
  } else {
    return steem.api.signedCallAsync(
      `kingdom.create_account`,
      payload,
      conveyorAccount,
      conveyorKey
    );
  }
}

/**
 * Check if username is taken on chain.
 * @param username Username to check if available.
 */
export async function checkUsername(username) {
  if (DEBUG_MODE) {
    logger.warn('Check username %s', username);
    return username === 'taken';
  }
  // TODO: this could use lookup_accounts which is less heavy on our rpc nodes
  const [account] = await steem.api.getAccountsAsync([username]);
  return !!account;
}

/**
 * Pulls out browser fingerprinting metadata from user data.
 *
 * @param {object} user sequelize model instance
 * @returns {object}
 */
export function extractMetadataFromUser(user) {
  const metadata = {
    browser_date: user.fingerprint.date,
    browser_lang: user.fingerprint.lang,
    browser_ref: user.fingerprint.ref,
    email: user.email,
    id: String(user.id),
    phone_number: user.phone_number,
    remote_addr: user.ip,
    user_agent: user.fingerprint.ua,
    username: user.username,
  };

  const device = user.fingerprint.device;

  if (device && device.renderer && device.vendor) {
    metadata.browser_gpu = `${device.vendor} ${device.renderer}`;
  }

  return metadata;
}

/**
 * Call out to gatekeeper to check for approval status.
 * @param user User (aka Signup) instance to check
 */
export async function gatekeeperCheck(user) {
  const metadata = extractMetadataFromUser(user);

  return steem.api.signedCallAsync(
    'gatekeeper.check',
    { metadata },
    conveyorAccount,
    conveyorKey
  );
}

/**
 * Retrieves signup data from Gatekeeper.
 *
 * @param {object} user sequelize model instance
 */
export async function gatekeeperSignupGet(gatekeeperSignupId) {
  return steem.api.signedCallAsync(
    'gatekeeper.signup_get',
    { id: gatekeeperSignupId },
    conveyorAccount,
    conveyorKey
  );
}

/**
 * Asks Gatekeeper to record a signup.
 *
 * @param {object} user sequelize model instance
 */
export async function gatekeeperSignupCreate(user) {
  return steem.api.signedCallAsync(
    'gatekeeper.signup_create',
    {
      ip: user.ip,
      username: user.username,
      email: user.email,
      phone: user.phone_number,
      meta: extractMetadataFromUser(user),
    },
    conveyorAccount,
    conveyorKey
  );
}

export async function gatekeeperMarkSignupApproved(user, adminUsername) {
  return steem.api.signedCallAsync(
    'gatekeeper.signup_mark_approved',
    {
      id: user.gatekeeper_id,
      actor: adminUsername,
    },
    conveyorAccount,
    conveyorKey
  );
}

export async function gatekeeperMarkSignupRejected(user, adminUsername) {
  return steem.api.signedCallAsync(
    'gatekeeper.signup_mark_rejected',
    {
      id: user.gatekeeper_id,
      actor: adminUsername,
    },
    conveyorAccount,
    conveyorKey
  );
}

export async function gatekeeperMarkSignupCreated(user) {
  return steem.api.signedCallAsync(
    'gatekeeper.signup_mark_created',
    { id: user.gatekeeper_id },
    conveyorAccount,
    conveyorKey
  );
}

/**
 * Transfer account data to old recovery system.
 * @param username Username to check if available.
 */
export async function condenserTransfer(email, username, ownerKey) {
  if (DEBUG_MODE) {
    logger.warn('Transfer data for %s to conveyor', username);
  } else {
    const req = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name: username,
        owner_key: ownerKey,
        secret: condenserSecret,
      }),
    };
    const res = await fetch(condenserUrl, req);
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }
  }
}

/**
 * Get location information for an IP.
 *
 * @param {string} ip ip address
 * @return {object} maxmind location data
 */
export function locationFromIp(ip) {
  return geoip.get(ip);
}

/**
 * Should recaptcha be required for this IP address?
 *
 * @param {string} ip ip address
 * @return {boolean}
 */
export function recaptchaRequiredForIp(ip) {
  const location = locationFromIp(ip);
  return location && location.country;
}

export function recordActivityTracker({ trackingId, activityTag, username }) {
  const data = {
    measurement: 'activity_tracker',
    tags: {
      activityTag,
      appType: 'faucet',
    },
    fields: {
      reg: 1,
      trackingId,
      username,
    },
  };
  steem.api.call('overseer.collect', ['custom', data], (error) => {
    if (error) {
      logger.error('activity_tracker_error', error);
    }
  });
}

export function recordSmsTracker({ sendType, countryCode, phoneNumber }) {
  const data = {
    measurement: 'send_sms',
    tags: {
      sendType,
      countryCode,
    },
    fields: {
      phoneNumber,
    },
  };
  steem.api.call('overseer.collect', ['custom', data], (error) => {
    if (error) {
      logger.error(
        'record_sms_tracker_error:',
        error,
        sendType,
        countryCode,
        phoneNumber
      );
    }
  });
}

export function recordSource({ trackingId, app, from_page }) {
  const data = {
    measurement: 'signup_origin',
    tags: {
      app,
      from_page,
    },
    fields: {
      trackingId,
    },
  };
  steem.api.call('overseer.collect', ['custom', data], (error) => {
    if (error) {
      logger.error('record_source_error', error, app, from_page);
    }
  });
}

export async function getPendingClaimedAccountsAsync() {
  if (!CREATOR_INFO) {
    return false;
  }
  const accounts = CREATOR_INFO.split('|');
  if (accounts.length === 0) {
    return false;
  }
  return steem.api.getAccountsAsync(accounts).then((res) => {
    if (res) {
      const claim_acconts = {};
      res.forEach((acc) => {
        claim_acconts[acc.name] = acc.pending_claimed_accounts;
      });
      if (
        Math.max(...Object.values(claim_acconts)) >
        PENDING_CLAIMED_ACCOUNTS_THRESHOLD
      ) {
        return true;
      }
    }
    return false;
  });
}

export default {
  checkUsername,
  condenserTransfer,
  conveyorCall,
  createAccount,
  gatekeeperCheck,
  gatekeeperSignupGet,
  gatekeeperSignupCreate,
  gatekeeperMarkSignupApproved,
  gatekeeperMarkSignupRejected,
  gatekeeperMarkSignupCreated,
  locationFromIp,
  recaptchaRequiredForIp,
  sendApprovalEmail,
  sendEmail,
  sendSMS,
  sendSMSCode,
  authSMSCode,
  validatePhone,
  verifyCaptcha,
  recordActivityTracker,
  recordSmsTracker,
  recordSource,
  getPendingClaimedAccountsAsync,
};
