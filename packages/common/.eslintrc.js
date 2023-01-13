module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ['*.ts'], // Your TypeScript files extension
      parserOptions: {
        project: ['./tsconfig.esm.json'], // Specify it only for TypeScript files
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', '@typescript-eslint'],
  rules: {
    'no-use-before-define': 'off',
    'dot-notation': 'warn',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
  parserOptions: {
    parser: 'typescript-eslint-parser',
    ecmaVersion: 2018,
    sourceType: 'module',
    project: 'tsconfig.esm.json',
  },
};
