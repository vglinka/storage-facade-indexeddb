// Docs: https://eslint.org/docs/latest/use/getting-started

module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    // Docs: https://www.npmjs.com/package/eslint-plugin-promise
    'plugin:promise/recommended',
    'airbnb-base',
    // Docs: https://www.npmjs.com/package/eslint-plugin-prettier
    'plugin:prettier/recommended',
  ],
  // Docs: https://typescript-eslint.io/getting-started/
  parser: '@typescript-eslint/parser',
  // Docs: https://typescript-eslint.io/getting-started/
  root: true,
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'standard-with-typescript',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        // Docs: https://www.npmjs.com/package/eslint-config-airbnb-typescript
        'airbnb-typescript/base',
        'plugin:prettier/recommended',
      ],
      parserOptions: {
        project: ['tsconfig.json'],
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    // Docs: https://www.npmjs.com/package/eslint-plugin-promise
    'promise',
    '@typescript-eslint',
    'prettier',
  ],
  // Docs: https://eslint.org/docs/latest/rules/
  rules: {
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['state'],
      },
    ],
    // Docs: https://eslint.org/docs/latest/rules/no-prototype-builtins
    'no-prototype-builtins': 'off',
    // Docs: https://basarat.gitbook.io/typescript/main-1/defaultisbad
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
    // "Missing file extension "ts" import/extensions"
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
    // Docs: https://www.npmjs.com/package/eslint-plugin-prettier
    'prettier/prettier': 'error',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
  },
  //
  settings: {
    // "Missing file extension "ts" import/extensions"
    'import/extensions': ['.js', '.ts'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },   
  },
};
