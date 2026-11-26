import { jest } from '@jest/globals';
import express from 'express';
import {
  createTrustProxyController,
  DEFAULT_CLOUDFLARE_IPV4_CIDRS,
  DEFAULT_CLOUDFLARE_IPV6_CIDRS,
  isValidCidr,
  parseCidrList,
} from './trustProxy.js';

function resolveClientIp(trustProxyFn, remoteAddress, xForwardedFor) {
  const app = express();
  app.set('trust proxy', trustProxyFn);
  const req = Object.create(express.request);
  req.app = app;
  req.connection = { remoteAddress };
  req.socket = req.connection;
  req.headers = xForwardedFor ? { 'x-forwarded-for': xForwardedFor } : {};
  return req.ip;
}

describe('trustProxy helper (VULN-0005)', () => {
  const silentLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  it('validates IPv4 and IPv6 CIDRs strictly', () => {
    expect(isValidCidr('173.245.48.0/20', 4)).toBe(true);
    expect(isValidCidr('2400:cb00::/32', 6)).toBe(true);
    expect(isValidCidr('173.245.48.0/33', 4)).toBe(false);
    expect(isValidCidr('not-a-cidr', 4)).toBe(false);
    expect(parseCidrList('173.245.48.0/20\ninvalid', 4)).toBeNull();
  });

  it('extracts real client IP via Cloudflare -> ALB and ignores spoofed left XFF entries', () => {
    const { trustProxyFn } = createTrustProxyController({
      extraProxiesRaw: '',
      loggerInstance: silentLogger,
    });

    const ip = resolveClientIp(
      trustProxyFn,
      '::ffff:10.123.1.10',
      '1.1.1.1, 8.8.8.8, 203.0.113.9, 172.70.1.2'
    );
    expect(ip).toBe('203.0.113.9');
  });

  it('supports IPv6 client addresses through Cloudflare -> ALB', () => {
    const { trustProxyFn } = createTrustProxyController({
      extraProxiesRaw: '',
      loggerInstance: silentLogger,
    });

    const ip = resolveClientIp(
      trustProxyFn,
      '::ffff:10.123.1.10',
      '1.1.1.1, 2001:db8::abcd, 173.245.48.5'
    );
    expect(ip).toBe('2001:db8::abcd');
  });

  it('stops at hop 2 even when request originates from a Cloudflare Worker IP', () => {
    const { trustProxyFn } = createTrustProxyController({
      extraProxiesRaw: '',
      loggerInstance: silentLogger,
    });

    const ip = resolveClientIp(
      trustProxyFn,
      '::ffff:10.123.1.10',
      '1.1.1.1, 2a06:98c0:3600::103, 172.70.1.2'
    );
    expect(ip).toBe('2a06:98c0:3600::103');
  });

  it('prevents XFF spoofing if ALB SG is accidentally open to 0.0.0.0/0 (direct to ALB)', () => {
    const { trustProxyFn } = createTrustProxyController({
      extraProxiesRaw: '',
      loggerInstance: silentLogger,
    });

    const ip = resolveClientIp(
      trustProxyFn,
      '::ffff:10.123.1.10',
      '1.1.1.1, 8.8.8.8, 198.51.100.77'
    );
    expect(ip).toBe('198.51.100.77');
  });

  it('ignores entire XFF header if public client connects directly to container', () => {
    const { trustProxyFn } = createTrustProxyController({
      extraProxiesRaw: '',
      loggerInstance: silentLogger,
    });

    const ip = resolveClientIp(
      trustProxyFn,
      '198.51.100.77',
      '1.1.1.1, 172.70.1.2'
    );
    expect(ip).toBe('198.51.100.77');
  });

  it('hot-reloads Cloudflare CIDRs when remote fetch succeeds and keeps baseline on failure', async () => {
    const customV4 = [...DEFAULT_CLOUDFLARE_IPV4_CIDRS, '198.18.0.0/15'].join(
      '\n'
    );
    const customV6 = DEFAULT_CLOUDFLARE_IPV6_CIDRS.join('\n');

    let shouldFail = false;
    const fakeFetch = jest.fn(async (url) => {
      if (shouldFail) {
        throw new Error('network down');
      }
      return {
        ok: true,
        status: 200,
        text: async () => (url.includes('ips-v4') ? customV4 : customV6),
      };
    });

    const controller = createTrustProxyController({
      extraProxiesRaw: '',
      fetchImpl: fakeFetch,
      loggerInstance: silentLogger,
    });

    // Before refresh, 198.18.1.5 at hop 1 is NOT trusted
    expect(
      resolveClientIp(
        controller.trustProxyFn,
        '::ffff:10.123.1.10',
        '203.0.113.55, 198.18.1.5'
      )
    ).toBe('198.18.1.5');

    const res1 = await controller.refreshCloudflareIps();
    expect(res1.updated).toBe(true);

    // After refresh, 198.18.1.5 is trusted as edge proxy at hop 1
    expect(
      resolveClientIp(
        controller.trustProxyFn,
        '::ffff:10.123.1.10',
        '203.0.113.55, 198.18.1.5'
      )
    ).toBe('203.0.113.55');

    // Subsequent network failure retains last valid list
    shouldFail = true;
    const res2 = await controller.refreshCloudflareIps();
    expect(res2.updated).toBe(false);
    expect(
      resolveClientIp(
        controller.trustProxyFn,
        '::ffff:10.123.1.10',
        '203.0.113.55, 198.18.1.5'
      )
    ).toBe('203.0.113.55');
  });
});
