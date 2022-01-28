import url from '@rollup/plugin-url';
import { terser } from 'rollup-plugin-terser';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import modify from 'rollup-plugin-modify';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import { base64 } from 'rollup-plugin-base64';
import serve from 'rollup-plugin-serve';

const packageJson = require('./package.json');

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

const plugins = [
  // THIS IS VERY FRAGILE HACK...
  // Rewriting the docusaurus server build so that it doesn't crash.
  modify({
    // Because it crashes when executing checkTypeSupport in pdfjs
    'if (!xhr) {': 'if (!xhr && global$2.XMLHttpRequest) {',
    'var xhr;': 'var xhr = {};',
    // Because it crashes when executing　FontLib.loadFont in bwip-js
    'var bstr = binary ? data : atob(data),': `var bstr = binary ? data : (typeof window !== 'undefined' ? atob(data) : Buffer.from(data, 'base64').toString('binary')),`,
  }),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  postcss({ modules: true }),
  commonjs(),
  nodePolyfills(),
  nodeResolve({ module: true, browser: true }),
  json(),
  url(),
  base64({ include: 'src/**/*.ttf' }),
  typescript({ useTsconfigDeclarationDir: true }),
];

if (isDev) {
  plugins.push(
    serve({
      open: true,
      contentBase: ['dist', 'development_assets'],
      host: 'localhost',
      port: 8000,
    })
  );
}

// if (isProd) {
//   plugins.push(terser());
// }

export default {
  input: 'src/index.ts',
  output: [
    { file: packageJson.main, format: 'umd', name: 'pdfme', sourcemap: isProd },
    { file: packageJson.module, format: 'esm', sourcemap: isProd },
  ],
  plugins,
};
