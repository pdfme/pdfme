import url from '@rollup/plugin-url';
import { terser } from 'rollup-plugin-terser';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import { base64 } from 'rollup-plugin-base64';
import serve from 'rollup-plugin-serve';

const packageJson = require('./package.json');

const plugins = [
  postcss({ modules: true }),
  typescript({ useTsconfigDeclarationDir: true }),
  commonjs(),
  nodePolyfills(),
  nodeResolve({ module: true, browser: true }),
  json(),
  url(),
  base64({ include: 'src/**/*.ttf' }),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
];

if (process.env.NODE_ENV === 'development') {
  plugins.push(
    serve({
      open: true,
      contentBase: ['dist', 'development_assets'],
      host: 'localhost',
      port: 8000,
    })
  );
}

if (process.env.NODE_ENV === 'production') {
  plugins.push(terser());
}

export default {
  input: 'src/index.ts',
  output: [
    { file: packageJson.main, format: 'umd', name: 'pdfme', sourcemap: true },
    { file: packageJson.module, format: 'esm', sourcemap: true },
  ],
  plugins,
};
