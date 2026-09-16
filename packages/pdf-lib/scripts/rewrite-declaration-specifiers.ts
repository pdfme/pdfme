import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

const KNOWN_EXTENSIONS = [
  '.d.ts',
  '.d.mts',
  '.d.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.node',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
] as const;

export type ModuleSpecifierOccurrence = {
  specifier: string;
  quoteStart: number;
  quoteEnd: number;
};

export type RewriteResult = {
  filesScanned: number;
  filesChanged: number;
};

export class UnresolvableDeclarationSpecifierError extends Error {
  readonly declarationFile: string;
  readonly specifier: string;

  constructor(declarationFile: string, specifier: string) {
    super(`Unresolvable relative module specifier '${specifier}' in ${declarationFile}`);
    this.name = 'UnresolvableDeclarationSpecifierError';
    this.declarationFile = declarationFile;
    this.specifier = specifier;
  }
}

export const isRelativeModuleSpecifier = (specifier: string): boolean =>
  specifier === '.' ||
  specifier === '..' ||
  specifier.startsWith('./') ||
  specifier.startsWith('../');

export const matchingKnownExtension = (specifier: string): string | undefined => {
  const lower = specifier.toLowerCase();
  return [...KNOWN_EXTENSIONS]
    .sort((left, right) => right.length - left.length)
    .find((extension) => lower.endsWith(extension));
};

const toPosixSpecifier = (specifier: string): string => specifier.replaceAll('\\', '/');

const stripTrailingSlashes = (specifier: string): string => specifier.replace(/\/+$/, '');

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const appendJsExtension = (specifier: string): string => `${stripTrailingSlashes(specifier)}.js`;

const appendIndexJs = (specifier: string): string => {
  const posix = stripTrailingSlashes(toPosixSpecifier(specifier));
  if (posix === '.' || posix === '') return './index.js';
  if (posix === '..') return '../index.js';
  return `${posix}/index.js`;
};

const declarationCandidatesForSpecifier = (
  fromDir: string,
  specifier: string,
  extension: string | undefined,
): string[] => {
  const absolutePath = resolve(fromDir, specifier);
  if (!extension) {
    return [join(`${absolutePath}.d.ts`), join(absolutePath, 'index.d.ts')];
  }

  const withoutExtension = absolutePath.slice(0, -extension.length);
  if (extension === '.js') return [`${withoutExtension}.d.ts`];
  if (extension === '.mjs') return [`${withoutExtension}.d.mts`, `${withoutExtension}.d.ts`];
  if (extension === '.cjs') return [`${withoutExtension}.d.cts`, `${withoutExtension}.d.ts`];
  return [absolutePath];
};

export const collectModuleSpecifierOccurrences = (text: string): ModuleSpecifierOccurrence[] => {
  const scanner = createScanner(true);
  scanner.setText(text);
  const occurrences: ModuleSpecifierOccurrence[] = [];
  let previousKind = SyntaxKind.Unknown;
  let previousPreviousKind = SyntaxKind.Unknown;

  for (;;) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;

    if (kind === SyntaxKind.StringLiteral) {
      const isFromSpecifier = previousKind === SyntaxKind.FromKeyword;
      const isSideEffectImport = previousKind === SyntaxKind.ImportKeyword;
      const isImportTypeOrCall =
        previousKind === SyntaxKind.OpenParenToken &&
        previousPreviousKind === SyntaxKind.ImportKeyword;
      const isRequireCall =
        previousKind === SyntaxKind.OpenParenToken &&
        previousPreviousKind === SyntaxKind.RequireKeyword;

      if (isFromSpecifier || isSideEffectImport || isImportTypeOrCall || isRequireCall) {
        occurrences.push({
          specifier: scanner.getTokenValue(),
          quoteStart: scanner.getTokenStart(),
          quoteEnd: scanner.getTokenEnd(),
        });
      }
    }

    previousPreviousKind = previousKind;
    previousKind = kind;
  }

  return occurrences;
};

export const normalizeRelativeSpecifier = (declarationFile: string, specifier: string): string => {
  const posixSpecifier = toPosixSpecifier(specifier);
  if (!isRelativeModuleSpecifier(posixSpecifier)) return posixSpecifier;

  const fromDir = dirname(declarationFile);
  const knownExtension = matchingKnownExtension(posixSpecifier);
  const candidates = declarationCandidatesForSpecifier(fromDir, posixSpecifier, knownExtension);
  const resolvedDeclaration = candidates.find(isFile);

  if (knownExtension) {
    if (!resolvedDeclaration) {
      throw new UnresolvableDeclarationSpecifierError(declarationFile, specifier);
    }
    return posixSpecifier;
  }

  const absolutePath = resolve(fromDir, posixSpecifier);
  if (isFile(`${absolutePath}.d.ts`)) return appendJsExtension(posixSpecifier);
  if (isFile(join(absolutePath, 'index.d.ts'))) return appendIndexJs(posixSpecifier);

  throw new UnresolvableDeclarationSpecifierError(declarationFile, specifier);
};

export const rewriteDeclarationText = (declarationFile: string, text: string): string => {
  const occurrences = collectModuleSpecifierOccurrences(text);
  if (occurrences.length === 0) return text;

  let nextText = text;
  for (const occurrence of [...occurrences].sort(
    (left, right) => right.quoteStart - left.quoteStart,
  )) {
    const normalized = normalizeRelativeSpecifier(declarationFile, occurrence.specifier);
    if (normalized === occurrence.specifier) continue;
    const quote = nextText[occurrence.quoteStart];
    nextText =
      nextText.slice(0, occurrence.quoteStart) +
      `${quote}${normalized}${quote}` +
      nextText.slice(occurrence.quoteEnd);
  }

  return nextText;
};

export const collectDeclarationFiles = (directory: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'typecheck') continue;
      files.push(...collectDeclarationFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.d.ts')) files.push(fullPath);
  }
  return files.sort();
};

export const rewriteDeclarationDirectory = (directory: string): RewriteResult => {
  const files = collectDeclarationFiles(directory);
  const updates: Array<{ file: string; content: string }> = [];

  for (const file of files) {
    const original = readFileSync(file, 'utf8');
    const next = rewriteDeclarationText(file, original);
    if (next !== original) updates.push({ file, content: next });
  }

  for (const update of updates) {
    writeFileSync(update.file, update.content);
  }

  return { filesScanned: files.length, filesChanged: updates.length };
};

const isExecutedAsCli = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === resolve(fileURLToPath(import.meta.url));
};

const main = (): void => {
  const distDir = resolve(
    process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'),
  );
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    throw new Error(`Declaration directory not found: ${distDir}`);
  }

  const result = rewriteDeclarationDirectory(distDir);
  console.log(
    `Normalized ${result.filesChanged} of ${result.filesScanned} declaration files in ${distDir}`,
  );
};

if (isExecutedAsCli()) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
