import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collectModuleSpecifierOccurrences,
  normalizeRelativeSpecifier,
  rewriteDeclarationDirectory,
  rewriteDeclarationText,
  UnresolvableDeclarationSpecifierError,
} from '../scripts/rewrite-declaration-specifiers';

const writeTree = (root: string, files: Record<string, string>): void => {
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = join(root, relativePath);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, contents);
  }
};

describe('rewrite-declaration-specifiers', () => {
  const createFixture = (files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), 'pdf-lib-dts-rewrite-'));
    writeTree(root, files);
    return root;
  };

  test('rewrites file specifiers to .js and directory specifiers to /index.js', () => {
    const root = createFixture({
      'index.d.ts': `export * from './api';
export { PDFDocument } from './PDFDocument';
`,
      'api/index.d.ts': 'export const api = 1;\n',
      'PDFDocument.d.ts': 'export class PDFDocument {}\n',
    });

    const rewritten = rewriteDeclarationText(
      join(root, 'index.d.ts'),
      `export * from './api';
export { PDFDocument } from './PDFDocument';
`,
    );

    expect(rewritten).toBe(`export * from './api/index.js';
export { PDFDocument } from './PDFDocument.js';
`);
  });

  test('rewrites import type, export type, and import() type references', () => {
    const root = createFixture({
      'types/index.d.ts': 'export type Value = string;\n',
      'Embeddable.d.ts': 'interface Embeddable {}\nexport default Embeddable;\n',
      'form/index.d.ts': 'export class PDFArray {}\n',
    });

    const source = `import type { Value } from './types';
export type { default as Embeddable } from './Embeddable';
export declare const value: import("./form").PDFArray;
`;
    const rewritten = rewriteDeclarationText(join(root, 'index.d.ts'), source);

    expect(rewritten).toBe(`import type { Value } from './types/index.js';
export type { default as Embeddable } from './Embeddable.js';
export declare const value: import("./form/index.js").PDFArray;
`);
  });

  test('preserves external package specifiers', () => {
    const root = createFixture({
      'index.d.ts': `import { FontNames } from '@pdf-lib/standard-fonts';
import { deflate } from 'pako';
export * from './local';
`,
      'local.d.ts': 'export const local = 1;\n',
    });

    const rewritten = rewriteDeclarationText(
      join(root, 'index.d.ts'),
      `import { FontNames } from '@pdf-lib/standard-fonts';
import { deflate } from 'pako';
export * from './local';
`,
    );

    expect(rewritten).toContain("from '@pdf-lib/standard-fonts'");
    expect(rewritten).toContain("from 'pako'");
    expect(rewritten).toContain("from './local.js'");
  });

  test('does not rewrite comments or non-import string literals', () => {
    const root = createFixture({
      'api/index.d.ts': 'export const api = 1;\n',
    });
    const source = `// export * from './missing'
/* export * from './also-missing' */
export * from './api';
declare const example: './api';
`;
    const occurrences = collectModuleSpecifierOccurrences(source);
    expect(occurrences.map((occurrence) => occurrence.specifier)).toEqual(['./api']);

    const rewritten = rewriteDeclarationText(join(root, 'index.d.ts'), source);
    expect(rewritten).toContain("// export * from './missing'");
    expect(rewritten).toContain("/* export * from './also-missing' */");
    expect(rewritten).toContain("declare const example: './api';");
    expect(rewritten).toContain("export * from './api/index.js';");
  });

  test('preserves template literal text and finds imports inside and after templates', () => {
    const root = createFixture({ 'real.d.ts': 'export type Value = string;\n' });
    const source = [
      'export type Text = `${string} from "./not-a-module"`;',
      'export type Nested = `${`${string} from "./also-not-a-module"`}${keyof { x: string }}${import("./real").Value}`;',
      'export * from "./real";',
    ].join('\n');

    expect(collectModuleSpecifierOccurrences(source).map(({ specifier }) => specifier)).toEqual([
      './real',
      './real',
    ]);
    expect(rewriteDeclarationText(join(root, 'index.d.ts'), source)).toBe(
      source.replaceAll('"./real"', '"./real.js"'),
    );
  });

  test('is idempotent for already-normalized specifiers', () => {
    const root = createFixture({
      'api/index.d.ts': 'export const api = 1;\n',
      'PDFDocument.d.ts': 'export class PDFDocument {}\n',
    });
    const source = `export * from './api/index.js';
export { PDFDocument } from './PDFDocument.js';
`;
    const rewritten = rewriteDeclarationText(join(root, 'index.d.ts'), source);
    expect(rewritten).toBe(source);

    writeTree(root, { 'index.d.ts': source });
    const first = rewriteDeclarationDirectory(root);
    const second = rewriteDeclarationDirectory(root);
    expect(first.filesChanged).toBe(0);
    expect(second.filesChanged).toBe(0);
  });

  test('prefers a file over a same-named directory', () => {
    const root = createFixture({
      'colors.d.ts': 'export const rgb = 1;\n',
      'colors/index.d.ts': 'export const nested = 1;\n',
    });

    expect(normalizeRelativeSpecifier(join(root, 'index.d.ts'), './colors')).toBe('./colors.js');
  });

  test('skips typecheck declaration trees when rewriting a directory', () => {
    const root = createFixture({
      'index.d.ts': "export * from './api';\n",
      'api/index.d.ts': 'export const api = 1;\n',
      'typecheck/src/index.d.ts': "export * from './missing';\n",
    });

    const result = rewriteDeclarationDirectory(root);
    expect(result.filesChanged).toBe(1);
    expect(readFileSync(join(root, 'index.d.ts'), 'utf8')).toContain('./api/index.js');
    expect(readFileSync(join(root, 'typecheck/src/index.d.ts'), 'utf8')).toContain('./missing');
  });

  test('fails on unresolvable relative specifiers', () => {
    const root = createFixture({
      'index.d.ts': "export * from './missing';\n",
    });
    const declarationFile = join(root, 'index.d.ts');

    expect(() => normalizeRelativeSpecifier(declarationFile, './missing')).toThrow(
      UnresolvableDeclarationSpecifierError,
    );
    expect(() => rewriteDeclarationText(declarationFile, "export * from './missing';\n")).toThrow(
      /Unresolvable relative module specifier '\.\/missing' in /,
    );

    try {
      rewriteDeclarationDirectory(root);
      throw new Error('expected rewriteDeclarationDirectory to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(UnresolvableDeclarationSpecifierError);
      expect((error as UnresolvableDeclarationSpecifierError).specifier).toBe('./missing');
      expect((error as UnresolvableDeclarationSpecifierError).declarationFile).toBe(
        declarationFile,
      );
    }
  });

  test('rewrites parent-directory import() specifiers to index.js', () => {
    const root = createFixture({
      'index.d.ts': 'export class PDFOperator {}\n',
      'api/colors.d.ts': 'export declare const setFillingColor: () => import("..").PDFOperator;\n',
    });

    const rewritten = rewriteDeclarationText(
      join(root, 'api/colors.d.ts'),
      'export declare const setFillingColor: () => import("..").PDFOperator;\n',
    );
    expect(rewritten).toBe(
      'export declare const setFillingColor: () => import("../index.js").PDFOperator;\n',
    );
  });
});
