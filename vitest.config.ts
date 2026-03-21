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
    hookTimeout?: number;
    fileParallelism?: boolean;
    environment?: 'jsdom';
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
  'packages/ui': {
    name: 'ui',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: [path.resolve(repoRoot, 'packages/ui/vitest.setup.ts')],
    testTimeout: 30000,
    environment: 'jsdom',
  },
  playground: {
    name: 'playground',
    include: ['e2e/**/*.test.ts'],
    setupFiles: [path.resolve(repoRoot, 'playground/vitest.setup.ts')],
    testTimeout: 200000,
    hookTimeout: 200000,
    fileParallelism: false,
  },
};

const selectedWorkspace = workspaceTests[workspacePath];
const usePublishedPdfmeExports = workspacePath === 'playground';
const converterReplacement =
  workspacePath === 'packages/ui'
    ? path.resolve(repoRoot, 'packages/ui/__mocks__/converter.ts')
    : path.resolve(repoRoot, 'packages/converter/src/index.node.ts');
const pdfmeAliases = usePublishedPdfmeExports
  ? []
  : [
      {
        find: '@pdfme/schemas/builtins',
        replacement: path.resolve(repoRoot, 'packages/schemas/src/builtins.ts'),
      },
      {
        find: '@pdfme/schemas/tables',
        replacement: path.resolve(repoRoot, 'packages/schemas/src/tables.ts'),
      },
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
        replacement: converterReplacement,
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
    ];
const testConfig = {
  name: selectedWorkspace?.name ?? 'root',
  root: workspaceRoot,
  globals: true,
  pool: 'forks' as const,
  passWithNoTests: !selectedWorkspace,
  include: selectedWorkspace?.include ?? [],
  setupFiles: selectedWorkspace?.setupFiles,
  testTimeout: selectedWorkspace?.testTimeout,
  hookTimeout: selectedWorkspace?.hookTimeout,
  fileParallelism: selectedWorkspace?.fileParallelism,
  ...(selectedWorkspace?.environment ? { environment: selectedWorkspace.environment } : {}),
};

export default defineConfig({
  resolve: {
    alias: [
      ...pdfmeAliases,
      {
        find: /^antd\/es\//,
        replacement: 'antd/lib/',
      },
      {
        find: /^form-render$/,
        replacement: path.resolve(repoRoot, 'packages/ui/__mocks__/form-render.ts'),
      },
      {
        find: /^form-render\/es\//,
        replacement: 'form-render/lib/',
      },
      {
        find: /^rc-picker\/es\//,
        replacement: 'rc-picker/lib/',
      },
      {
        find: /^lodash-es$/,
        replacement: 'lodash',
      },
      {
        find: /^lucide-react$/,
        replacement: path.resolve(repoRoot, 'packages/ui/__mocks__/lucide-react.ts'),
      },
    ],
  },
  test: testConfig,
});
