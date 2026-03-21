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
const pdfjsWorkerCompatBanner = [
  'const pdfmeUint8ArrayPrototype = Uint8Array.prototype;',
  'if (!pdfmeUint8ArrayPrototype.toHex) {',
  "  Object.defineProperty(Uint8Array.prototype, 'toHex', {",
  '    configurable: true,',
  '    value() {',
  "      let result = '';",
  '      for (let i = 0; i < this.length; i += 1) {',
  '        const hex = this[i].toString(16);',
  '        result += hex.length === 1 ? `0${hex}` : hex;',
  '      }',
  '      return result;',
  '    },',
  '    writable: true,',
  '  });',
  '}',
].join('\n');
const isExternal = (id: string) => builtinModuleSet.has(id);

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
      include: ['react', 'react-dom', 'pdfjs-dist', 'antd'],
      exclude: ['@pdfme/common', '@pdfme/schemas', '@pdfme/converter'],
    },
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          banner: pdfjsWorkerCompatBanner,
        },
      },
    },
  };
});
