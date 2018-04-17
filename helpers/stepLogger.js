/* eslint-disable no-console */
const { api } = require('@steemit/steem-js');

const generateTrackingId = () =>
    `x-${Math.random()
        .toString()
        .slice(2)}`;

const logStep = (tracking, step) => {
    api.call('overseer.collect', ['signup', { tracking, step }], error => {
        if (error) console.warn('overseer error', error);
    });
};

module.exports = logStep;
module.exports.generateTrackingId = generateTrackingId;
