import { jest, beforeEach } from '@jest/globals';

beforeEach(() => {
  jest.resetModules();
});

const BASE_ENV = {
  NEWSLETTER_URL: 'http://newsletter.example.com/api/subscribe',
  NEWSLETTER_LIST: 'steem-faucet-users',
  MAIL_FROM: 'Steemit <noreply@steemit.com>',
};

const MANAGED_ENV_KEYS = [
  'MAIL_TRANSPORT',
  'MAIL_FROM',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_SECURE',
  'SMTP_REJECT_UNAUTHORIZED',
  'NEWSLETTER_URL',
  'NEWSLETTER_LIST',
];

function cleanEnv() {
  for (const key of MANAGED_ENV_KEYS) {
    delete process.env[key];
  }
}

/**
 * Loads a fresh copy of mail.js with a controlled environment and a spied
 * logger child, so tests never depend on the developer's environment and
 * never hit the network.
 */
async function loadMail(envOverrides = {}) {
  const saved = {};
  for (const key of MANAGED_ENV_KEYS) {
    saved[key] = process.env[key];
  }
  cleanEnv();
  Object.assign(process.env, BASE_ENV, envOverrides);

  const loggerSpy = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  try {
    const loggerModule = await import('./logger.js');
    const childSpy = jest
      .spyOn(loggerModule.default, 'child')
      .mockReturnValue(loggerSpy);
    const mailModule = await import('./mail.js');
    childSpy.mockRestore();
    return { mail: mailModule, loggerSpy };
  } finally {
    cleanEnv();
    for (const key of MANAGED_ENV_KEYS) {
      if (saved[key] !== undefined) {
        process.env[key] = saved[key];
      }
    }
  }
}

function makeFakeSesClient() {
  return { send: jest.fn() };
}

function makeFakeSmtpTransporter() {
  return { sendMail: jest.fn(), verify: jest.fn() };
}

describe('resolveMailTransport', () => {
  it('defaults to ses when MAIL_TRANSPORT is not set', async () => {
    const { mail } = await loadMail();
    expect(mail.resolveMailTransport({})).toBe('ses');
  });

  it('accepts ses and smtp case-insensitively', async () => {
    const { mail } = await loadMail();
    expect(mail.resolveMailTransport({ MAIL_TRANSPORT: 'ses' })).toBe('ses');
    expect(mail.resolveMailTransport({ MAIL_TRANSPORT: 'SMTP' })).toBe('smtp');
    expect(mail.resolveMailTransport({ MAIL_TRANSPORT: ' smtp ' })).toBe('smtp');
  });

  it('rejects any other value', async () => {
    const { mail } = await loadMail();
    expect(() =>
      mail.resolveMailTransport({ MAIL_TRANSPORT: 'sendmail' })
    ).toThrow('Invalid MAIL_TRANSPORT value "sendmail"');
  });
});

describe('maskEmail', () => {
  it('keeps only the first local-part character and the domain', async () => {
    const { mail } = await loadMail();
    expect(mail.maskEmail('johndoe@example.com')).toBe('j***@example.com');
    expect(mail.maskEmail('a@example.com')).toBe('*@example.com');
    expect(mail.maskEmail('not-an-email')).toBe('not-an-email');
    expect(mail.maskEmail(undefined)).toBe(undefined);
  });

  it('masks addresses embedded in free text', async () => {
    const { mail } = await loadMail();
    const masked = mail.maskEmailsInText(
      'Email address is not verified: johndoe@example.com (and cc: jane@example.com)'
    );
    expect(masked).not.toContain('johndoe@example.com');
    expect(masked).not.toContain('jane@example.com');
    expect(masked).toContain('j***@example.com');
  });
});

