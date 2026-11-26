import { jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { normalizeEmail } from '../helpers/validator.js';

describe('signup security hardening in apiHandlers (VULN-0006/0007/0008/0059/0060)', () => {
  let apiHandlers;
  let store;
  let mockDb;
  let mockServices;
  let lockChain;

  function makeReq(body = {}, ip = '203.0.113.9') {
    return {
      ip,
      body,
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    };
  }

  function makeEmailRow(data) {
    const row = {
      id: store.nextId++,
      ...data,
      async save() {
        const idx = store.emailRecords.findIndex((r) => r.id === row.id);
        if (idx >= 0) {
          store.emailRecords[idx] = row;
        }
        return row;
      },
    };
    return row;
  }

  beforeEach(async () => {
    jest.resetModules();
    process.env.JWT_SECRET = 'unit-test-jwt-secret-key';
    process.env.TURNSTILE_SWITCH = 'ON';
    process.env.REACT_DISABLE_ACCOUNT_CREATION = 'false';

    store = {
      nextId: 1,
      emailRecords: [],
      users: [],
      actions: [],
      chainAccounts: new Set(),
      conveyorEmails: new Set(),
    };

    lockChain = Promise.resolve();

    mockDb = {
      getPrivateWhiteEmailDomain: jest.fn(async () => []),
      getWhiteEmailDomain: jest.fn(async () => ['gmail.com']),
      actionLimitNew: jest.fn(async (ip, action, limit = 32) => {
        const count = store.actions.filter(
          (a) => a.ip === ip && a.action === action
        ).length;
        if (count >= limit) {
          const { default: ApiError } = await import(
            '../helpers/errortypes.js'
          );
          throw new ApiError({ type: 'error_api_actionlimit' });
        }
      }),
      logAction: jest.fn(async (entry) => {
        store.actions.push(entry);
        return entry;
      }),
      withAdvisoryLocks: jest.fn(async (_keys, optsOrFn, maybeFn) => {
        const fn = typeof optsOrFn === 'function' ? optsOrFn : maybeFn;
        const prev = lockChain;
        let release;
        lockChain = new Promise((resolve) => {
          release = resolve;
        });
        await prev;
        try {
          return await fn();
        } finally {
          release();
        }
      }),
      emailIsInUse: jest.fn(async (email) => {
        const norm = normalizeEmail(email);
        return store.users.some((u) => u.email_normalized === norm);
      }),
      findEmailRecordsByNormalized: jest.fn(async (email) => {
        const norm = normalizeEmail(email);
        return store.emailRecords
          .filter((r) => r.email_normalized === norm || r.email === email)
          .sort((a, b) => b.id - a.id);
      }),
      findEmailRecordByNormalized: jest.fn(async (email) => {
        const norm = normalizeEmail(email);
        const matches = store.emailRecords
          .filter((r) => r.email_normalized === norm || r.email === email)
          .sort((a, b) => b.id - a.id);
        return matches[0] || null;
      }),
      createEmailRecord: jest.fn(async (data) => {
        const row = makeEmailRow(data);
        store.emailRecords.push(row);
        return row;
      }),
      deleteEmailRecordsByIds: jest.fn(async (ids) => {
        store.emailRecords = store.emailRecords.filter(
          (r) => !ids.includes(r.id)
        );
      }),
      deleteEmailRecordByNormalized: jest.fn(async (email) => {
        const norm = normalizeEmail(email);
        store.emailRecords = store.emailRecords.filter(
          (r) => r.email_normalized !== norm && r.email !== email
        );
      }),
      clearExpiredEmailCode: jest.fn(async (id) => {
        const row = store.emailRecords.find((r) => r.id === id);
        if (row) {
          row.email_code = null;
          row.email_code_attempts = 0;
        }
      }),
      incrementEmailCodeAttempts: jest.fn(async (id, maxAttempts = 10) => {
        const row = store.emailRecords.find((r) => r.id === id);
        if (!row || (row.email_code_attempts || 0) >= maxAttempts) {
          return false;
        }
        row.email_code_attempts = (row.email_code_attempts || 0) + 1;
        return true;
      }),
      consumeEmailCodeForSignup: jest.fn(
        async ({
          id,
          expectedCode,
          jtiMarker,
          minGeneratedAt,
          maxAttempts = 10,
          now = new Date(),
        }) => {
          const row = store.emailRecords.find((r) => r.id === id);
          if (
            !row ||
            row.email_code !== expectedCode ||
            !row.email_code_generated ||
            row.email_code_generated <= minGeneratedAt ||
            (row.email_code_attempts || 0) >= maxAttempts
          ) {
            return false;
          }
          row.email_code = jtiMarker;
          row.email_code_generated = now;
          return true;
        }
      ),
      claimEmailSignupJti: jest.fn(
        async ({ id, expectedMarker, creatingMarker, minGeneratedAt }) => {
          const row = store.emailRecords.find((r) => r.id === id);
          if (
            !row ||
            row.email_code !== expectedMarker ||
            !row.email_code_generated ||
            row.email_code_generated <= minGeneratedAt
          ) {
            return false;
          }
          row.email_code = creatingMarker;
          return true;
        }
      ),
      restoreEmailSignupJti: jest.fn(
        async ({ id, creatingMarker, expectedMarker }) => {
          const row = store.emailRecords.find((r) => r.id === id);
          if (!row || row.email_code !== creatingMarker) {
            return false;
          }
          row.email_code = expectedMarker;
          return true;
        }
      ),
      countUsers: jest.fn(async ({ username }) =>
        store.users.filter((u) => u.username === username).length
      ),
      createUser: jest.fn(async (data) => {
        const user = { id: store.nextId++, ...data };
        store.users.push(user);
        return user;
      }),
    };

    mockServices = {
      getPendingClaimedAccountsAsync: jest.fn(async () => true),
      conveyorCall: jest.fn(async (method, params) => {
        if (method === 'is_email_registered') {
          return store.conveyorEmails.has(params.email);
        }
        return {};
      }),
      sendEmail: jest.fn(async () => {}),
      verifyCaptcha: jest.fn(async () => true),
      checkUsername: jest.fn(async (username) =>
        store.chainAccounts.has(username)
      ),
      createAccount: jest.fn(async ({ new_account_name }) => {
        store.chainAccounts.add(new_account_name);
      }),
      condenserTransfer: jest.fn(async () => {}),
      recordActivityTracker: jest.fn(),
      recordSource: jest.fn(),
    };

    jest.unstable_mockModule('../helpers/database.js', () => ({
      default: mockDb,
      ...mockDb,
    }));
    jest.unstable_mockModule('../helpers/services.js', () => ({
      default: mockServices,
      ...mockServices,
    }));
    jest.unstable_mockModule('../helpers/mail.js', () => ({
      default: { addNewsletterSubscriber: jest.fn(async () => {}) },
    }));

    const mod = await import('./apiHandlers.js');
    apiHandlers = mod.default;
  });

  describe('VULN-0060 (#59): normalized email quota & concurrent send protection', () => {
    it('blocks Gmail dot and case variants within 1-minute cooldown and concurrent requests', async () => {
      const results = await Promise.allSettled([
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'alice.test@gmail.com' })
        ),
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'AliceTest@gmail.com' })
        ),
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'ali.cetest@gmail.com' })
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(2);
      expect(
        rejected.every((r) => r.reason.type === 'error_api_wait_one_minute')
      ).toBe(true);
      expect(mockServices.sendEmail).toHaveBeenCalledTimes(1);
      expect(store.emailRecords).toHaveLength(1);
      expect(store.emailRecords[0].email_normalized).toBe(
        'alicetest@gmail.com'
      );
    });

    it('enforces 24h 5-send limit across Gmail variants and rolls back quota on SES failure', async () => {
      const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
      store.emailRecords.push(
        makeEmailRow({
          email: 'alice@gmail.com',
          email_normalized: 'alice@gmail.com',
          email_code: '123456',
          email_code_attempts: 0,
          email_code_sent: 4,
          email_code_generated: twoMinsAgo,
          email_code_first_sent: new Date(Date.now() - 3600 * 1000),
          last_attempt_verify_email: twoMinsAgo,
        })
      );

      // 5th attempt fails in SES -> quota must roll back to 4
      mockServices.sendEmail.mockRejectedValueOnce(new Error('SES throttled'));
      await expect(
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'a.lice@gmail.com' })
        )
      ).rejects.toMatchObject({ type: 'error_api_sent_email_failed' });
      expect(store.emailRecords[0].email_code_sent).toBe(4);

      // Retry succeeds -> reaches 5
      await apiHandlers.handleRequestEmailCode(
        makeReq({ email: 'a.lice@gmail.com' })
      );
      expect(store.emailRecords[0].email_code_sent).toBe(5);

      // Move cooldown back > 1 min, 6th variant attempt within 24h is blocked
      store.emailRecords[0].last_attempt_verify_email = new Date(
        Date.now() - 2 * 60 * 1000
      );
      await expect(
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'ALICE@gmail.com' })
        )
      ).rejects.toMatchObject({ type: 'error_api_request_too_much' });
    });
  });

  describe('VULN-0008 (#8): email code attempts, expiry, and partial input handling', () => {
    it('rejects partial non-6-digit inputs without burning attempt budget, and caps wrong 6-digit guesses at 10', async () => {
      store.emailRecords.push(
        makeEmailRow({
          email: 'bob@gmail.com',
          email_normalized: 'bob@gmail.com',
          email_code: '654321',
          email_code_attempts: 0,
          email_code_generated: new Date(),
        })
      );

      // Typing 1..5 digits on frontend Form.Item does not increment DB attempts
      await expect(
        apiHandlers.handleConfirmEmailCode(
          makeReq({ email: 'bob@gmail.com', code: '654' })
        )
      ).rejects.toMatchObject({ type: 'error_api_email_code_invalid' });
      expect(store.emailRecords[0].email_code_attempts).toBe(0);

      // 10 wrong 6-digit guesses exhaust the code
      for (let i = 0; i < 10; i += 1) {
        await expect(
          apiHandlers.handleConfirmEmailCode(
            makeReq({ email: 'bo.b@gmail.com', code: '000000' })
          )
        ).rejects.toMatchObject({ type: 'error_api_email_code_invalid' });
      }

      // 11th attempt (even with right code) is rejected in BOTH check_email_code and finalizeSignup
      await expect(
        apiHandlers.handleConfirmEmailCode(
          makeReq({ email: 'bob@gmail.com', code: '654321' })
        )
      ).rejects.toMatchObject({ type: 'error_api_phone_too_many' });

      await expect(
        apiHandlers.finalizeSignup(
          makeReq({
            captcha: 'ok-turnstile',
            email: 'bob@gmail.com',
            emailCode: '654321',
            username: 'bobsteem',
          })
        )
      ).rejects.toMatchObject({ type: 'error_api_phone_too_many' });
    });

    it('rejects expired (>30m) email codes in finalizeSignup (VULN-0059 / #58)', async () => {
      store.emailRecords.push(
        makeEmailRow({
          email: 'carol@gmail.com',
          email_normalized: 'carol@gmail.com',
          email_code: '112233',
          email_code_attempts: 0,
          email_code_generated: new Date(Date.now() - 31 * 60 * 1000),
        })
      );

      await expect(
        apiHandlers.finalizeSignup(
          makeReq({
            captcha: 'ok-turnstile',
            email: 'carol@gmail.com',
            emailCode: '112233',
            username: 'carolsteem',
          })
        )
      ).rejects.toMatchObject({ type: 'error_api_email_code_invalid' });
      expect(store.emailRecords[0].email_code).toBeNull();
    });
  });

  describe('VULN-0006 & VULN-0007 (#6, #7, #58): one-time code consumption, expiring JWT, and serialized on-chain creation', () => {
    const validPublicKeys = JSON.stringify({
      owner: 'STM_OWNER',
      active: 'STM_ACTIVE',
      posting: 'STM_POSTING',
      memo: 'STM_MEMO',
    });

    it('consumes email_code on first finalizeSignup, prevents minting multiple JWTs, sets 30m exp+jti, and blocks concurrent create_account replay', async () => {
      await apiHandlers.handleRequestEmailCode(
        makeReq({ email: 'dave@gmail.com' })
      );
      const sentCode = store.emailRecords[0].email_code;

      // Pre-check succeeds without consuming code
      await expect(
        apiHandlers.handleConfirmEmailCode(
          makeReq({ email: 'dave@gmail.com', code: sentCode })
        )
      ).resolves.toEqual({ success: true });

      // Mint first JWT
      const { token } = await apiHandlers.finalizeSignup(
        makeReq({
          captcha: 'ok-turnstile',
          email: 'dave@gmail.com',
          emailCode: sentCode,
          username: 'davesteem1',
        })
      );

      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('signup_new');
      expect(decoded.jti).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(1800);

      // Reusing same emailCode for another username MUST fail immediately
      await expect(
        apiHandlers.finalizeSignup(
          makeReq({
            captcha: 'ok-turnstile',
            email: 'da.ve@gmail.com',
            emailCode: sentCode,
            username: 'davesteem2',
          })
        )
      ).rejects.toMatchObject({ type: 'error_api_email_code_invalid' });

      // Concurrent /api/create_account calls with the same valid JWT create ONLY ONE chain account
      const createResults = await Promise.allSettled([
        apiHandlers.handleCreateAccount(
          makeReq({
            token,
            public_keys: validPublicKeys,
            tracking_id: 'track-1',
          })
        ),
        apiHandlers.handleCreateAccount(
          makeReq({
            token,
            public_keys: validPublicKeys,
            tracking_id: 'track-1',
          })
        ),
      ]);

      const okCreates = createResults.filter((r) => r.status === 'fulfilled');
      const failedCreates = createResults.filter(
        (r) => r.status === 'rejected'
      );

      expect(okCreates).toHaveLength(1);
      expect(failedCreates).toHaveLength(1);
      expect(failedCreates[0].reason.type).toBe('error_api_token_invalid');
      expect(mockServices.createAccount).toHaveBeenCalledTimes(1);
      expect(store.users).toHaveLength(1);
      expect(store.emailRecords).toHaveLength(0);
    });

    it('rejects legacy/forged signup_new JWTs that lack exp or jti (VULN-0006)', async () => {
      const legacyToken = jwt.sign(
        { type: 'signup_new', username: 'eternaluser', email: 'e@gmail.com' },
        process.env.JWT_SECRET,
        { algorithm: 'HS256' }
      );

      await expect(
        apiHandlers.handleCreateAccount(
          makeReq({
            token: legacyToken,
            public_keys: validPublicKeys,
            tracking_id: 'track-legacy',
          })
        )
      ).rejects.toMatchObject({ type: 'error_api_token_invalid' });
      expect(mockServices.createAccount).not.toHaveBeenCalled();
    });

    it('restores JTI marker for user retry when chain RPC fails before account is created', async () => {
      await apiHandlers.handleRequestEmailCode(
        makeReq({ email: 'erin@gmail.com' })
      );
      const sentCode = store.emailRecords[0].email_code;
      const { token } = await apiHandlers.finalizeSignup(
        makeReq({
          captcha: 'ok-turnstile',
          email: 'erin@gmail.com',
          emailCode: sentCode,
          username: 'erinsteem',
        })
      );

      // Transient RPC failure before broadcast -> account not on chain
      mockServices.createAccount.mockRejectedValueOnce(
        new Error('RPC timeout')
      );
      await expect(
        apiHandlers.handleCreateAccount(
          makeReq({
            token,
            public_keys: validPublicKeys,
            tracking_id: 'track-erin',
          })
        )
      ).rejects.toMatchObject({ type: 'error_api_create_account' });

      // User clicks Create Account again -> succeeds cleanly
      await expect(
        apiHandlers.handleCreateAccount(
          makeReq({
            token,
            public_keys: validPublicKeys,
            tracking_id: 'track-erin',
          })
        )
      ).resolves.toEqual({ success: true });
      expect(store.chainAccounts.has('erinsteem')).toBe(true);
    });
  });
});
