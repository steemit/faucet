const sgMail = require('@sendgrid/mail');
const templates = require('./templates.json');
const clone = require('lodash/clone');

if (!process.env.SENDGRID_API_KEY) {
    throw new Error('Missing SENDGRID_API_KEY env var');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const mail = {};

mail.send = function sendMail(to, template, params = {}) {
    return new Promise((resolve, reject) => {
        const data = clone(templates[template]);
        // eslint-disable-next-line no-restricted-syntax
        for (const key of Object.keys(params)) {
            // eslint-disable-line no-restricted-syntax
            data.text = data.text.replace(`{${key}}`, params[key]);
            data.subject = data.subject.replace(`{${key}}`, params[key]);
        }
        data.to = to;
        sgMail.send(data, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

module.exports = mail;
