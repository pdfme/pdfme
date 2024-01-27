import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [react(), tsconfigPaths({ root: '.' }), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: '@pdfme/ui',
      fileName: (format) => `index.${format}.js`,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'pdfjs-dist', 'antd'],
    exclude: ['@pdfme/common', '@pdfme/schemas'],
  },
});
