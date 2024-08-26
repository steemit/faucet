import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';
import { getEnv, getDirnameByUrl } from './common.js';
import { getLogChild } from './logger.js';
const logger = getLogChild({ module: 'helper_mail' });

// Load Mail Templates
const __dirname = getDirnameByUrl(import.meta.url);
let templates;
try {
  templates = JSON.parse(readFileSync(`${__dirname}/mailTemplates.json`));
} catch (err) {
  throw new Error(`Load Mail Templates Failed. ${JSON.stringify(err)}`);
}

if (!getEnv('SENDGRID_API_KEY')) {
  throw new Error('Missing SENDGRID_API_KEY env var');
}

if (!getEnv('NEWSLETTER_URL') || !getEnv('NEWSLETTER_LIST')) {
  throw new Error('Missing NEWSLETTER_URL or NEWSLETTER_LIST env var');
}

sgMail.setApiKey(getEnv('SENDGRID_API_KEY'));

export async function send(to, template, params = {}) {
  return new Promise((resolve, reject) => {
    const data = Object.assign({}, templates[template]);
    for (const key of Object.keys(params)) {
      if (data.html) {
        data.html = data.html.replace(`{${key}}`, params[key]);
      }
      if (data.text) {
        data.text = data.text.replace(`{${key}}`, params[key]);
      }
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
}

/**
 * After an account is created, make a call
 * to the newsletter server to subscribe a user
 */
export async function addNewsletterSubscriber(username, email) {
  const url = getEnv('NEWSLETTER_URL');
  const list = getEnv('NEWSLETTER_LIST');
  const data = {
    name: username,
    email,
    list,
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    logger.info({ result }, 'Subscription successful');
  } catch (err) {
    logger.warn({ err }, 'addNewsletterSubscriber failed');
  }
}

export default {
  templates,
  send,
  addNewsletterSubscriber,
};
