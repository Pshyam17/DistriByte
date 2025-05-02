module.exports = {
    extends: ['next/core-web-vitals', 'eslint:recommended'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
    },
  };