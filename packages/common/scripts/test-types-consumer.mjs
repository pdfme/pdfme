import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const commonDir = resolve(scriptDir, '..');
const repoRoot = resolve(commonDir, '../..');
const generatorDir = resolve(repoRoot, 'packages/generator');

const COMPILER_VERSIONS = ['5.5.4', '5.6.2'];

const CONSUMER_SOURCE = `import { b64toUint8Array } from '@pdfme/common';
import type { CustomPdf, Font, PdfBytes, Template } from '@pdfme/common';
import { generate, generateForm } from '@pdfme/generator';
import type { GenerateProps } from '@pdfme/common';

const template: Template = {
  basePdf: { width: 210, height: 297, padding: [0, 0, 0, 0] },
  schemas: [[{ name: 'field', type: 'text', position: { x: 0, y: 0 }, width: 10, height: 10 }]],
};

const schemaCount: number = template.schemas.length;
const fieldName: string = template.schemas[0][0].name;
void schemaCount;
void fieldName;

const bytes: PdfBytes = b64toUint8Array('AAAA');
const customPdf: CustomPdf = bytes;
const font: Font = { Roboto: { data: bytes, fallback: true } };
void customPdf;
void font;

declare const props: GenerateProps;
const generated: PdfBytes = await generate(props);
const formBytes: PdfBytes = await generateForm(props);
void generated;
void formBytes;

// @ts-expect-error Template.schemas is a page array, not a string
const _invalid: Template = { basePdf: template.basePdf, schemas: 'poisoned' };
`;

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
};

const collectDts = (dir) => {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'typecheck') continue;
        walk(path);
      } else if (entry.name.endsWith('.d.ts')) {
        out.push(path);
      }
    }
  };
  walk(dir);
  return out;
};

const assertNoGenericUint8Array = (pkgDir, label) => {
  const dtsRoot = join(pkgDir, 'dist');
  if (!existsSync(dtsRoot)) {
    throw new Error(`Missing ${label} dist; run npm run build first.`);
  }
  const hits = [];
  for (const file of collectDts(dtsRoot)) {
    const text = readFileSync(file, 'utf8');
    if (text.includes('Uint8Array<')) {
      hits.push(file.slice(pkgDir.length + 1));
    }
  }
  if (hits.length > 0) {
    throw new Error(
      `${label} published d.ts still contains Uint8Array<...> (breaks TS ≤5.6):\n${hits.join('\n')}`,
    );
  }
};

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const main = () => {
  for (const entry of ['dist/index.js', 'dist/index.d.ts']) {
    if (!existsSync(join(commonDir, entry))) {
      throw new Error(`Missing ${entry}; run npm run build first.`);
    }
    if (!existsSync(join(generatorDir, entry))) {
      throw new Error(`Missing generator ${entry}; run npm run build first.`);
    }
  }

  assertNoGenericUint8Array(commonDir, '@pdfme/common');
  assertNoGenericUint8Array(generatorDir, '@pdfme/generator');

  const tempRoot = mkdtempSync(join(tmpdir(), 'pdfme-common-consumer-'));
  try {
    writeFileSync(join(tempRoot, 'consumer.ts'), CONSUMER_SOURCE);
    writeJson(join(tempRoot, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2020',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        paths: {
          '@pdfme/common': [join(commonDir, 'dist/index.d.ts')],
          '@pdfme/generator': [join(generatorDir, 'dist/index.d.ts')],
        },
      },
      include: ['consumer.ts'],
    });

    for (const version of COMPILER_VERSIONS) {
      const compilerDir = join(tempRoot, `ts-${version}`);
      mkdirSync(compilerDir, { recursive: true });
      writeJson(join(compilerDir, 'package.json'), { private: true });
      run(
        'npm',
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', `typescript@${version}`],
        compilerDir,
      );
      run(
        process.execPath,
        [join(compilerDir, 'node_modules/typescript/bin/tsc'), '--pretty', 'false', '-p', tempRoot],
        tempRoot,
      );
      console.log(`[typescript@${version} skipLibCheck:true] @pdfme/common Template + generate PdfBytes ok`);
    }
    console.log('test:types:consumer passed (TS 5.5/5.6 floor; skipLibCheck:true)');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
