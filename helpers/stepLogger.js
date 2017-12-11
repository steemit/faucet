/* eslint-disable no-console */
import { api } from '@steemit/steem-js';

const logStep = (step, stepNumber) => {
  api.call('overseer.collect', ['signup', { step, stepNumber }], (error) => {
    if (error) console.warn('overseer error', error);
  });
};

export default logStep;
