const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const rateLimitSid = process.env.TWILIO_RATE_LIMIT_SID;
const rateLimitBucketSid = process.env.TWILIO_RATE_LIMIT_BUCKET_SID;
const rateLimitBucketMax = process.env.TWILIO_RATE_LIMIT_BUCKET_MAX;
const rateLimitBucketInterval = process.env.TWILIO_RATE_LIMIT_BUCKET_INTERVAL;
const authCodeServiceSid = process.env.TWILIO_AUTH_CODE_SERVICE_SID;

if (!accountSid || !authToken) {
    throw new Error('Misconfiguration: Missing twilio credentials');
}

if (!fromNumber && !serviceSid && !authCodeServiceSid) {
    throw new Error(
        'Misconfiguration: Missing twilio from number or service sid'
    );
}

if (!rateLimitSid) {
    throw new Error('Misconfiguration: Missing twilio rate limit config');
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

async function sendAuthCode(to, client_ip) {
    return client.verify.v2.services(authCodeServiceSid).verifications.create({
        to,
        channel: 'sms',
        rateLimits: {
            end_user_ip_address: client_ip,
        },
    });
}

async function checkAuthCode(to, code) {
    return client.verify.v2
        .services(authCodeServiceSid)
        .verificationChecks.create({ to, code });
}

async function isValidNumber(numberE164) {
    return client.lookups.v2.phoneNumbers(numberE164).fetch();
}

async function createTwilioRateLimit() {
    return client.verify.v2.services(authCodeServiceSid).rateLimits.create({
        description: 'Limit on end user IP Address',
        uniqueName: 'end_user_ip_address',
    });
}

async function createTwilioRateLimitBucket() {
    return client.verify.v2
        .services(authCodeServiceSid)
        .rateLimits(rateLimitSid)
        .buckets.create({
            max: rateLimitBucketMax,
            interval: rateLimitBucketInterval,
        });
}

async function updateTwilioRateLimitBucket() {
    return client.verify.v2
        .services(authCodeServiceSid)
        .rateLimits(rateLimitSid)
        .buckets(rateLimitBucketSid)
        .update({ max: rateLimitBucketMax, interval: rateLimitBucketInterval });
}

module.exports = {
    sendMessage,
    sendAuthCode,
    checkAuthCode,
    isValidNumber,
    createTwilioRateLimit,
    createTwilioRateLimitBucket,
    updateTwilioRateLimitBucket,
};
