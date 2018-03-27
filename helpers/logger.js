const bunyan = require('bunyan');

const logger = bunyan.createLogger({
    name: process.env.FAUCET_ADMIN ? 'faucet-admin' : 'faucet',
    serializers: bunyan.stdSerializers,
    streams: [{
        level: process.env.LOG_LEVEL || 'info',
        stream: process.stdout,
    }],
});

module.exports = logger;
