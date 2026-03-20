import path from 'node:path';
import { fileURLToPath } from 'node:url';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'packages/common/src/**/*.{ts,tsx}',
  'packages/converter/src/**/*.{ts,tsx}',
  'packages/generator/src/**/*.{ts,tsx}',
  'packages/manipulator/src/**/*.{ts,tsx}',
  'packages/pdf-lib/src/**/*.{ts,tsx}',
  'packages/schemas/src/**/*.{ts,tsx}',
  'packages/ui/src/**/*.{ts,tsx}',
];

export default [
  {
    ignores: ['dist/**', '**/node_modules/**'],
  },
  {
    files,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
];
