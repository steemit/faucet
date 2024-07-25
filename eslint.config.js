import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      parser: 'babel-eslint',
      parserOptions: {
        ecmaVersion: 7,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
          experimentalObjectRestSpread: true,
        },
      },
    },
    env: {
      node: true,
      browser: true,
      jest: true,
    },
    rules: {
      'camelcase': 0,
    }
  }
];