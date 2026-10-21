import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
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

/**
 * Packages that must be bundled exactly once. Each copy of antd (or of the
 * cssinjs runtime it styles with) has its own context, so a second copy pulled
 * in by form-render (which peers on antd 4/5) silently drops `options.theme`
 * in the property panel (#1690). Fail the build instead.
 */
const SINGLE_COPY_PACKAGES = ['antd', '@ant-design/cssinjs'];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const singleAntdCopy = (): Plugin => {
  const packages = SINGLE_COPY_PACKAGES.map((name) => {
    const path = escapeRegExp(name).replace('/', '[\\\\/]');
    return {
      name,
      importPattern: new RegExp(`^${escapeRegExp(name)}(?:/|$)`),
      rootPattern: new RegExp(`^(.*[\\\\/]node_modules[\\\\/]${path})(?:[\\\\/]|$)`),
      roots: new Set<string>(),
    };
  });
  return {
    name: 'pdfme:single-antd-copy',
    enforce: 'pre',
    buildStart() {
      packages.forEach(({ roots }) => roots.clear());
    },
    async resolveId(source, importer, options) {
      const target = packages.find(({ importPattern }) => importPattern.test(source));
      if (!target) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const packageRoot = resolved ? target.rootPattern.exec(resolved.id)?.[1] : undefined;
      if (packageRoot) target.roots.add(packageRoot);
      return resolved;
    },
    buildEnd(error) {
      if (error) return;
      const duplicated = packages.filter(({ roots }) => roots.size > 1);
      if (duplicated.length === 0) return;
      this.error(
        duplicated
          .map(
            ({ name, roots }) =>
              `Expected exactly one ${name} copy in the @pdfme/ui bundle, found ${roots.size}:\n` +
              [...roots].map((root) => `  - ${root}`).join('\n'),
          )
          .join('\n'),
      );
    },
  };
};

export default defineConfig(({ mode }) => {
  return {
    base: './',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    plugins: [singleAntdCopy(), react(), cssInjectedByJsPlugin()],
    resolve: {
      // Bundle form-render against our antd so the property panel shares the
      // Designer's ConfigProvider (theme). See singleAntdCopy.
      dedupe: ['antd'],
    },
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
