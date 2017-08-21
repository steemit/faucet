const Twilio = require('twilio').Twilio;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio = new Twilio(accountSid, authToken);

module.exports = twilio;
