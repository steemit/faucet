const { Sequelize } = require('./../db/models');

const { Op: { or, eq, ne, like, and, gte, lte, regexp } } = Sequelize;

describe('adminHandlers listSignups', () => {
    beforeEach(() => {
        jest.resetModules();
    });
    it('should find and count users', async () => {
        jest.mock('../helpers/database');
        const adminHandlers = require('./adminHandlers');
        const mockDb = require('../helpers/database');
        adminHandlers.listSignups({
            body: {
                limit: 60,
                order: 'fun',
                offset: 30,
                filters: [{ name: 'status', value: 'test' }],
            },
        });
        expect(mockDb.findUsers.mock.calls.length).toBe(1);
        expect(mockDb.countUsers.mock.calls.length).toBe(1);
    });
    it('negates correctly when search text is prepended with !', async () => {
        const adminHandlers = require('./adminHandlers');
        const ret = await adminHandlers.listSignups({
            body: {
                limit: 60,
                order: 'fun',
                offset: 30,
                filters: [
                    { name: 'status', value: 'status_test' },
                    { name: '!status', value: 'ne_status_test' },
                ],
            },
        });
        const q = ret.query.where[and];
        expect(q[0].status[eq]).toBe('status_test');
        expect(q[1].status[ne]).toBe('ne_status_test');
    });
    it('throws an error when unknown filter is passed', async () => {
        const adminHandlers = require('./adminHandlers');
        try {
            await adminHandlers.listSignups({
                body: {
                    limit: 60,
                    order: 'fun',
                    offset: 30,
                    filters: [{ name: 'idk', value: 'nope' }],
                },
            });
        } catch (e) {
            expect(e).toEqual(new Error('Unknown filter: idk'));
        }
    });

    it('creates the correct query for an array of different filters', async () => {
        const adminHandlers = require('./adminHandlers');
        const ret = await adminHandlers.listSignups({
            body: {
                limit: 60,
                order: 'fun',
                offset: 30,
                filters: [
                    { name: 'text', value: 'text_test' },
                    { name: 'status', value: 'status_test' },
                    { name: '!status', value: 'ne_status_test' },
                    { name: 'ip', value: 'ip_test' },
                    { name: 'phone', value: 'phone_test' },
                    { name: 'email', value: 'email_test' },
                    { name: 'username_re', value: 'username_re_test' },
                    { name: 'email_re', value: 'email_re_test' },
                    { name: 'phone_re', value: 'phone_re_test' },
                    { name: 'note', value: 'note_test' },
                    { name: 'note_re', value: 'note_re_test' },
                    { name: 'from', value: 'December 17, 1995 03:24:00' },
                    { name: 'to', value: 'December 17, 1995 04:24:00' },
                    {
                        name: 'fingerprint.ua',
                        value: 'fingerprint_ua_test',
                    },
                    {
                        name: 'fingerprint.ref',
                        value: 'fingerprint_ref_test',
                    },
                    {
                        name: 'fingerprint.lang',
                        value: 'fingerprint_lang_test',
                    },
                    {
                        name: 'fingerprint.device.vendor',
                        value: 'fingerprint_vendor_test',
                    },
                    {
                        name: 'fingerprint.device.renderer',
                        value: 'fingerprint_renderer_test',
                    },
                ],
            },
        });
        const q = ret.query.where[and];
        expect(q[0][or][0].email[like]).toBe('%text_test%');
        expect(q[0][or][1].username[like]).toBe('%text_test%');
        expect(q[0][or][2].phone_number[like]).toBe('%text_test%');
        expect(q[1].status[eq]).toBe('status_test');
        expect(q[2].status[ne]).toBe('ne_status_test');
        expect(q[3].ip[eq]).toBe('ip_test');
        expect(q[4].phone_number[eq]).toBe('phone_test');
        expect(q[5].email[eq]).toBe('email_test');
        expect(q[6].username[regexp]).toBe('username_re_test');
        expect(q[7].email[regexp]).toBe('email_re_test');
        expect(q[8].phone_number[regexp]).toBe('phone_re_test');
        expect(q[9].review_note[like]).toBe('%note_test%');
        expect(q[10].review_note[regexp]).toBe('note_re_test');
        expect(q[11].created_at[gte]).toBeInstanceOf(Date);
        expect(q[12].created_at[lte]).toBeInstanceOf(Date);
        expect(q[13].fingerprint).toEqual({
            attribute: { val: "fingerprint -> '$.ua'" },
            comparator: '=',
            logic: { [regexp]: 'fingerprint_ua_test' },
        });
        expect(q[14].fingerprint).toEqual({
            attribute: { val: "fingerprint -> '$.ref'" },
            comparator: '=',
            logic: { [regexp]: 'fingerprint_ref_test' },
        });
        expect(q[15].fingerprint).toEqual({
            attribute: { val: "fingerprint -> '$.lang'" },
            comparator: '=',
            logic: { [regexp]: 'fingerprint_lang_test' },
        });
        expect(q[16].fingerprint).toEqual({
            attribute: { val: "fingerprint -> '$.device.vendor'" },
            comparator: '=',
            logic: { [regexp]: 'fingerprint_vendor_test' },
        });
        expect(q[17].fingerprint).toEqual({
            attribute: { val: "fingerprint -> '$.device.renderer'" },
            comparator: '=',
            logic: { [regexp]: 'fingerprint_renderer_test' },
        });
    });
});
