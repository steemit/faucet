import { jest, beforeEach } from '@jest/globals';

describe('database advisory locks and rate limits', () => {
  let mockConnection;
  let mockConnectionManager;
  let mockQuery;
  let mockActionsCount;
  let database;

  beforeEach(async () => {
    jest.resetModules();
    mockConnection = { id: 'conn-1' };
    mockConnectionManager = {
      getConnection: jest.fn(async () => mockConnection),
      releaseConnection: jest.fn(),
      destroyConnection: jest.fn(async () => {}),
    };
    mockQuery = jest.fn(async () => [{ acquired: 1 }]);
    mockActionsCount = jest.fn(async () => 0);

    jest.unstable_mockModule('../db/models/index.js', () => ({
      default: {
        Sequelize: {
          Op: {
            gte: Symbol('gte'),
            ne: Symbol('ne'),
            eq: Symbol('eq'),
            or: Symbol('or'),
            in: Symbol('in'),
            lt: Symbol('lt'),
            gt: Symbol('gt'),
          },
          QueryTypes: { SELECT: 'SELECT' },
          literal: (v) => v,
        },
        sequelize: {
          connectionManager: mockConnectionManager,
          query: mockQuery,
        },
        actions: { count: mockActionsCount, create: jest.fn() },
        users: { count: jest.fn(), create: jest.fn(), findOne: jest.fn() },
        emailcode: {
          findAll: jest.fn(),
          findOne: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          destroy: jest.fn(),
        },
        phonecode: {},
        config: { findOne: jest.fn() },
      },
    }));

    database = await import('./database.js');
  });

  it('generates deterministic MySQL GET_LOCK keys within 64-char limit', () => {
    const key = database.buildAdvisoryLockKey(
      'email:very.long.email.address.name@gmail.com'
    );
    expect(key).toMatch(/^faucet:[0-9a-f]{32}$/);
    expect(key.length).toBeLessThanOrEqual(64);
  });

  it('acquires non-transactional locks in sorted order and releases in reverse order', async () => {
    const events = [];
    mockQuery.mockImplementation(async (sql, opts) => {
      expect(opts.transaction).toEqual({ connection: mockConnection });
      if (sql.includes('GET_LOCK')) {
        events.push(`get:${opts.replacements.lockName}`);
        return [{ acquired: 1 }];
      }
      events.push(`release:${opts.replacements.lockName}`);
      return [{ released: 1 }];
    });

    const result = await database.withAdvisoryLocks(
      ['user:bob', 'email:alice@gmail.com', 'user:bob'],
      async () => {
        events.push('work');
        return 'ok';
      }
    );

    expect(result).toBe('ok');
    expect(events).toHaveLength(5);
    const firstLock = events[0].slice(4);
    const secondLock = events[1].slice(4);
    expect(firstLock < secondLock).toBe(true);
    expect(events[2]).toBe('work');
    expect(events[3]).toBe(`release:${secondLock}`);
    expect(events[4]).toBe(`release:${firstLock}`);
    expect(mockConnectionManager.releaseConnection).toHaveBeenCalledWith(
      mockConnection
    );
    expect(mockConnectionManager.destroyConnection).not.toHaveBeenCalled();
  });

  it('throws ApiError on lock timeout and still releases previously acquired locks', async () => {
    let getCalls = 0;
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('GET_LOCK')) {
        getCalls += 1;
        return [{ acquired: getCalls === 1 ? 1 : 0 }];
      }
      return [{ released: 1 }];
    });

    await expect(
      database.withAdvisoryLocks(
        ['lock-a', 'lock-b'],
        {
          timeoutSec: 3,
          timeoutErrorType: 'error_api_account_creation_progress',
          timeoutStatus: 409,
        },
        async () => 'never'
      )
    ).rejects.toMatchObject({
      type: 'error_api_account_creation_progress',
      status: 409,
    });

    expect(mockQuery).toHaveBeenCalledTimes(3); // 2 GET_LOCK + 1 RELEASE_LOCK
    expect(mockConnectionManager.releaseConnection).toHaveBeenCalledWith(
      mockConnection
    );
  });

  it('destroys connection instead of returning to pool if RELEASE_LOCK fails', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('GET_LOCK')) {
        return [{ acquired: 1 }];
      }
      throw new Error('socket closed');
    });

    await database.withAdvisoryLocks(['lock-a'], async () => 'done');
    expect(mockConnectionManager.destroyConnection).toHaveBeenCalledWith(
      mockConnection
    );
    expect(mockConnectionManager.releaseConnection).not.toHaveBeenCalled();
  });

  it('runs queries issued inside the callback on the connection holding the locks', async () => {
    const calls = [];
    mockQuery.mockImplementation(async (sql, opts) => {
      calls.push({ sql, opts });
      return sql.includes('GET_LOCK') ? [{ acquired: 1 }] : [{ released: 1 }];
    });

    await database.withAdvisoryLocks(['lock-a'], async () => {
      await database.query('SELECT :now AS now', {
        replacements: { now: 1 },
        type: 'SELECT',
      });
      await database.query('SELECT 2', {
        transaction: { connection: { id: 'explicit' } },
      });
    });

    // calls[0] is GET_LOCK, the last one is RELEASE_LOCK
    expect(calls).toHaveLength(4);
    expect(calls[1].opts.transaction).toEqual({ connection: mockConnection });
    expect(calls[1].opts.replacements).toEqual({ now: 1 });
    // a caller-supplied transaction is left alone
    expect(calls[2].opts.transaction).toEqual({
      connection: { id: 'explicit' },
    });
    expect(mockConnectionManager.getConnection).toHaveBeenCalledTimes(1);
  });

  it('stops pinning once the callback returns, including work it left running', async () => {
    const seen = [];
    mockQuery.mockImplementation(async (sql, opts) => {
      if (!sql.includes('LOCK')) {
        seen.push(opts || {});
      }
      return sql.includes('GET_LOCK') ? [{ acquired: 1 }] : [{ released: 1 }];
    });

    let detached;
    await database.withAdvisoryLocks(['lock-a'], async () => {
      await database.query('SELECT 1');
      detached = new Promise((resolve) =>
        setTimeout(() => resolve(database.query('SELECT 2')), 5)
      );
    });
    expect(seen[0].transaction).toEqual({ connection: mockConnection });

    await detached;
    expect(seen[1].transaction).toBeUndefined();
  });

  it('rejects nested withAdvisoryLocks instead of borrowing a second connection', async () => {
    await expect(
      database.withAdvisoryLocks(['lock-a'], async () =>
        database.withAdvisoryLocks(['lock-b'], async () => 'never')
      )
    ).rejects.toThrow('withAdvisoryLocks() must not be nested');

    expect(mockConnectionManager.getConnection).toHaveBeenCalledTimes(1);
    expect(mockConnectionManager.releaseConnection).toHaveBeenCalledWith(
      mockConnection
    );
  });

  it('blocks actionLimitNew when ipActions reaches ipLimit (>=)', async () => {
    mockActionsCount.mockResolvedValueOnce(32);
    await expect(
      database.actionLimitNew('203.0.113.9', 'request_email_code', 32)
    ).rejects.toMatchObject({
      type: 'error_api_actionlimit',
    });
  });
});
