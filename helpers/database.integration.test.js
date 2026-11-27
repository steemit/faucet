import {
  jest,
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Advisory locks against a real MySQL.
 *
 * Skipped unless TEST_DATABASE_URL points at a disposable database whose name
 * contains "test": the suite drops and recreates every table there, so it must
 * never be aimed at real data.
 *
 *   TEST_DATABASE_URL=mysql://root:test@127.0.0.1:3306/faucet_test pnpm run test:integration
 */
const describeMysql = process.env.TEST_DATABASE_URL ? describe : describe.skip;

jest.setTimeout(60000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fail on the spot when a query started inside a withAdvisoryLocks() callback
 * borrows a pooled connection. That section already holds one, and once every
 * pooled connection is held by such sections they all wait for the pool they
 * exhausted: nothing finishes until ConnectionAcquireTimeoutError.
 */
function failOnPoolBorrowInsideLock(database, sequelize) {
  const inside = new AsyncLocalStorage();
  const withAdvisoryLocks = database.withAdvisoryLocks;
  database.withAdvisoryLocks = (keys, optionsOrFn, maybeFn) => {
    const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;
    const options = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
    return withAdvisoryLocks(keys, options, (...args) =>
      inside.run(true, () => fn(...args))
    );
  };
  const { connectionManager } = sequelize;
  const getConnection = connectionManager.getConnection;
  connectionManager.getConnection = function (options, ...rest) {
    if (inside.getStore()) {
      throw new Error(
        'a query inside withAdvisoryLocks() borrowed a pooled connection'
      );
    }
    return getConnection.call(this, options, ...rest);
  };
}

describeMysql('advisory locks on MySQL', () => {
  let db;
  let database;
  let cache;
  let sequelize;
  let poolMax;
  let apiHandlers;
  let chainAccounts;
  let emailsSent;

  // The signup endpoints hold the lock across the mail send and the chain call;
  // the fakes below take this long instead.
  const EXTERNAL_MS = 30;

  const emailRecord = (email) => ({
    email,
    email_normalized: email,
    email_code: '123456',
    email_code_attempts: 0,
    email_code_sent: 1,
  });

  const makeReq = (body, ip) => ({
    ip,
    body,
    log: { info() {}, warn() {}, error() {}, debug() {} },
  });

  const publicKeys = JSON.stringify({
    owner: 'STM_OWNER',
    active: 'STM_ACTIVE',
    posting: 'STM_POSTING',
    memo: 'STM_MEMO',
  });

  async function signup(i) {
    const email = `user${i}@gmail.com`;
    const ip = `203.0.113.${i}`;
    await apiHandlers.handleRequestEmailCode(makeReq({ email }, ip));
    const { email_code: code } =
      await database.findEmailRecordByNormalized(email);
    // The form validates the code again on every submit.
    await apiHandlers.handleConfirmEmailCode(makeReq({ email, code }, ip));
    await apiHandlers.handleConfirmEmailCode(makeReq({ email, code }, ip));
    const { token } = await apiHandlers.finalizeSignup(
      makeReq({ email, emailCode: code, username: `user${i}` }, ip)
    );
    await apiHandlers.handleCreateAccount(
      makeReq({ token, public_keys: publicKeys, tracking_id: `track-${i}` }, ip)
    );
  }

  beforeAll(async () => {
    if (!/test/i.test(new URL(process.env.TEST_DATABASE_URL).pathname)) {
      throw new Error(
        'Refusing to run: TEST_DATABASE_URL must point at a throwaway database with "test" in its name.'
      );
    }
    // "local" is the config block that does not ask MySQL for TLS.
    process.env.DATABASE_NAME = 'local';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.LOG_LEVEL ||= 'error';
    process.env.JWT_SECRET ||= 'integration-test-jwt-secret';
    process.env.TURNSTILE_SWITCH = 'OFF';
    process.env.REACT_DISABLE_ACCOUNT_CREATION = 'false';

    // Only the database layer is real. The signup endpoints hold their lock
    // across a mail send and a chain call, so the fakes take this long instead.
    chainAccounts = new Set();
    const services = {
      getPendingClaimedAccountsAsync: async () => true,
      sendEmail: async () => {
        emailsSent += 1;
        await sleep(EXTERNAL_MS);
      },
      conveyorCall: async () => false,
      checkUsername: async (username) => chainAccounts.has(username),
      createAccount: async ({ new_account_name }) => {
        await sleep(EXTERNAL_MS);
        chainAccounts.add(new_account_name);
      },
      verifyCaptcha: async () => true,
      condenserTransfer: async () => {},
      recordActivityTracker: () => {},
      recordSource: () => {},
    };
    jest.unstable_mockModule('../helpers/services.js', () => ({
      default: services,
      ...services,
    }));
    jest.unstable_mockModule('../helpers/mail.js', () => ({
      default: { addNewsletterSubscriber: async () => {} },
    }));

    db = (await import('../db/models/index.js')).default;
    database = (await import('./database.js')).default;
    cache = (await import('./cache.js')).default;
    apiHandlers = (await import('../routes/apiHandlers.js')).default;
    sequelize = db.sequelize;
    poolMax = sequelize.connectionManager.pool.maxSize;

    failOnPoolBorrowInsideLock(database, sequelize);
  });

  afterAll(async () => {
    // Nothing to clean up when beforeAll refused to run.
    if (sequelize) {
      await sequelize.close();
    }
    // The signup endpoints cache the email white lists, and each cached value
    // keeps a 5-minute expiry timer that would hold jest open until it fires.
    if (cache) {
      cache.clear();
    }
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    chainAccounts.clear();
    emailsSent = 0;
  });

  describe('withAdvisoryLocks', () => {
    it('keeps every locked section on one pooled connection, however many run at once', async () => {
      const sections = poolMax + 7;

      const deleted = await Promise.all(
        Array.from({ length: sections }, (_, i) => {
          const email = `user${i}@gmail.com`;
          return database.withAdvisoryLocks([`email:${email}`], async () => {
            if (await database.emailIsInUse(email)) {
              throw new Error('email in use');
            }
            const record = await database.createEmailRecord(emailRecord(email));
            await sleep(EXTERNAL_MS);
            record.email_code_sent = 2;
            await record.save();
            return database.deleteEmailRecordByNormalized(email);
          });
        })
      );

      expect(deleted).toEqual(new Array(sections).fill(1));
      expect(await db.emailcode.count()).toBe(0);
    });

    it('commits what the section writes without opening a transaction', async () => {
      const { QueryTypes, Sequelize } = db.Sequelize;
      const otherConnection = new Sequelize(process.env.TEST_DATABASE_URL, {
        logging: false,
      });
      const connectionId = () =>
        database
          .query('SELECT CONNECTION_ID() AS id', { type: QueryTypes.SELECT })
          .then(([row]) => row.id);

      try {
        const locked = await database.withAdvisoryLocks(
          ['email:autocommit@gmail.com'],
          async () => {
            const lockConnectionId = await connectionId();
            const record = await database.createEmailRecord(
              emailRecord('autocommit@gmail.com')
            );
            await database.incrementEmailCodeAttempts(record.id);

            const [trx] = await database.query(
              'SELECT COUNT(*) AS open FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = CONNECTION_ID()',
              { type: QueryTypes.SELECT }
            );
            const [row] = await otherConnection.query(
              'SELECT email_code_attempts FROM emailcode WHERE id = ?',
              { replacements: [record.id], type: QueryTypes.SELECT }
            );

            return {
              lockConnectionId,
              stillOnLockConnection:
                (await connectionId()) === lockConnectionId,
              openTransactions: Number(trx.open),
              // seen through a second connection while the lock is still held
              attemptsVisibleElsewhere: Number(row.email_code_attempts),
            };
          }
        );

        expect(locked).toMatchObject({
          stillOnLockConnection: true,
          openTransactions: 0,
          attemptsVisibleElsewhere: 1,
        });
      } finally {
        await otherConnection.close();
      }
    });

    it('makes a second request wait for a lock that is held, then see what the holder committed', async () => {
      let release;
      const released = new Promise((resolve) => {
        release = resolve;
      });
      let hasTheLock;
      const locked = new Promise((resolve) => {
        hasTheLock = resolve;
      });

      const holder = database.withAdvisoryLocks(
        ['email:contended'],
        async () => {
          await database.createEmailRecord(emailRecord('contended@gmail.com'));
          hasTheLock();
          await released;
        }
      );
      // Raced with the holder: one that fails before signalling fails the test
      // right away instead of leaving it waiting for the signal.
      await Promise.race([locked, holder]);

      const waiter = database.withAdvisoryLocks(['email:contended'], async () =>
        database.findEmailRecordsByNormalized('contended@gmail.com')
      );
      await sleep(150);
      release();

      const [, rows] = await Promise.all([holder, waiter]);
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe('contended@gmail.com');
    });

    it('turns a GET_LOCK timeout into the configured API error and leaves the lock with its holder', async () => {
      let holderFinished = false;
      let hasTheLock;
      const locked = new Promise((resolve) => {
        hasTheLock = resolve;
      });

      const holder = database.withAdvisoryLocks(['email:busy'], async () => {
        hasTheLock();
        await sleep(1500);
        holderFinished = true;
      });
      await Promise.race([locked, holder]);

      await expect(
        database.withAdvisoryLocks(
          ['email:busy'],
          {
            timeoutSec: 1,
            timeoutErrorType: 'error_api_wait_one_minute',
            timeoutStatus: 429,
          },
          async () => 'acquired'
        )
      ).rejects.toMatchObject({
        type: 'error_api_wait_one_minute',
        status: 429,
      });
      // The waiter gave up while the holder still had the lock.
      expect(holderFinished).toBe(false);

      await holder;
      expect(holderFinished).toBe(true);
    });
  });

  describe('signup endpoints', () => {
    it('takes more concurrent users than the pool has connections through the whole flow', async () => {
      const users = poolMax * 4;

      const results = await Promise.allSettled(
        Array.from({ length: users }, (_, i) => signup(i + 1))
      );

      expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
      expect(await db.users.count()).toBe(users);
      // every code was consumed by create_account
      expect(await db.emailcode.count()).toBe(0);
      // the verification mail and the welcome mail
      expect(emailsSent).toBe(users * 2);
    });

    it('sends once when the same email is submitted twice at the same time', async () => {
      const submit = () =>
        apiHandlers.handleRequestEmailCode(
          makeReq({ email: 'double@gmail.com' }, '198.51.100.1')
        );

      const results = await Promise.allSettled([submit(), submit()]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toEqual([
        expect.objectContaining({
          status: 'rejected',
          reason: expect.objectContaining({
            type: 'error_api_wait_one_minute',
          }),
        }),
      ]);
      expect(emailsSent).toBe(1);
      expect(
        await database.findEmailRecordsByNormalized('double@gmail.com')
      ).toHaveLength(1);
    });

    it('does not charge attempts for a correct code, on the 10th try included', async () => {
      const email = 'boundary@gmail.com';
      const ip = '198.51.100.2';
      const check = (code) =>
        apiHandlers.handleConfirmEmailCode(makeReq({ email, code }, ip));
      const attempts = async () =>
        (await database.findEmailRecordByNormalized(email)).email_code_attempts;

      await apiHandlers.handleRequestEmailCode(makeReq({ email }, ip));
      const { email_code: code } =
        await database.findEmailRecordByNormalized(email);
      const wrongCode = code === '000000' ? '111111' : '000000';

      for (let i = 0; i < 9; i += 1) {
        await expect(check(wrongCode)).rejects.toMatchObject({
          type: 'error_api_email_code_invalid',
        });
      }
      expect(await attempts()).toBe(9);

      // The correct code passes as often as the form re-validates it.
      await expect(check(code)).resolves.toEqual({ success: true });
      await expect(check(code)).resolves.toEqual({ success: true });
      expect(await attempts()).toBe(9);

      const { token } = await apiHandlers.finalizeSignup(
        makeReq({ email, emailCode: code, username: 'boundarysteem' }, ip)
      );
      expect(typeof token).toBe('string');
    });
  });
});
