module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 7,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      experimentalObjectRestSpread: true,
    },
  },
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  extends: ['airbnb', 'prettier', 'prettier/react'],
  rules: {
    'no-restricted-syntax': 0,
    'global-require': 0,
    'no-param-reassign': 0,
    'consistent-return': 0,
    'camelcase': 0,
    'import/no-extraneous-dependencies': 0,
    'no-mixed-operators': 0,
    'react/jsx-filename-extension': [1, { extensions: ['.js'] }],
    'react/sort-comp': 0,
  },
};
