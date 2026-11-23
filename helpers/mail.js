import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
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

const DEFAULT_SES_REGION = 'us-east-1';

/**
 * Mask a single email address so full recipient addresses never reach the logs.
 * Keeps the first character of the local part and the domain for debuggability.
 */
export function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return email;
  }
  const separatorIndex = email.lastIndexOf('@');
  const local = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  if (local.length <= 1) {
    return `*@${domain}`;
  }
  return `${local.slice(0, 1)}***@${domain}`;
}

const EMAIL_IN_TEXT_RE = /[^\s<>",;]+@[^\s<>",;]+\.[^\s<>",;]+/g;

/**
 * Mask every email address that appears inside a free-form string
 * (e.g. an error message quoting a recipient).
 */
export function maskEmailsInText(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text.replace(EMAIL_IN_TEXT_RE, (match) => maskEmail(match));
}

/**
 * Resolve the outgoing mail transport from MAIL_TRANSPORT.
 * Defaults to "ses"; "smtp" keeps the legacy SMTP behavior.
 */
export function resolveMailTransport(env = process.env) {
  const transport = (env.MAIL_TRANSPORT || 'ses').trim().toLowerCase();
  if (transport !== 'ses' && transport !== 'smtp') {
    throw new Error(
      `Invalid MAIL_TRANSPORT value "${transport}". Expected "ses" or "smtp".`
    );
  }
  return transport;
}

/**
 * Build a SESv2-backed mail transport.
 *
 * - Sends via the SESv2 `SendEmail` API with "Simple" content (subject +
 *   text/html body). This is covered by the `ses:SendEmail` IAM action.
 *   A raw/MIME send (e.g. nodemailer's built-in SES transport) authorizes
 *   against `ses:SendRawEmail`, which the instance role does not have.
 * - Credentials come from the SDK default chain (EC2 instance role).
 *   Static AWS keys must never be configured for this app.
 * - Region defaults to us-east-1 and can be overridden with AWS_REGION.
 */
export function createSesTransport({ env = process.env, sesClient } = {}) {
  const region = env.AWS_REGION || DEFAULT_SES_REGION;
  const client = sesClient || new SESv2Client({ region });
  const from = env.MAIL_FROM || env.SMTP_FROM;
  if (!from) {
    throw new Error('Missing MAIL_FROM env var for the SES transport');
  }
  if (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY) {
    logger.warn(
      'AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are set in the environment; ' +
        'the SDK will prefer these static credentials over the EC2 instance role.'
    );
  }
  logger.info({ region }, 'Mail transport: ses');
  return {
    kind: 'ses',
    region,
    from,
    async sendMail(mailOptions) {
      const body = {};
      if (mailOptions.html) {
        body.Html = { Charset: 'UTF-8', Data: mailOptions.html };
      }
      if (mailOptions.text) {
        body.Text = { Charset: 'UTF-8', Data: mailOptions.text };
      }
      const response = await client.send(
        new SendEmailCommand({
          FromEmailAddress: mailOptions.from,
          Destination: { ToAddresses: [mailOptions.to] },
          Content: {
            Simple: {
              Subject: { Charset: 'UTF-8', Data: mailOptions.subject },
              Body: body,
            },
          },
        })
      );
      return { messageId: response.MessageId, response };
    },
  };
}

/**
 * Build the legacy SMTP transport (MAIL_TRANSPORT=smtp).
 * Behavior is unchanged: SMTP_* vars are required and verified on startup.
 */
export function createSmtpTransport({
  env = process.env,
  createTransport = (config) => nodemailer.createTransport(config),
} = {}) {
  // SMTP Configuration from environment variables
  const smtpHost = env.SMTP_HOST;
  const smtpPort = parseInt(env.SMTP_PORT || '587', 10);
  const smtpUser = env.SMTP_USER;
  const smtpPass = env.SMTP_PASS;
  // SMTP_SECURE: 'true'/'1' for SSL/TLS (port 465), 'false'/'0' for STARTTLS (port 587), or auto-detect based on port
  const smtpSecureEnv = env.SMTP_SECURE;
  // SMTP_REJECT_UNAUTHORIZED: 'false'/'0' to skip certificate validation (for self-signed certs or internal servers)
  // Default: true (verify certificates for security)
  const smtpRejectUnauthorizedEnv = env.SMTP_REJECT_UNAUTHORIZED;
  const smtpFrom = env.SMTP_FROM || smtpUser;

  if (!smtpHost) {
    throw new Error('Missing SMTP_HOST env var');
  }

  if (!smtpUser) {
    throw new Error('Missing SMTP_USER env var');
  }

  if (!smtpPass) {
    throw new Error('Missing SMTP_PASS env var');
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
      rejectUnauthorized:
        smtpRejectUnauthorizedEnv !== 'false' &&
        smtpRejectUnauthorizedEnv !== '0',
      // Use TLS 1.2+ for better security (TLS 1.0 and 1.1 are deprecated)
      minVersion: 'TLSv1.2',
    },
  };

  // For STARTTLS configuration (when secure: false)
  if (!smtpSecure && smtpPort !== 25) {
    transporterConfig.requireTLS = true;
  }

  const transporter = createTransport(transporterConfig);

  // Verify SMTP connection configuration
  transporter.verify((error) => {
    if (error) {
      logger.error({ error }, 'SMTP connection verification failed');
    } else {
      logger.info('SMTP server is ready to send messages');
    }
  });

  logger.info({ host: smtpHost, port: smtpPort }, 'Mail transport: smtp');

  return {
    kind: 'smtp',
    from: smtpFrom,
    sendMail: (mailOptions) => transporter.sendMail(mailOptions),
  };
}

function createActiveTransport() {
  const transport = resolveMailTransport();
  if (transport === 'ses') {
    return createSesTransport();
  }
  return createSmtpTransport();
}

if (!getEnv('NEWSLETTER_URL') || !getEnv('NEWSLETTER_LIST')) {
  throw new Error('Missing NEWSLETTER_URL or NEWSLETTER_LIST env var');
}

const transporter = createActiveTransport();

export async function send(to, template, params = {}, deps = {}) {
  const activeTransporter = deps.transporter || transporter;
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
      templateData.subject = templateData.subject.replace(
        `{${key}}`,
        params[key]
      );
    }
  }

  // Prepare mail options
  const mailOptions = {
    from: activeTransporter.from,
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
    const info = await activeTransporter.sendMail(mailOptions);
    logger.info(
      {
        messageId: info.messageId,
        to: maskEmail(to),
        transport: activeTransporter.kind,
      },
      'Email sent successfully'
    );
    return info;
  } catch (error) {
    logger.error(
      {
        errorName: error && error.name,
        errorCode: error && (error.Code || undefined),
        httpStatusCode: error && error.$metadata && error.$metadata.httpStatusCode,
        errorMessage: maskEmailsInText(error && error.message),
        to: maskEmail(to),
        template,
        transport: activeTransporter.kind,
      },
      'Failed to send email'
    );
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
