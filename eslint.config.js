import js from '@eslint/js';
import globals from "globals";

const customGlobals = {
};

export default [
  {
    // global ignore
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/*.config.js',
      '**/webpack',
    ],
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    files: ['src/**/*.js', 'routes/**/*.js', 'helpers/**/*.js'],
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      globals: {
        ...customGlobals,
        ...globals.node,
      },
    },
    rules: {
      camelcase: 0,
    },
  },
  js.configs.recommended,
];