module.exports = {
  extends: ['../../eslint.base.js'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./tsconfig.esm.json'],
      },
    },
  ],
};