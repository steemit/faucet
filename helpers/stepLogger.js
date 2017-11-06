/* eslint-disable no-console */
import { api } from 'steem';

if (process.env.STEEMJS_URL) {
  api.setOptions({ url: process.env.STEEMJS_URL });
}
const logStep = (step, stepNumber) => {
  api.call('overseer.collect', ['signup', { step, stepNumber }], (error) => {
    if (error) console.warn('overseer error', error);
  });
};

export default logStep;
