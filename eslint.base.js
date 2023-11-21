module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
    browser: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./tsconfig.esm.json'],
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    parser: 'typescript-eslint-parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};