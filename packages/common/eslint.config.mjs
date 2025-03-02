import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the root config
const rootConfigPath = resolve(__dirname, '../../eslint.config.mjs');
const rootConfig = await import(rootConfigPath);

export default [
  ...rootConfig.default,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.esm.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
];