describe('SES transport', () => {
  it('loads with no SMTP_* configuration at all and defaults to ses', async () => {
    const { mail, loggerSpy } = await loadMail();
    // Module import itself is the assertion: no SMTP_* var is set and it
    // must not throw. The default export keeps its public shape.
    expect(typeof mail.send).toBe('function');
    expect(typeof mail.addNewsletterSubscriber).toBe('function');
    expect(mail.default.templates).toBeDefined();
    expect(
      loggerSpy.info.mock.calls.some(([fields]) => fields && fields.region)
    ).toBe(true);
  });

  it('requires a from address (MAIL_FROM or SMTP_FROM)', async () => {
    const { mail } = await loadMail();
    expect(() =>
      mail.createSesTransport({
        env: { ...BASE_ENV, MAIL_FROM: undefined, SMTP_FROM: undefined },
      })
    ).toThrow('Missing MAIL_FROM env var for the SES transport');
  });

  it('falls back to SMTP_FROM as the sender address', async () => {
    const { mail } = await loadMail();
    const transport = mail.createSesTransport({
      env: { SMTP_FROM: 'noreply@steemit.com' },
    });
    expect(transport.kind).toBe('ses');
    expect(transport.from).toBe('noreply@steemit.com');
  });

  it('defaults the region to us-east-1 and honors AWS_REGION', async () => {
    const { mail } = await loadMail();
    const withFrom = (extra) => ({ MAIL_FROM: 'noreply@steemit.com', ...extra });
    expect(mail.createSesTransport({ env: withFrom({}) }).region).toBe('us-east-1');
    expect(
      mail.createSesTransport({ env: withFrom({ AWS_REGION: 'eu-west-1' }) }).region
    ).toBe('eu-west-1');
  });

  it('warns when static AWS credentials would override the instance role', async () => {
    const { mail, loggerSpy } = await loadMail();
    mail.createSesTransport({
      env: { MAIL_FROM: 'noreply@steemit.com', AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE' },
      sesClient: makeFakeSesClient(),
    });
    const warning = loggerSpy.warn.mock.calls
      .map((call) => call.map(String).join(' '))
      .join(' ');
    expect(warning).toContain('static credentials');
  });

  it('sends via SESv2 SendEmailCommand with simple content', async () => {
    const { mail } = await loadMail();
    const sesClient = makeFakeSesClient();
    sesClient.send.mockResolvedValue({ MessageId: 'ses-message-id-1' });
    const transport = mail.createSesTransport({
      env: { MAIL_FROM: 'Steemit <noreply@steemit.com>' },
      sesClient,
    });

    const info = await transport.sendMail({
      from: 'Steemit <noreply@steemit.com>',
      to: 'johndoe@example.com',
      subject: 'Please confirm your email',
      text: 'body text',
      html: '<p>body html</p>',
    });

    expect(info.messageId).toBe('ses-message-id-1');
    expect(sesClient.send).toHaveBeenCalledTimes(1);
    const command = sesClient.send.mock.calls[0][0];
    expect(command.constructor.name).toBe('SendEmailCommand');
    expect(command.input).toEqual({
      FromEmailAddress: 'Steemit <noreply@steemit.com>',
      Destination: { ToAddresses: ['johndoe@example.com'] },
      Content: {
        Simple: {
          Subject: { Charset: 'UTF-8', Data: 'Please confirm your email' },
          Body: {
            Html: { Charset: 'UTF-8', Data: '<p>body html</p>' },
            Text: { Charset: 'UTF-8', Data: 'body text' },
          },
        },
      },
    });
  });

  it('supports html-only templates', async () => {
    const { mail } = await loadMail();
    const sesClient = makeFakeSesClient();
    sesClient.send.mockResolvedValue({ MessageId: 'ses-message-id-2' });
    const transport = mail.createSesTransport({
      env: { MAIL_FROM: 'noreply@steemit.com' },
      sesClient,
    });

    await transport.sendMail({
      from: 'noreply@steemit.com',
      to: 'johndoe@example.com',
      subject: 'Welcome',
      html: '<p>welcome</p>',
    });

    const { Body } = sesClient.send.mock.calls[0][0].input.Content.Simple;
    expect(Body.Html).toEqual({ Charset: 'UTF-8', Data: '<p>welcome</p>' });
    expect(Body.Text).toBeUndefined();
  });

  it('send() renders the template and logs the SES MessageId', async () => {
    const { mail, loggerSpy } = await loadMail();
    const sesClient = makeFakeSesClient();
    sesClient.send.mockResolvedValue({ MessageId: 'ses-message-id-3' });
    const transport = mail.createSesTransport({
      env: { MAIL_FROM: 'noreply@steemit.com' },
      sesClient,
    });

    const info = await mail.send(
      'johndoe@example.com',
      'confirm_email',
      { url: 'https://steemit.com/confirm?token=abc' },
      { transporter: transport }
    );

    expect(info.messageId).toBe('ses-message-id-3');
    const sentInput = sesClient.send.mock.calls[0][0].input;
    expect(sentInput.FromEmailAddress).toBe('noreply@steemit.com');
    expect(sentInput.Destination.ToAddresses).toEqual(['johndoe@example.com']);
    expect(sentInput.Content.Simple.Subject.Data).toBe(
      'Please confirm your email'
    );
    expect(sentInput.Content.Simple.Body.Text.Data).toContain(
      'https://steemit.com/confirm?token=abc'
    );

    const successLog = loggerSpy.info.mock.calls.find(
      (call) => call[1] === 'Email sent successfully'
    );
    expect(successLog[0].messageId).toBe('ses-message-id-3');
    expect(successLog[0].to).toBe('j***@example.com');
    expect(successLog[0].transport).toBe('ses');
  });

  it('send() rejects and logs the SES error name without the full recipient', async () => {
    const { mail, loggerSpy } = await loadMail();
    const sesClient = makeFakeSesClient();
    const sesError = Object.assign(
      new Error('Email address is not verified: johndoe@example.com'),
      { name: 'MessageRejected', $metadata: { httpStatusCode: 400 } }
    );
    sesClient.send.mockRejectedValue(sesError);
    const transport = mail.createSesTransport({
      env: { MAIL_FROM: 'noreply@steemit.com' },
      sesClient,
    });

    await expect(
      mail.send('johndoe@example.com', 'confirm_email', {}, { transporter: transport })
    ).rejects.toMatchObject({ name: 'MessageRejected' });

    const errorLog = loggerSpy.error.mock.calls.find(
      (call) => call[1] === 'Failed to send email'
    );
    expect(errorLog[0].errorName).toBe('MessageRejected');
    expect(errorLog[0].httpStatusCode).toBe(400);
    expect(errorLog[0].to).toBe('j***@example.com');
    // No log argument may contain the full recipient address.
    for (const call of [...loggerSpy.error.mock.calls, ...loggerSpy.info.mock.calls]) {
      for (const arg of call) {
        expect(String(arg)).not.toContain('johndoe@example.com');
      }
    }
  });
});

describe('SMTP transport (legacy fallback)', () => {
  const SMTP_ENV = {
    SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
    SMTP_PORT: '587',
    SMTP_USER: 'smtp-user',
    SMTP_PASS: 'smtp-pass',
    SMTP_FROM: 'noreply@steemit.com',
  };

  it('still requires the SMTP_* credentials', async () => {
    const { mail } = await loadMail();
    expect(() => mail.createSmtpTransport({ env: {} })).toThrow(
      'Missing SMTP_HOST env var'
    );
    expect(() =>
      mail.createSmtpTransport({ env: { SMTP_HOST: 'smtp.example.com' } })
    ).toThrow('Missing SMTP_USER env var');
    expect(() =>
      mail.createSmtpTransport({
        env: { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'u' },
      })
    ).toThrow('Missing SMTP_PASS env var');
  });

  it('builds the same nodemailer config as before', async () => {
    const { mail, loggerSpy } = await loadMail();
    const fakeTransporter = makeFakeSmtpTransporter();
    const createTransport = jest.fn(() => fakeTransporter);
    const transport = mail.createSmtpTransport({
      env: { ...SMTP_ENV },
      createTransport,
    });

    expect(transport.kind).toBe('smtp');
    expect(transport.from).toBe('noreply@steemit.com');
    expect(createTransport).toHaveBeenCalledWith({
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
      auth: { user: 'smtp-user', pass: 'smtp-pass' },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      requireTLS: true,
    });
    expect(fakeTransporter.verify).toHaveBeenCalledTimes(1);
    expect(
      loggerSpy.info.mock.calls.some(
        (call) => call[1] === 'SMTP server is ready to send messages'
      )
    ).toBe(false); // verify is async; readiness is logged from its callback
  });

  it('auto-detects secure mode for port 465 and warns on 587+secure', async () => {
    const { mail, loggerSpy } = await loadMail();
    const createTransport = jest.fn(() => makeFakeSmtpTransporter());

    mail.createSmtpTransport({
      env: { ...SMTP_ENV, SMTP_PORT: '465' },
      createTransport,
    });
    expect(createTransport.mock.calls[0][0].secure).toBe(true);

    mail.createSmtpTransport({
      env: { ...SMTP_ENV, SMTP_SECURE: 'true' },
      createTransport,
    });
    expect(createTransport.mock.calls[1][0].secure).toBe(false);
    expect(
      loggerSpy.warn.mock.calls.some((call) =>
        String(call[0]).includes('Overriding SMTP_SECURE')
      )
    ).toBe(true);
  });

  it('defaults the sender address to SMTP_USER', async () => {
    const { mail } = await loadMail();
    const transport = mail.createSmtpTransport({
      env: { ...SMTP_ENV, SMTP_FROM: undefined },
      createTransport: () => makeFakeSmtpTransporter(),
    });
    expect(transport.from).toBe('smtp-user');
  });

  it('delegates sendMail to nodemailer and logs the message id', async () => {
    const { mail, loggerSpy } = await loadMail();
    const fakeTransporter = makeFakeSmtpTransporter();
    fakeTransporter.sendMail.mockResolvedValue({
      messageId: '<smtp-1@steemit.com>',
    });
    const transport = mail.createSmtpTransport({
      env: { ...SMTP_ENV },
      createTransport: () => fakeTransporter,
    });

    const info = await mail.send(
      'johndoe@example.com',
      'confirm_email',
      { url: 'https://steemit.com/confirm?token=abc' },
      { transporter: transport }
    );

    expect(info.messageId).toBe('<smtp-1@steemit.com>');
    expect(fakeTransporter.sendMail).toHaveBeenCalledTimes(1);
    const mailOptions = fakeTransporter.sendMail.mock.calls[0][0];
    expect(mailOptions.from).toBe('noreply@steemit.com');
    expect(mailOptions.subject).toBe('Please confirm your email');

    const successLog = loggerSpy.info.mock.calls.find(
      (call) => call[1] === 'Email sent successfully'
    );
    expect(successLog[0].messageId).toBe('<smtp-1@steemit.com>');
    expect(successLog[0].to).toBe('j***@example.com');
    expect(successLog[0].transport).toBe('smtp');
  });
});
