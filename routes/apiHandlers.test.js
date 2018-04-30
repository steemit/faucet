describe('request email verification step', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('should require recaptcha', async () => {
        jest.mock('../db/models');
        jest.mock('../helpers/services');
        jest.mock('../helpers/database');
        const apiHandlers = require('./apiHandlers');

        return apiHandlers
            .handleRequestEmail(
                'ip.requires.recaptcha',
                null,
                'foo@bar.com',
                'fingerprint',
                { query: 'string' },
                'username',
                'xref',
                'protocol',
                'host'
            )
            .catch(err =>
                expect(err.type).toEqual('error_api_recaptcha_required')
            );
    });

    it('should let a new user request an email verification who has not tried before', async () => {
        jest.mock('../db/models');
        jest.mock('../helpers/services');
        jest.mock('../helpers/database');
        const apiHandlers = require('./apiHandlers');
        const mockDb = require('../helpers/database');
        const mockServices = require('../helpers/services');

        const ret = await apiHandlers.handleRequestEmail(
            'ip.requires.recaptcha',
            'recaptcha',
            'foo@bar.com',
            'fingerprint',
            { query: 'string' },
            'username',
            'xref',
            'protocol',
            'host'
        );

        // Require & test recaptcha
        expect(mockServices.recaptchaRequiredForIp.mock.calls).toEqual([
            ['ip.requires.recaptcha'],
        ]);
        expect(mockServices.verifyCaptcha.mock.calls).toEqual([
            ['recaptcha', 'ip.requires.recaptcha'],
        ]);

        // Throttle
        expect(mockDb.actionLimit.mock.calls.length).toBe(1);

        // Keep logs
        expect(mockDb.logAction.mock.calls).toEqual([
            [
                {
                    action: 'request_email',
                    ip: 'ip.requires.recaptcha',
                    metadata: { email: 'foo@bar.com' },
                },
            ],
        ]);

        // We should check to see if the email is in use
        expect(mockDb.emailIsInUse.mock.calls).toEqual([['foo@bar.com']]);

        // We should try to find an existing signup record matching this one's email and username.
        expect(mockDb.findUser.mock.calls).toEqual([
            [
                {
                    where: {
                        email: 'foo@bar.com',
                        username: 'username',
                    },
                },
            ],
        ]);

        // We should create a new user record
        expect(mockDb.createUser.mock.calls.length).toEqual(1);
        expect(mockDb.createUserMockSave.mock.calls.length).toEqual(1);

        expect(ret.success).toEqual(true);

        return new Promise(resolve => resolve());
    });

    it('should let a user request an email verification who has tried before with the same name & email', async () => {
        jest.mock('../db/models');
        jest.mock('../helpers/services');
        jest.mock('../helpers/database');
        const apiHandlers = require('./apiHandlers');
        const mockDb = require('../helpers/database');

        mockDb.findUser = mockDb.findUserSuccessUnverified;

        const ret = await apiHandlers.handleRequestEmail(
            'ip',
            'recaptcha',
            'foo@bar.com',
            'fingerprint',
            { query: 'string' },
            'username',
            'xref',
            'protocol',
            'host'
        );

        // We should try to find an existing signup record matching this one's email and username.
        expect(mockDb.findUser.mock.calls).toEqual([
            [
                {
                    where: {
                        email: 'foo@bar.com',
                        username: 'username',
                    },
                },
            ],
        ]);

        // We should use the existing uesr and not create a new user record
        expect(mockDb.createUser.mock.calls.length).toEqual(0);
        expect(mockDb.createUserMockSave.mock.calls.length).toEqual(0);
        expect(mockDb.findUserMockSave.mock.calls.length).toEqual(2);

        expect(ret.success).toEqual(true);

        return new Promise(resolve => resolve());
    });

    it('should not allow creating a user record with a username that has already been booked', async () => {
        jest.mock('../db/models');
        jest.mock('../helpers/services');
        jest.mock('../helpers/database');
        const apiHandlers = require('./apiHandlers');
        const mockDb = require('../helpers/database');

        mockDb.emailIsInUse = async () => true;

        await apiHandlers
            .handleRequestEmail(
                'ip',
                'recaptcha',
                'foo@bar.com',
                'fingerprint',
                { query: 'string' },
                'username',
                'xref',
                'protocol',
                'host'
            )
            .catch(err => expect(err.type).toEqual('error_api_email_used'));
    });

    it('should not allow creating a user record with an email that is recorded in conveyor as having already been registered', async () => {
        jest.mock('../db/models');
        jest.mock('../helpers/services');
        jest.mock('../helpers/database');
        const apiHandlers = require('./apiHandlers');
        const mockServices = require('../helpers/services');

        mockServices.conveyorCall = async () => true;

        await apiHandlers
            .handleRequestEmail(
                'ip',
                'recaptcha',
                'foo@bar.com',
                'fingerprint',
                { query: 'string' },
                'username',
                'xref',
                'protocol',
                'host'
            )
            .catch(err => expect(err.type).toEqual('error_api_email_used'));
    });
});
