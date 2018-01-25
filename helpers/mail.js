const sgMail = require('@sendgrid/mail');
const templates = require('./templates.json');
const clone = require('lodash/clone');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const mail = {};

mail.send = (to, template, locale, params = {}, cb) => {
  const data = clone(templates[template]);
  Object.keys(params).forEach((key) => {
    data.text = data[`text_${locale}`].replace(`{${key}}`, params[key]);
    data.subject = data[`subject_${locale}`].replace(`{${key}}`, params[key]);
  });
  data.to = to;

  sgMail.send(data, (error, result) => {
    cb(error, result);
  });
};

module.exports = mail;
