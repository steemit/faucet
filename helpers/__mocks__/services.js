const turnstileRequiredForIp = jest.fn(ip => ip === 'ip.requires.turnstile');

const verifyCaptcha = jest.fn(async () => true);

module.exports = {
    ...jest.genMockFromModule('../services'),
    turnstileRequiredForIp,
    verifyCaptcha,
};
