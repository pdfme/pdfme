import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const builtinModuleSet = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
const externalDependencies = ['@pdfme/converter'];
const isExternal = (id: string) =>
  builtinModuleSet.has(id) ||
  externalDependencies.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));

export default defineConfig(({ mode }) => {
  return {
    base: './',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    plugins: [react(), cssInjectedByJsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        fileName: 'index',
        formats: ['es'],
      },
      minify: false,
      outDir: 'dist',
      rollupOptions: { external: isExternal },
      sourcemap: true,
      target: 'es2020',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'antd'],
      exclude: ['@pdfme/common', '@pdfme/schemas', '@pdfme/converter'],
    },
    worker: {
      format: 'es',
    },
  };
});
