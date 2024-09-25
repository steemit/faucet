import js from '@eslint/js';
import globals from 'globals';
import hooksPlugin from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import babelParser from "@babel/eslint-parser";

const customGlobals = {
};
const shareLanguageOptions = {
};
const sharePlugins = {
};
const shareRules = {
  camelcase: 0,
  semi: 'error',
  '@typescript-eslint/no-explicit-any': 'off',
};

const config = [
  js.configs.recommended,
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
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: './babel.config.js',
        },
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
      reactPlugin,
      'react-hooks': hooksPlugin,
    },
    rules: {
      ...shareRules,
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      ...hooksPlugin.configs.recommended.rules,
    },
  },
];

export default config;
