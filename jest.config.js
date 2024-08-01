export default {
  "bail": 0,
  "verbose": true,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testEnvironment: 'node',
  "testEnvironmentOptions": {
    "url": "http://localhost/"
  }
}