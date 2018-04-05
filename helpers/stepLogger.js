/* eslint-disable no-console */
import { api } from '@steemit/steem-js';

const generateTrackingId = () =>
    `x-${Math.random()
        .toString()
        .slice(2)}`;

const logStep = (tracking, step) => {
    api.call('overseer.collect', ['signup', { tracking, step }], error => {
        if (error) console.warn('overseer error', error);
    });
};

export { logStep as default, generateTrackingId };
