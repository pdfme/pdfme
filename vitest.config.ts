import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = process.cwd();
const workspacePath = path.relative(repoRoot, workspaceRoot).split(path.sep).join('/');

const workspaceTests: Record<
  string,
  {
    name: string;
    include: string[];
    setupFiles?: string[];
    testTimeout?: number;
  }
> = {
  'packages/common': {
    name: 'common',
    include: ['__tests__/**/*.test.ts'],
  },
  'packages/converter': {
    name: 'converter',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 30000,
  },
  'packages/generator': {
    name: 'generator',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: [path.resolve(repoRoot, 'packages/generator/vitest.setup.ts')],
    testTimeout: 60000,
  },
  'packages/manipulator': {
    name: 'manipulator',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: [path.resolve(repoRoot, 'packages/manipulator/vitest.setup.ts')],
    testTimeout: 30000,
  },
  'packages/schemas': {
    name: 'schemas',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 30000,
  },
  'packages/pdf-lib': {
    name: 'pdf-lib',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.spec.ts'],
    testTimeout: 30000,
  },
};

const selectedWorkspace = workspaceTests[workspacePath];

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@pdfme/schemas/utils',
        replacement: path.resolve(repoRoot, 'packages/schemas/src/utils.ts'),
      },
      {
        find: '@pdfme/common',
        replacement: path.resolve(repoRoot, 'packages/common/src/index.ts'),
      },
      {
        find: '@pdfme/converter',
        replacement: path.resolve(repoRoot, 'packages/converter/src/index.node.ts'),
      },
      {
        find: '@pdfme/generator',
        replacement: path.resolve(repoRoot, 'packages/generator/src/index.ts'),
      },
      {
        find: '@pdfme/manipulator',
        replacement: path.resolve(repoRoot, 'packages/manipulator/src/index.ts'),
      },
      {
        find: '@pdfme/pdf-lib',
        replacement: path.resolve(repoRoot, 'packages/pdf-lib/src/index.ts'),
      },
      {
        find: '@pdfme/schemas',
        replacement: path.resolve(repoRoot, 'packages/schemas/src/index.ts'),
      },
    ],
  },
  test: {
    name: selectedWorkspace?.name ?? 'root',
    root: workspaceRoot,
    globals: true,
    pool: 'forks',
    passWithNoTests: !selectedWorkspace,
    include: selectedWorkspace?.include ?? [],
    setupFiles: selectedWorkspace?.setupFiles,
    testTimeout: selectedWorkspace?.testTimeout,
  },
});
