import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const builtinModuleSet = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
const packageDependencies = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
];

// Also externalize transitive native deps that must not be bundled
const alwaysExternal = ['@napi-rs/canvas', 'pdfjs-dist', 'fontkit', '@pdfme/pdf-lib'];

const isExternal = (id: string) =>
  builtinModuleSet.has(id) ||
  packageDependencies.some((dependency) => id === dependency || id.startsWith(`${dependency}/`)) ||
  alwaysExternal.some((dep) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    minify: false,
    outDir: 'dist',
    rollupOptions: {
      external: isExternal,
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    sourcemap: true,
    target: 'node20',
  },
});
