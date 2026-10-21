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

const ANTD_IMPORT = /^antd(?:\/|$)/;
const ANTD_PACKAGE_ROOT = /^(.*[\\/]node_modules[\\/]antd)(?:[\\/]|$)/;

/**
 * form-render peers on antd 4/5, so npm installs a second antd next to ours.
 * A second copy has its own ConfigProvider context and silently drops
 * `options.theme` in the property panel (#1690). Fail the build instead.
 */
const singleAntdCopy = (): Plugin => {
  const packageRoots = new Set<string>();
  return {
    name: 'pdfme:single-antd-copy',
    enforce: 'pre',
    buildStart() {
      packageRoots.clear();
    },
    async resolveId(source, importer, options) {
      if (!ANTD_IMPORT.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const packageRoot = resolved ? ANTD_PACKAGE_ROOT.exec(resolved.id)?.[1] : undefined;
      if (packageRoot) packageRoots.add(packageRoot);
      return resolved;
    },
    buildEnd(error) {
      if (error || packageRoots.size <= 1) return;
      this.error(
        `Expected exactly one antd copy in the @pdfme/ui bundle, found ${packageRoots.size}:\n` +
          [...packageRoots].map((root) => `  - ${root}`).join('\n'),
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
