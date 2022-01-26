import url from '@rollup/plugin-url';
// import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';

const packageJson = require('./package.json');

export default {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({ useTsconfigDeclarationDir: true }),
    commonjs(),
    json(),
    postcss({ modules: true, sourceMap: true, extract: true, minimize: true }),
    injectProcessEnv({ NODE_ENV: 'production' }),
    nodeResolve({ module: true, jsnext: true, main: true, browser: true }),
    url({ include: ['**/*.svg', '**/*.png', '**/*.jp(e)?g', '**/*.gif', '**/*.webp', '**/*.ttf'] }),
    nodePolyfills(),
    peerDepsExternal(),
    // terser(),
  ],
};
