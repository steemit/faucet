import twilio from 'twilio';
import { getEnv } from './common.js';

const accountSid = getEnv('TWILIO_ACCOUNT_SID');
const authToken = getEnv('TWILIO_AUTH_TOKEN');
const fromNumber = getEnv('TWILIO_PHONE_NUMBER');
const serviceSid = getEnv('TWILIO_SERVICE_SID');
const authCodeServiceSid = getEnv('TWILIO_AUTH_CODE_SERVICE_SID');

if (!accountSid || !authToken) {
  throw new Error('Missing twilio credentials');
}

if (!fromNumber && !serviceSid && !authCodeServiceSid) {
  throw new Error('Missing twilio from number or service sid');
}

const client = new twilio(accountSid, authToken);

export async function sendMessage(to, body) {
  const payload = { to, body };
  if (serviceSid) {
    payload.messagingServiceSid = serviceSid;
  } else {
    payload.from = fromNumber;
  }
  return client.messages.create(payload);
}

export async function sendAuthCode(to) {
  return client.verify
    .services(authCodeServiceSid)
    .verifications.create({ to, channel: 'sms' });
}

export async function checkAuthCode(to, code) {
  return client.verify
    .services(authCodeServiceSid)
    .verificationChecks.create({ to, code });
}

export async function isValidNumber(numberE164) {
  return client.lookups.v1.phoneNumbers(numberE164).fetch();
}

export default {
  sendMessage,
  sendAuthCode,
  checkAuthCode,
  isValidNumber,
};
