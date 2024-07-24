import pino from 'pino';

const streams = [
  {level: 'debug', stream: process.stdout},
  {level: 'error', stream: process.stderr},
  {level: 'fatal', stream: process.stderr}
]
const logger = pino({
  name: 'faucet',
  level: process.env.LOG_LEVEL || 'info',
}, pino.multistream(streams));

export default logger;