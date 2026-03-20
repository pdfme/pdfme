import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  return {
    base: './',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    plugins: [react(), tsconfigPaths({ root: '.' }), cssInjectedByJsPlugin()],
    resolve: {
      alias: [
        {
          find: /^@pdfme\/schemas\/utils$/,
          replacement: resolve(__dirname, '../schemas/src/utils.ts'),
        },
        { find: /^@pdfme\/common$/, replacement: resolve(__dirname, '../common/src/index.ts') },
        {
          find: /^@pdfme\/converter$/,
          replacement: resolve(__dirname, '../converter/src/index.ts'),
        },
        { find: /^@pdfme\/pdf-lib$/, replacement: resolve(__dirname, '../pdf-lib/src/index.ts') },
        { find: /^@pdfme\/schemas$/, replacement: resolve(__dirname, '../schemas/src/index.ts') },
      ],
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        fileName: 'index',
        formats: ['es'],
      },
      minify: false,
      outDir: 'dist',
      sourcemap: true,
      target: 'es2020',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'pdfjs-dist', 'antd'],
      exclude: ['@pdfme/common', '@pdfme/schemas', '@pdfme/converter'],
    },
    worker: {
      format: 'es',
    },
  };
});
