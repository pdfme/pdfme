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

const isExternal = (id: string) =>
  builtinModuleSet.has(id) ||
  packageDependencies.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));

export default defineConfig(() => {
  return {
    base: './',
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.browser.ts'),
          'index.node': resolve(__dirname, 'src/index.node.ts'),
        },
        fileName: (_, entryName) => `${entryName}.js`,
        formats: ['es'],
      },
      minify: false,
      outDir: 'dist',
      rollupOptions: { external: isExternal },
      sourcemap: true,
      target: 'es2020',
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
