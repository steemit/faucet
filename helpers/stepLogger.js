import { api } from '@steemit/steem-js';

export const generateTrackingId = () =>
  `x-${Math.random().toString().slice(2)}`;

export const logStep = (uid, step) => {
  api.call('overseer.collect', ['signup', { uid, step }], (error) => {
    if (error) console.warn('overseer error', error);
  });
};
