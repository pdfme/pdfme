import url from '@rollup/plugin-url';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import { base64 } from 'rollup-plugin-base64';

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
    postcss({ modules: true }),
    typescript({ useTsconfigDeclarationDir: true }),
    commonjs(),
    nodeResolve({ module: true, browser: true }),
    json(),
    url(),
    base64({ include: 'src/**/*.ttf' }),
    peerDepsExternal(),
    replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
    terser(),
  ],
};
