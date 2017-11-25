const templates = require('./templates.json');
const clone = require('lodash/clone');
const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const mail = {};

mail.send = (to, template, params = {}, cb) => {
  const data = clone(templates[template]);
  Object.keys(params).forEach((key) => {
    data.text = data.text.replace(`{${key}}`, params[key]);
    data.subject = data.subject.replace(`{${key}}`, params[key]);
  });
  data.to = to;
  mailgun.messages().send(data, (error, body) => {
    cb(error, body);
  });
};

module.exports = mail;
