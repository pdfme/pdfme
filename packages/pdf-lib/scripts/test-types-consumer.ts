import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// This script is compiled into scripts/dist before execution.
const pdfLibDir = fileURLToPath(new URL('../..', import.meta.url));
const repoRoot = resolve(pdfLibDir, '../..');
const require = createRequire(import.meta.url);
const lockedTypeScriptVersion = String(require('typescript/package.json').version);

const SMOKE_SOURCE = `import { PDFDocument, StandardFonts, rgb } from '@pdfme/pdf-lib';

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.addPage();
page.drawText('NodeNext smoke test', { font, color: rgb(0, 0, 0) });
const bytes: Uint8Array = await doc.save();
await PDFDocument.load(bytes);

// 型がany化していないことも確認する。
// @ts-expect-error PDFDocument.load does not accept a number
await PDFDocument.load(123);
`;

const RUNTIME_SOURCE = `import { PDFDocument, StandardFonts, rgb } from '@pdfme/pdf-lib';

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.addPage();
page.drawText('NodeNext smoke test', { font, color: rgb(0, 0, 0) });
const bytes = await doc.save();
if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
  throw new Error('PDFDocument.save() did not return PDF bytes');
}
const loaded = await PDFDocument.load(bytes);
if (typeof loaded.getPageCount !== 'function' || loaded.getPageCount() < 1) {
  throw new Error('PDFDocument.load() did not restore a usable document');
}
console.log('runtime ok', bytes.byteLength);
`;

type ResolutionCase = {
  name: string;
  module: string;
  moduleResolution: string;
  ignoreDeprecations?: string;
};

const resolutionCases: ResolutionCase[] = [
  { name: 'NodeNext', module: 'NodeNext', moduleResolution: 'NodeNext' },
  { name: 'Node16', module: 'Node16', moduleResolution: 'Node16' },
  { name: 'Bundler', module: 'ESNext', moduleResolution: 'Bundler' },
];
const compilerCases = [
  {
    version: '6.0.2',
    resolutions: [
      ...resolutionCases,
      { name: 'node10', module: 'ESNext', moduleResolution: 'node10', ignoreDeprecations: '6.0' },
    ],
  },
  // Legacy node10 resolution was removed in TypeScript 7.
  { version: lockedTypeScriptVersion, resolutions: resolutionCases },
];

const run = (command: string, args: string[], cwd: string): string => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (exit ${result.status}, signal ${result.signal}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
};

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const checkPackage = (consumerDir: string, packedFiles: string[]): void => {
  const packageJson = JSON.parse(
    readFileSync(join(consumerDir, 'node_modules/@pdfme/pdf-lib/package.json'), 'utf8'),
  ) as {
    types?: string;
    exports?: { '.': { types?: string; import?: string } };
  };
  for (const entry of [
    packageJson.types,
    packageJson.exports?.['.']?.types,
    packageJson.exports?.['.']?.import,
  ]) {
    if (!entry || !packedFiles.includes(entry.replace(/^\.\//, ''))) {
      throw new Error(`Missing types/exports target in tarball: ${entry}`);
    }
  }
};

const main = (): void => {
  for (const entry of ['dist/index.js', 'dist/index.d.ts']) {
    if (!existsSync(join(pdfLibDir, entry)))
      throw new Error(`Missing ${entry}; run npm run build first.`);
  }
  const tempRoot = mkdtempSync(join(tmpdir(), 'pdfme-pdf-lib-consumer-'));
  try {
    if (tempRoot === repoRoot || tempRoot.startsWith(`${repoRoot}${sep}`)) {
      throw new Error('Consumer directory must be outside the repository.');
    }
    const [packed] = JSON.parse(
      run('npm', ['pack', '--json', `--pack-destination=${tempRoot}`], pdfLibDir),
    ) as Array<{
      filename: string;
      files: Array<{ path: string }>;
    }>;
    if (!packed?.filename) throw new Error('npm pack returned no tarball.');
    const tarball = pathToFileURL(join(tempRoot, packed.filename)).href;
    const packedFiles = packed.files.map(({ path }) => path);
    if (
      packedFiles.some((file) => file.startsWith('dist/typecheck/') || file.startsWith('scripts/'))
    ) {
      throw new Error('Tarball includes internal typecheck output or build scripts.');
    }

    for (const { version, resolutions } of compilerCases) {
      const consumerDir = join(tempRoot, `ts-${version}`);
      mkdirSync(consumerDir, { recursive: true });
      writeJson(join(consumerDir, 'package.json'), { private: true, type: 'module' });
      run(
        'npm',
        [
          'install',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          tarball,
          `typescript@${version}`,
        ],
        consumerDir,
      );
      checkPackage(consumerDir, packedFiles);
      writeFileSync(join(consumerDir, 'test.ts'), SMOKE_SOURCE);
      for (const { name, ...options } of resolutions) {
        writeJson(join(consumerDir, 'tsconfig.json'), {
          compilerOptions: {
            target: 'ES2020',
            strict: true,
            skipLibCheck: false,
            noEmit: true,
            ...options,
          },
          include: ['test.ts'],
        });
        run(
          process.execPath,
          [join(consumerDir, 'node_modules/typescript/bin/tsc'), '--pretty', 'false', '--noEmit'],
          consumerDir,
        );
        console.log(`[typescript@${version} ${name}] ok`);
      }
      writeFileSync(join(consumerDir, 'runtime.mjs'), RUNTIME_SOURCE);
      console.log(run(process.execPath, [join(consumerDir, 'runtime.mjs')], consumerDir).trim());
    }
    console.log('test:types:consumer passed (node10 checked with TypeScript 6.0.2 only)');
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
