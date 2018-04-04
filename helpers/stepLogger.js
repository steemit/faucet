/* eslint-disable no-console */
import { api } from '@steemit/steem-js';

const logStep = (uid, step) => {
    api.call('overseer.collect', ['signup', { uid, step }], error => {
        if (error) console.warn('overseer error', error);
    });
};

export default logStep;
