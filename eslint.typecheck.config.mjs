import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rootConfig from './eslint.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...rootConfig,
  {
    files: [
      'packages/common/src/**/*.{ts,tsx}',
      'packages/converter/src/**/*.{ts,tsx}',
      'packages/generator/src/**/*.{ts,tsx}',
      'packages/manipulator/src/**/*.{ts,tsx}',
      'packages/schemas/src/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
];
