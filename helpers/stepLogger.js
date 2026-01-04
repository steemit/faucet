import { steem } from '@steemit/steem-js';
const api = steem.api;

export const generateTrackingId = () =>
  `x-${Math.random().toString().slice(2)}`;

export const logStep = (uid, step) => {
  api.call('overseer.collect', ['signup', { uid, step }], (error) => {
    if (error) console.warn('overseer error', error);
  });
};
