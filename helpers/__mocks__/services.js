import { jest } from '@jest/globals';

const captchaRequiredForIp = jest.fn((ip) => ip === 'ip.requires.captcha');

const verifyCaptcha = jest.fn(async () => true);

export default {
  captchaRequiredForIp,
  verifyCaptcha,
};
