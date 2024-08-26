import { normalizeEmail } from './validator';

describe('normalizeEmail', () => {
  it('should normalize emails', () => {
    const emails = {
      '555@cCc.com': '555@ccc.com',
      '555+foo@ccc.com': '555@ccc.com',
      '66.6@Gmail.com': '666@gmail.com',
      '66.6@googleMail.com': '666@gmail.com',
      '6...6......6@ccc.com': '6...6......6@ccc.com',
      '66.6+foo@ccc.com': '66.6@ccc.com',
    };
    Object.keys(emails).forEach((messy) => {
      expect(normalizeEmail(messy)).toEqual(emails[messy]);
    });
  });
});
