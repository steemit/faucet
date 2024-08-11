import js from '@eslint/js';
import globals from "globals";

const customGlobals = {
};
const shareLanguageOptions = {
  ecmaVersion: 12,
  sourceType: 'module',
};
const shareRules = {
  camelcase: 0,
  semi: 'error',
};

export default [
  {
    // global ignore
    ignores: [
      '**/node_modules',
      '**/public',
      '**/*.config.js',
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
    files: ['webpack/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['routes/**/*.js', 'helpers/**/*.js'],
    languageOptions: {
      ...shareLanguageOptions,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...shareRules,
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ...shareLanguageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...customGlobals,
      },
    },
    rules: {
      ...shareRules,
    },
  },
  js.configs.recommended,
];