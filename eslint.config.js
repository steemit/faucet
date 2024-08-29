import js from '@eslint/js';
import globals from 'globals';
import hooksPlugin from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

const customGlobals = {
};
const shareLanguageOptions = {
  ecmaVersion: 2022,
  sourceType: 'module',
};
const sharePlugins = {
};
const shareRules = {
  camelcase: 0,
  semi: 'error',
};

const config = [
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
    files: ['db/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      ...sharePlugins,
    },
    rules: {
      ...shareRules,
      'no-unused-vars': 'warn',
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
    files: ['app.js', 'routes/**/*.js', 'helpers/**/*.js'],
    languageOptions: {
      ...shareLanguageOptions,
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      ...sharePlugins,
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
    plugins: {
      ...sharePlugins,
      react,
      'react-hooks': hooksPlugin,
    },
    rules: {
      ...shareRules,
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      ...hooksPlugin.configs.recommended.rules,
    },
  },
  js.configs.recommended,
];

export default config;
