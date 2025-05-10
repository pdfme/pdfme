import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig(({ mode }) => {
  return {
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    plugins: [
      react(), 
      tsconfigPaths({ root: '.' }), 
      cssInjectedByJsPlugin(),
      {
        name: 'resolve-converter',
        resolveId(id) {
          if (id === '@pdfme/converter') {
            return { id: '@pdfme/converter', external: true };
          }
          return null;
        }
      }
    ],
    build: {
      lib: {
        entry: 'src/index.ts',
        name: '@pdfme/ui',
        fileName: (format) => `index.${format}.js`,
      },
      rollupOptions: {
        external: ['@pdfme/converter', '@pdfme/common', '@pdfme/schemas']
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'pdfjs-dist', 'antd'],
      exclude: ['@pdfme/common', '@pdfme/schemas', '@pdfme/converter'],
    }
  };
});
