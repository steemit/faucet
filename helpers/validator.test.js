const { normalizeEmail } = require('./validator');

describe('normalizeEmail', () => {
    it('should normalize emails', () => {
        const emails = {
            '555@ccc.com': '555@ccc.com',
            '555+foo@ccc.com': '555@ccc.com',
            '66.6@ccc.com': '666@ccc.com',
            '6...6......6@ccc.com': '666@ccc.com',
            '66.6+foo@ccc.com': '666@ccc.com',
        };
        Object.keys(emails).forEach(messy => {
            expect(normalizeEmail(messy)).toEqual(emails[messy]);
        });
    });
});

const gmailEmailsToNormalize = [
    'johnotander@gmail.com',
    'johnotander@googlemail.com',
    'johnotander@GMAIL.com',
    'johnotander+foobar@gmail.com',
    'john.o.t.a.n.d.er+foobar@gmail.com',
    'JOHN.o.t.a.n.d.er+foobar@googlemail.com',
    'john.otander@gmail.com',
];

const hotmailEmailsToNormalize = [
    'johnotander@hotmail.com',
    'johnotander@hotmail.com',
    'johnotander@HOTMAIL.com',
    'Johnotander@hotmail.com',
];

const liveEmailsToNormalize = [
    'johnotander@live.com',
    'johnotander@live.com',
    'johnotander@live.com',
    'johnotander+foobar@live.com',
    'john.o.t.a.n.d.er+foobar@live.com',
    'JOHN.o.t.a.n.d.er+foobar@live.com',
    'john.otander@live.com',
];

const outlookEmailsToNormalize = [
    'john.otander@outlook.com',
    'JOHN.otander@outlook.com',
    'john.Otander+any.label@outlook.com',
    'john.otander+foobar@outlook.com',
];

describe('normalize-email', () => {
    it('should normalize gmail emails', () => {
        gmailEmailsToNormalize.forEach(email => {
            expect(normalizeEmail(email)).toEqual('johnotander@gmail.com');
        });
    });

    it('should normalize hotmail emails', () => {
        hotmailEmailsToNormalize.forEach(email => {
            expect(normalizeEmail(email)).toEqual('johnotander@hotmail.com');
        });
    });

    it('should not remove dots from hotmail emails', () => {
        expect(normalizeEmail('john.otander@hotmail.com')).toEqqual(
            'john.otander@hotmail.com'
        );
    });

    it('should normalize live emails', () => {
        liveEmailsToNormalize.forEach(email => {
            expect(normalizeEmail(email)).toEqual('johnotander@live.com');
        });
    });

    it('should normalize outlook emails', () => {
        outlookEmailsToNormalize.forEach(email => {
            expect(normalizeEmail(email)).toEqual('john.otander@outlook.com');
        });
    });
});
