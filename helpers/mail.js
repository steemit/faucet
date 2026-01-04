import nodemailer from 'nodemailer';
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

// SMTP Configuration from environment variables
const smtpHost = getEnv('SMTP_HOST');
const smtpPort = parseInt(getEnv('SMTP_PORT') || '587', 10);
const smtpUser = getEnv('SMTP_USER');
const smtpPass = getEnv('SMTP_PASS');
// SMTP_SECURE: 'true'/'1' for SSL/TLS (port 465), 'false'/'0' for STARTTLS (port 587), or auto-detect based on port
const smtpSecureEnv = getEnv('SMTP_SECURE');
// SMTP_REJECT_UNAUTHORIZED: 'false'/'0' to skip certificate validation (for self-signed certs or internal servers)
// Default: true (verify certificates for security)
const smtpRejectUnauthorizedEnv = getEnv('SMTP_REJECT_UNAUTHORIZED');
const smtpFrom = getEnv('SMTP_FROM') || smtpUser;

if (!smtpHost) {
  throw new Error('Missing SMTP_HOST env var');
}

if (!smtpUser) {
  throw new Error('Missing SMTP_USER env var');
}

if (!smtpPass) {
  throw new Error('Missing SMTP_PASS env var');
}

if (!getEnv('NEWSLETTER_URL') || !getEnv('NEWSLETTER_LIST')) {
  throw new Error('Missing NEWSLETTER_URL or NEWSLETTER_LIST env var');
}

// Determine secure mode: if explicitly set, use it; otherwise auto-detect based on port
// Note: Port 587 uses STARTTLS (secure: false), port 465 uses SSL/TLS (secure: true)
let smtpSecure = false;
if (smtpSecureEnv === 'true' || smtpSecureEnv === '1') {
  smtpSecure = true;
} else if (smtpSecureEnv === 'false' || smtpSecureEnv === '0') {
  smtpSecure = false;
} else {
  // Auto-detect: port 465 typically uses SSL/TLS, others use STARTTLS
  smtpSecure = smtpPort === 465;
}

// Enforce port/secure compatibility: port 587 must use STARTTLS (secure: false)
// Port 465 can use either, but typically uses secure: true
if (smtpPort === 587 && smtpSecure) {
  logger.warn(
    'Port 587 requires STARTTLS (secure: false). Overriding SMTP_SECURE=true to false.'
  );
  smtpSecure = false;
}

// Create reusable transporter object using SMTP transport
const transporterConfig = {
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure, // true for SSL/TLS (port 465), false for STARTTLS (port 587)
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  // TLS configuration
  // Default: verify certificates (rejectUnauthorized: true) for security
  // Set SMTP_REJECT_UNAUTHORIZED=false to skip validation (only for self-signed certs or internal servers)
  tls: {
    // Default to true (verify certificates) unless explicitly set to false
    // This ensures secure connections to services like AWS SES
    rejectUnauthorized: smtpRejectUnauthorizedEnv !== 'false' && smtpRejectUnauthorizedEnv !== '0',
    // Use TLS 1.2+ for better security (TLS 1.0 and 1.1 are deprecated)
    minVersion: 'TLSv1.2',
  },
};

// For STARTTLS configuration (when secure: false)
if (!smtpSecure && smtpPort !== 25) {
  transporterConfig.requireTLS = true;
}

const transporter = nodemailer.createTransport(transporterConfig);

// Verify SMTP connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error({ error }, 'SMTP connection verification failed');
  } else {
    logger.info('SMTP server is ready to send messages');
  }
});

export async function send(to, template, params = {}) {
  const templateData = Object.assign({}, templates[template]);
  if (!templateData) {
    throw new Error(`Template ${template} not found`);
  }

  // Replace template variables
  for (const key of Object.keys(params)) {
    if (templateData.html) {
      templateData.html = templateData.html.replace(`{${key}}`, params[key]);
    }
    if (templateData.text) {
      templateData.text = templateData.text.replace(`{${key}}`, params[key]);
    }
    if (templateData.subject) {
      templateData.subject = templateData.subject.replace(`{${key}}`, params[key]);
    }
  }

  // Prepare mail options
  const mailOptions = {
    from: smtpFrom,
    to: to,
    subject: templateData.subject,
  };

  // Add HTML or text content
  if (templateData.html) {
    mailOptions.html = templateData.html;
  }
  if (templateData.text) {
    mailOptions.text = templateData.text;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info({ messageId: info.messageId, to }, 'Email sent successfully');
    return info;
  } catch (error) {
    logger.error({ error, to, template }, 'Failed to send email');
    throw error;
  }
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
