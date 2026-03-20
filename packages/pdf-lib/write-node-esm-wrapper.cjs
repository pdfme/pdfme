const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const cjsEntry = require('./dist/node/src/index.js');
const exportNames = Object.keys(cjsEntry).filter(
  (name) => name !== 'default' && name !== '__esModule' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name),
);

const wrapperLines = [
  "import { createRequire } from 'node:module';",
  '',
  'const require = createRequire(import.meta.url);',
  "const pdfLib = require('./src/index.js');",
  '',
  'export default pdfLib;',
  ...exportNames.map((name) => `export const ${name} = pdfLib.${name};`),
  '',
];

const outputDir = join(__dirname, 'dist', 'node');
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'index.mjs'), wrapperLines.join('\n'));
