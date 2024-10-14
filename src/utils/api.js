// import { api } from '@steemit/steem-js';
// TODO: for now, we don't need steem-js
const api = {
  call: () => {},
  getAccounts: () => {},
};

export default async function apiCall(path, payload, reqType = 'POST') {
  const reqObjs = {
    POST: {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    PUT: {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  };
  const response = await fetch(path, reqObjs[reqType]);
  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.indexOf('application/json') === -1) {
    throw new Error('Invalid response from server');
  }
  const responseData = await response.json();
  if (responseData.error) {
    const error = new Error('ApiError');
    error.type = responseData.error.type;
    error.field = responseData.error.field;
    throw error;
  }
  return responseData;
}

export function recordActivityTracker({ trackingId, activityTag }) {
  const data = {
    measurement: 'activity_tracker',
    tags: {
      activityTag,
      appType: 'faucet',
    },
    fields: {
      views: 1,
      trackingId,
    },
  };
  api.call('overseer.collect', ['custom', data], (error) => {
    if (error) console.warn('overseer error:', data, error);
  });
}

export const getPendingClaimedAccounts = (callback) => {
  const result = {};
  if (!window.config || !window.config.CREATOR_INFO) {
    return callback(result);
  }
  const accounts = window.config.CREATOR_INFO.split('|');
  if (accounts.length === 0) {
    return callback(result);
  }
  steem.api.getAccounts(accounts, (err, response) => {
    if (err) {
      /* eslint no-console: ["error", { allow: ["warn", "error"] }] */
      console.error('getPendingClaimedAccounts:', err);
      return callback();
    }
    if (response) {
      response.forEach((el) => {
        if (el) {
          result[el.name] = el.pending_claimed_accounts;
        }
      });
      callback(result);
    } else {
      callback(result);
    }
  });
};

export const updateAnalytics = (eventId) => {
  fetch(`/api/analytics?event_id=${eventId}`)
    .then(() => {})
    .catch(() => {});
};
