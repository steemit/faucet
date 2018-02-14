const Twilio = require('twilio').Twilio;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const serviceSid = process.env.TWILIO_SERVICE_SID;

if (!accountSid || !authToken) {
    throw new Error('Misconfiguration: Missing twilio credentials');
}

if (!fromNumber && !serviceSid) {
    throw new Error('Misconfiguration: Missing twilio from number or service sid');
}

const client = new Twilio(accountSid, authToken);

async function sendMessage(to, body) {
    const payload = {to, body};
    if (serviceSid) {
        payload.messagingServiceSid = serviceSid;
    } else {
        payload.from = fromNumber;
    }
    return client.messages.create(payload);
}

module.exports = sendMessage;
