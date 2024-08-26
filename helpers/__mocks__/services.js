import { jest } from '@jest/globals';

const recaptchaRequiredForIp = jest.fn((ip) => ip === 'ip.requires.recaptcha');

const verifyCaptcha = jest.fn(async () => true);

export default {
  recaptchaRequiredForIp,
  verifyCaptcha,
};
