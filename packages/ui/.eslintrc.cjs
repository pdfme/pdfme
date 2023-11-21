module.exports = {
  extends: ['../../eslint.base.js', "plugin:react/recommended", 'plugin:react-hooks/recommended'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
