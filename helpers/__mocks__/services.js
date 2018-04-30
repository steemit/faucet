const recaptchaRequiredForIp = jest.fn(ip => ip === 'ip.requires.recaptcha');

const verifyCaptcha = jest.fn(async () => true);

module.exports = {
    ...jest.genMockFromModule('../services'),
    recaptchaRequiredForIp,
    verifyCaptcha,
};
