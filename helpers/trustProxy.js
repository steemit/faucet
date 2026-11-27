import net from 'net';
import express from 'express';
import { getLogChild } from './logger.js';

const defaultLogger = getLogChild({ module: 'trust_proxy' });

export const DEFAULT_CLOUDFLARE_IPV4_CIDRS = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

export const DEFAULT_CLOUDFLARE_IPV6_CIDRS = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

const CLOUDFLARE_IPS_V4_URL = 'https://www.cloudflare.com/ips-v4';
const CLOUDFLARE_IPS_V6_URL = 'https://www.cloudflare.com/ips-v6';
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

export function isValidCidr(value, expectedVersion = null) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const parts = trimmed.split('/');
  if (parts.length > 2) {
    return false;
  }
  const ipVersion = net.isIP(parts[0]);
  if (ipVersion === 0) {
    return false;
  }
  if (expectedVersion !== null && ipVersion !== expectedVersion) {
    return false;
  }
  if (parts.length === 1) {
    return true;
  }
  if (!/^\d+$/.test(parts[1])) {
    return false;
  }
  const prefix = Number(parts[1]);
  const maxPrefix = ipVersion === 4 ? 32 : 128;
  // A /0 would trust every address, and Express refuses to compile it: reject it
  // here so it is dropped with a warning like any other invalid entry.
  return prefix >= 1 && prefix <= maxPrefix;
}

export function parseCidrList(text, expectedVersion = null) {
  if (typeof text !== 'string') {
    return [];
  }
  const lines = text
    .split(/[\r\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const valid = [];
  for (const line of lines) {
    if (!isValidCidr(line, expectedVersion)) {
      return null;
    }
    valid.push(line);
  }
  return valid;
}

export function parseExtraTrustedProxies(
  raw = process.env.EXTRA_TRUSTED_PROXIES,
  loggerInstance = defaultLogger
) {
  if (!raw || typeof raw !== 'string') {
    return [];
  }
  const result = [];
  for (const token of raw.split(',')) {
    const item = token.trim();
    if (!item) {
      continue;
    }
    if (isValidCidr(item)) {
      result.push(item);
    } else {
      loggerInstance.warn({ cidr: item }, 'Ignoring invalid CIDR in EXTRA_TRUSTED_PROXIES');
    }
  }
  return result;
}

function compileSubnets(subnets) {
  const tempApp = express();
  tempApp.set('trust proxy', subnets);
  return tempApp.get('trust proxy fn');
}

export function createTrustProxyController({
  extraProxiesRaw = process.env.EXTRA_TRUSTED_PROXIES,
  fetchImpl = globalThis.fetch,
  loggerInstance = defaultLogger,
} = {}) {
  const extraCidrs = parseExtraTrustedProxies(extraProxiesRaw, loggerInstance);
  const isLocalOrPrivate = compileSubnets([
    'loopback',
    'linklocal',
    'uniquelocal',
  ]);
  let activeEdgeCidrs = [
    ...DEFAULT_CLOUDFLARE_IPV4_CIDRS,
    ...DEFAULT_CLOUDFLARE_IPV6_CIDRS,
    ...extraCidrs,
  ];
  let isTrustedEdge = compileSubnets(activeEdgeCidrs);

  const trustProxyFn = (addr, hopIndex) => {
    if (hopIndex === 0) {
      return isLocalOrPrivate(addr, 0);
    }
    if (hopIndex === 1) {
      return isTrustedEdge(addr, 0);
    }
    return false;
  };

  async function refreshCloudflareIps() {
    if (typeof fetchImpl !== 'function') {
      return { updated: false };
    }
    try {
      const [v4Res, v6Res] = await Promise.all([
        fetchImpl(CLOUDFLARE_IPS_V4_URL, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }),
        fetchImpl(CLOUDFLARE_IPS_V6_URL, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }),
      ]);
      if (!v4Res.ok || !v6Res.ok) {
        throw new Error(
          `Unexpected HTTP status v4=${v4Res.status} v6=${v6Res.status}`
        );
      }
      const [v4Text, v6Text] = await Promise.all([v4Res.text(), v6Res.text()]);
      const v4Cidrs = parseCidrList(v4Text, 4);
      const v6Cidrs = parseCidrList(v6Text, 6);
      if (!v4Cidrs || !v6Cidrs || v4Cidrs.length < 5 || v6Cidrs.length < 3) {
        throw new Error('Fetched Cloudflare CIDR list failed validation');
      }
      const nextCidrs = [...v4Cidrs, ...v6Cidrs, ...extraCidrs];
      const nextCompiled = compileSubnets(nextCidrs);
      activeEdgeCidrs = nextCidrs;
      isTrustedEdge = nextCompiled;
      loggerInstance.debug(
        { count: activeEdgeCidrs.length },
        'Refreshed Cloudflare trusted proxy CIDRs'
      );
      return { updated: true, count: activeEdgeCidrs.length };
    } catch (error) {
      loggerInstance.warn(
        { err: error?.message || error },
        'Failed to refresh Cloudflare IP ranges; keeping existing list'
      );
      return { updated: false };
    }
  }

  function startAutoRefresh(intervalMs = DEFAULT_REFRESH_INTERVAL_MS) {
    const initialTimer = setTimeout(() => {
      refreshCloudflareIps();
    }, 0);
    if (typeof initialTimer.unref === 'function') {
      initialTimer.unref();
    }
    const intervalTimer = setInterval(() => {
      refreshCloudflareIps();
    }, intervalMs);
    if (typeof intervalTimer.unref === 'function') {
      intervalTimer.unref();
    }
    return {
      stop() {
        clearTimeout(initialTimer);
        clearInterval(intervalTimer);
      },
    };
  }

  return {
    trustProxyFn,
    refreshCloudflareIps,
    startAutoRefresh,
    getActiveEdgeCidrs: () => [...activeEdgeCidrs],
  };
}

export default createTrustProxyController;
