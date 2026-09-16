import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  collectDeclarationFiles,
  collectModuleSpecifierOccurrences,
  isRelativeModuleSpecifier,
  matchingKnownExtension,
} from './rewrite-declaration-specifiers.ts';

const require = createRequire(import.meta.url);
const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const pdfLibDir = join(repoRoot, 'packages/pdf-lib');
const lockedTypeScriptVersion = String(require('typescript/package.json').version);
const CONSUMER_TYPESCRIPT_VERSIONS = ['6.0.2', lockedTypeScriptVersion];

const IMPORT_ONLY_SOURCE = `import { PDFDocument } from '@pdfme/pdf-lib';
export const create = PDFDocument.create;
`;

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
  source: 'smoke' | 'import-only';
  allowCompilerOptionErrors: boolean;
};

const RESOLUTION_CASES: ResolutionCase[] = [
  {
    name: 'NodeNext',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    source: 'smoke',
    allowCompilerOptionErrors: false,
  },
  {
    name: 'Node16',
    module: 'Node16',
    moduleResolution: 'Node16',
    source: 'smoke',
    allowCompilerOptionErrors: false,
  },
  {
    name: 'Bundler',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    source: 'smoke',
    allowCompilerOptionErrors: false,
  },
  {
    name: 'node10',
    module: 'ESNext',
    moduleResolution: 'node',
    source: 'import-only',
    allowCompilerOptionErrors: true,
  },
];

type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type DiagnosticKind = 'package' | 'consumer' | 'compiler-option' | 'other';

type ClassifiedDiagnostic = {
  code: string;
  message: string;
  file?: string;
  kind: DiagnosticKind;
};

const run = (command: string, args: string[], cwd: string): CommandResult => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

const fail = (message: string): never => {
  throw new Error(message);
};

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const fileExists = (path: string): boolean => {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
};

const createTsconfig = (
  moduleKind: string,
  moduleResolution: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  compilerOptions: {
    target: 'ES2020',
    module: moduleKind,
    moduleResolution,
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    ...extra,
  },
  include: ['test.ts'],
});

const isCompilerOptionDiagnostic = (code: string, message: string): boolean => {
  if (['5101', '5102', '5103', '5107', '5108', '5109', '5110'].includes(code)) return true;
  return /deprecated|unknown compiler option|option .* is deprecated/i.test(message);
};

const classifyDiagnostic = (
  file: string | undefined,
  code: string,
  message: string,
): DiagnosticKind => {
  if (isCompilerOptionDiagnostic(code, message) && (!file || file.endsWith('tsconfig.json'))) {
    return 'compiler-option';
  }
  if (
    file?.includes(`${sep}node_modules${sep}@pdfme${sep}pdf-lib${sep}`) ||
    file?.includes('/node_modules/@pdfme/pdf-lib/')
  ) {
    return 'package';
  }
  if (file && /(?:^|[\\/])test\.ts$/.test(file)) return 'consumer';
  return isCompilerOptionDiagnostic(code, message) ? 'compiler-option' : 'other';
};

const parseTscDiagnostics = (output: string): ClassifiedDiagnostic[] => {
  const diagnostics: ClassifiedDiagnostic[] = [];
  const filePattern = /(?:^|\n)([^\n]+?)\((\d+),(\d+)\): error TS(\d+): ([^\n]+)/g;
  const optionPattern = /(?:^|\n)error TS(\d+): ([^\n]+)/g;

  for (const match of output.matchAll(filePattern)) {
    const file = match[1]?.trim();
    const code = match[4] ?? '';
    const message = match[5] ?? '';
    diagnostics.push({ code, message, file, kind: classifyDiagnostic(file, code, message) });
  }

  for (const match of output.matchAll(optionPattern)) {
    const whole = match[0] ?? '';
    if (/\([^)]+\): error TS/.test(whole)) continue;
    const code = match[1] ?? '';
    const message = match[2] ?? '';
    diagnostics.push({
      code,
      message,
      kind: isCompilerOptionDiagnostic(code, message) ? 'compiler-option' : 'other',
    });
  }

  return diagnostics;
};

const summarize = (diagnostics: ClassifiedDiagnostic[], kind: DiagnosticKind): string =>
  diagnostics
    .filter((diagnostic) => diagnostic.kind === kind)
    .map(
      (diagnostic) =>
        `TS${diagnostic.code} ${diagnostic.file ?? '(option)'}: ${diagnostic.message}`,
    )
    .join('\n');

