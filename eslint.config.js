import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'reports/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    rules: {
      'no-console': 'error',
      'no-alert': 'error',
      'no-implicit-globals': 'error',
      camelcase: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
    // Checklist E2: each file starts with 'use strict'; before its IIFE.
    rules: { strict: ['error', 'global'] },
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // page.evaluate callbacks run in the browser.
    files: ['tests/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
