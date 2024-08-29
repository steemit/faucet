import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { getLogChild } from './logger.js';
const logger = getLogChild({ module: 'helper_common' });

export function _defaults(obj, ...sources) {
  sources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      if (obj[key] === undefined) {
        obj[key] = source[key];
      }
    });
  });
  return obj;
}

export function getFilename(url) {
  return fileURLToPath(url);
}

export function getDirnameByFilename(filename) {
  return dirname(filename);
}

export function getDirnameByUrl(url) {
  return dirname(getFilename(url));
}

export function outputReq(req) {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
}

export function outputRes(res) {
  return {
    statusCode: res.statusCode,
    headers: res.getHeaders(),
  };
}

export function getEnv(key) {
  if (!process.env[key]) {
    logger.warn({ key }, `Missing ENV var.`);
  }
  return process.env[key];
}

export function generateTrackingId() {
  return `x-${Math.random().toString().slice(2)}`;
}

export function generateCode(size) {
  const dicts = '0123456789';
  let v = '';
  for (let i = size; i > 0; i -= 1) {
    v += dicts[Math.round(Math.random() * (dicts.length - 1))];
  }
  return v;
}

export function getManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

const common = {
  _defaults,
  getFilename,
  getDirnameByFilename,
  getDirnameByUrl,
  outputReq,
  outputRes,
  getEnv,
  generateTrackingId,
  generateCode,
  getManifest,
};

export default common;
