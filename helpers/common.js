import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

const common = {
  _defaults,
  getFilename,
  getDirnameByFilename,
  getDirnameByUrl,
};

export default common;
