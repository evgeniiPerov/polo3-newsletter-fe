export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'color-no-hex': true,
    'declaration-no-important': true,
    'selector-max-id': 0,
    'selector-max-compound-selectors': 3,
    'unit-disallowed-list': ['px'],
    'selector-class-pattern': '^(?:(?:is|js)-)?[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
  },
  overrides: [
    {
      files: ['scss/settings/**/*.scss'],
      rules: { 'color-no-hex': null, 'unit-disallowed-list': null },
    },
  ],
};
