import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const isDev = process.env.NODE_ENV === 'development';
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    minify: !isDev,
    lib: {
      entry: 'src/index.ts',
      name: '@pdfme/ui',
      fileName: (format) => `index.${format}.js`,
      formats: isDev ? ['es'] : ['es', 'umd'],
    },
  },
});
