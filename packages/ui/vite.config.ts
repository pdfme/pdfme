import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import topLevelAwait from 'vite-plugin-top-level-await';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({root: '.'}),
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: (i) => `__tla_${i}`,
    }),
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: '@pdfme/ui',
      fileName: () => `index.js`,
      formats: ['es'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'pdfjs-dist', 'antd'],
    exclude: ['@pdfme/common', '@pdfme/schemas'],
  },
});
