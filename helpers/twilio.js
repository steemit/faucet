const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const authCodeServiceSid = process.env.TWILIO_AUTH_CODE_SERVICE_SID;

if (!accountSid || !authToken) {
    throw new Error('Misconfiguration: Missing twilio credentials');
}

if (!fromNumber && !serviceSid && !authCodeServiceSid) {
    throw new Error(
        'Misconfiguration: Missing twilio from number or service sid'
    );
}

const client = new Twilio(accountSid, authToken);

async function sendMessage(to, body) {
    const payload = { to, body };
    if (serviceSid) {
        payload.messagingServiceSid = serviceSid;
    } else {
        payload.from = fromNumber;
    }
    return client.messages.create(payload);
}

async function sendAuthCode(to) {
    return client.verify
        .services(authCodeServiceSid)
        .verifications.create({ to, channel: 'sms' });
}

async function checkAuthCode(to, code) {
    return client.verify
        .services(authCodeServiceSid)
        .verificationChecks.create({ to, code });
}

async function isValidNumber(numberE164) {
    return client.lookups.v1.phoneNumbers(numberE164).fetch();
}

module.exports = {
    sendMessage,
    sendAuthCode,
    checkAuthCode,
    isValidNumber,
};