const assertBuiltPackage = (): void => {
  if (
    !fileExists(join(pdfLibDir, 'dist/index.js')) ||
    !fileExists(join(pdfLibDir, 'dist/index.d.ts'))
  ) {
    fail(
      'packages/pdf-lib/dist is missing. Run `npm run build` before `npm run test:types:consumer`.',
    );
  }
};

const packPdfLib = (destination: string): { tarballPath: string; packedFiles: string[] } => {
  const result = run('npm', ['pack', '--json', `--pack-destination=${destination}`], pdfLibDir);
  if (result.status !== 0) fail(`npm pack failed:\n${result.stdout}\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout) as Array<{
    filename: string;
    files: Array<{ path: string }>;
  }>;
  const packed = parsed[0];
  if (!packed?.filename) fail(`Unexpected npm pack JSON: ${result.stdout}`);
  return {
    tarballPath: join(destination, packed.filename),
    packedFiles: (packed.files ?? []).map((file) => file.path.replace(/^package\//, '')),
  };
};

const assertTarballLayout = (tarballPath: string, packedFiles: string[]): void => {
  const packageJsonResult = run('tar', ['-xOf', tarballPath, 'package/package.json'], repoRoot);
  if (packageJsonResult.status !== 0) {
    fail(`Failed to read package.json from tarball:\n${packageJsonResult.stderr}`);
  }
  const packageJson = JSON.parse(packageJsonResult.stdout) as {
    files?: string[];
    types?: string;
    exports?: { '.': { types?: string; import?: string } };
  };
  const requiredPaths = [
    packageJson.types?.replace(/^\.\//, ''),
    packageJson.exports?.['.']?.types?.replace(/^\.\//, ''),
    packageJson.exports?.['.']?.import?.replace(/^\.\//, ''),
    'dist/index.d.ts',
    'dist/index.js',
    'dist/api/index.d.ts',
    'dist/api/PDFDocument.d.ts',
  ];

  if (!packageJson.files?.includes('dist')) fail('package.json files field does not include dist');
  for (const required of requiredPaths) {
    if (!required) fail('package.json types/exports are missing');
    if (!packedFiles.includes(required)) fail(`tarball is missing ${required}`);
  }
  const typecheckFiles = packedFiles.filter(
    (file) => file === 'dist/typecheck' || file.startsWith('dist/typecheck/'),
  );
  if (typecheckFiles.length > 0) {
    fail(
      `tarball should not include typecheck declarations: ${typecheckFiles.slice(0, 5).join(', ')}`,
    );
  }
};

const installConsumer = (
  consumerDir: string,
  tarballPath: string,
  typescriptVersion: string,
): void => {
  writeJson(join(consumerDir, 'package.json'), { private: true, type: 'module' });
  const result = run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      pathToFileURL(tarballPath).href,
      `typescript@${typescriptVersion}`,
    ],
    consumerDir,
  );
  if (result.status !== 0) {
    fail(
      `npm install failed for typescript@${typescriptVersion}:\n${result.stdout}\n${result.stderr}`,
    );
  }
};

const runTsc = (
  consumerDir: string,
  tsconfig: Record<string, unknown>,
  source: string,
): { output: string; diagnostics: ClassifiedDiagnostic[]; status: number } => {
  writeJson(join(consumerDir, 'tsconfig.json'), tsconfig);
  writeFileSync(join(consumerDir, 'test.ts'), source);
  const result = run(
    process.execPath,
    [join(consumerDir, 'node_modules/typescript/bin/tsc'), '--pretty', 'false', '--noEmit'],
    consumerDir,
  );
  const output = `${result.stdout}\n${result.stderr}`;
  return { output, diagnostics: parseTscDiagnostics(output), status: result.status };
};

const hasBlockingErrors = (diagnostics: ClassifiedDiagnostic[]): boolean =>
  diagnostics.some((diagnostic) => diagnostic.kind !== 'compiler-option');

const runResolutionCase = (
  consumerDir: string,
  typescriptVersion: string,
  resolutionCase: ResolutionCase,
): void => {
  const source = resolutionCase.source === 'smoke' ? SMOKE_SOURCE : IMPORT_ONLY_SOURCE;
  const attempts: Array<Record<string, unknown>> = [
    createTsconfig(resolutionCase.module, resolutionCase.moduleResolution),
  ];
  if (resolutionCase.allowCompilerOptionErrors) {
    attempts.push(
      createTsconfig(resolutionCase.module, resolutionCase.moduleResolution, {
        ignoreDeprecations: '6.0',
      }),
      createTsconfig(resolutionCase.module, 'node10'),
    );
  }

  let lastOutput = '';
  let lastDiagnostics: ClassifiedDiagnostic[] = [];
  let lastStatus = 1;

  for (const tsconfig of attempts) {
    const result = runTsc(consumerDir, tsconfig, source);
    lastOutput = result.output;
    lastDiagnostics = result.diagnostics;
    lastStatus = result.status;
    const packageErrors = result.diagnostics.filter((diagnostic) => diagnostic.kind === 'package');
    const consumerErrors = result.diagnostics.filter(
      (diagnostic) => diagnostic.kind === 'consumer',
    );
    const otherErrors = result.diagnostics.filter((diagnostic) => diagnostic.kind === 'other');
    const optionErrors = result.diagnostics.filter(
      (diagnostic) => diagnostic.kind === 'compiler-option',
    );

    if (result.status === 0 && !hasBlockingErrors(result.diagnostics)) {
      if (optionErrors.length > 0) {
        console.log(
          `[typescript@${typescriptVersion} ${resolutionCase.name}] ok (compiler option notes only)`,
        );
      } else {
        console.log(`[typescript@${typescriptVersion} ${resolutionCase.name}] ok`);
      }
      return;
    }

    if (
      resolutionCase.allowCompilerOptionErrors &&
      packageErrors.length === 0 &&
      consumerErrors.length === 0 &&
      otherErrors.length === 0
    ) {
      console.log(
        `[typescript@${typescriptVersion} ${resolutionCase.name}] compiler option deprecation only; package types are usable`,
      );
      return;
    }

    if (!resolutionCase.allowCompilerOptionErrors || hasBlockingErrors(result.diagnostics)) {
      if (
        !resolutionCase.allowCompilerOptionErrors ||
        attempts.indexOf(tsconfig) === attempts.length - 1
      ) {
        fail(
          `typescript@${typescriptVersion} ${resolutionCase.name} failed:\n${result.output}\npackage:\n${summarize(result.diagnostics, 'package')}\nconsumer:\n${summarize(result.diagnostics, 'consumer')}\ncompiler-option:\n${summarize(result.diagnostics, 'compiler-option')}\nother:\n${summarize(result.diagnostics, 'other')}`,
        );
      }
    }
  }

  fail(
    `typescript@${typescriptVersion} ${resolutionCase.name} failed:\n${lastOutput}\n${summarize(lastDiagnostics, 'package')}\nstatus=${lastStatus}`,
  );
};

const assertNoExtensionlessRelativeSpecifiers = (installedDist: string): void => {
  for (const file of collectDeclarationFiles(installedDist)) {
    const text = readFileSync(file, 'utf8');
    for (const occurrence of collectModuleSpecifierOccurrences(text)) {
      if (!isRelativeModuleSpecifier(occurrence.specifier)) continue;
      if (!matchingKnownExtension(occurrence.specifier)) {
        fail(
          `Packed declaration still has extensionless specifier '${occurrence.specifier}' in ${file}`,
        );
      }
    }
  }
};

const runRuntime = (consumerDir: string): void => {
  writeFileSync(join(consumerDir, 'runtime.mjs'), RUNTIME_SOURCE);
  const result = run(process.execPath, [join(consumerDir, 'runtime.mjs')], consumerDir);
  if (result.status !== 0)
    fail(`Node ESM runtime check failed:\n${result.stdout}\n${result.stderr}`);
  console.log(`[runtime] ${result.stdout.trim()}`);
};

const main = (): void => {
  assertBuiltPackage();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'pdfme-pdf-lib-consumer-'));
  if (tmpRoot === repoRoot || tmpRoot.startsWith(`${repoRoot}${sep}`)) {
    fail(`Consumer temp directory must be outside the repository: ${tmpRoot}`);
  }

  try {
    const { tarballPath, packedFiles } = packPdfLib(tmpRoot);
    console.log(`Packed ${tarballPath}`);
    assertTarballLayout(tarballPath, packedFiles);

    for (const typescriptVersion of CONSUMER_TYPESCRIPT_VERSIONS) {
      const consumerDir = join(tmpRoot, `ts-${typescriptVersion.replaceAll('.', '-')}`);
      mkdirSync(consumerDir, { recursive: true });
      installConsumer(consumerDir, tarballPath, typescriptVersion);
      assertNoExtensionlessRelativeSpecifiers(
        join(consumerDir, 'node_modules/@pdfme/pdf-lib/dist'),
      );
      for (const resolutionCase of RESOLUTION_CASES) {
        runResolutionCase(consumerDir, typescriptVersion, resolutionCase);
      }
      runRuntime(consumerDir);
    }
    console.log('test:types:consumer passed');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
};

const isExecutedAsCli = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === resolve(fileURLToPath(import.meta.url));
};

if (isExecutedAsCli()) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
