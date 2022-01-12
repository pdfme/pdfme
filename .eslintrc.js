module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'], // Your TypeScript files extension
      parserOptions: {
        project: ['./tsconfig.json'], // Specify it only for TypeScript files
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', 'react', 'react-hooks', '@typescript-eslint'],
  rules: {
    'no-use-before-define': 'off',
    'dot-notation': 'warn',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    parser: 'typescript-eslint-parser',
    ecmaVersion: 2018,
    sourceType: 'module',
    project: 'tsconfig.json',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
