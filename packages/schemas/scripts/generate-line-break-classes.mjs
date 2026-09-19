/**
 * Generates a compact UCD LineBreak range table for the wrap pair engine.
 *
 * Source: Unicode LineBreak.txt (https://www.unicode.org/Public/UCD/latest/ucd/LineBreak.txt)
 * Re-run: node packages/schemas/scripts/generate-line-break-classes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLASS_IDS = {
  OP: 0,
  CL: 1,
  CP: 2,
  QU: 3,
  GL: 4,
  NS: 5,
  EX: 6,
  SY: 7,
  IS: 8,
  PR: 9,
  PO: 10,
  NU: 11,
  AL: 12,
  HL: 13,
  ID: 14,
  IN: 15,
  HY: 16,
  BA: 17,
  BB: 18,
  B2: 19,
  ZW: 20,
  CM: 21,
  WJ: 22,
  H2: 23,
  H3: 24,
  JL: 25,
  JV: 26,
  JT: 27,
  RI: 28,
  EB: 29,
  EM: 30,
  ZWJ: 31,
  CB: 32,
  AI: 33,
  BK: 34,
  CJ: 35,
  CR: 36,
  LF: 37,
  NL: 38,
  SA: 39,
  SG: 40,
  SP: 41,
  XX: 42,
};

// Unicode 15+ classes that the foliojs pair table does not have a column for.
const ALIASES = {
  HH: 'HY',
  AK: 'AL',
  AP: 'AL',
  AS: 'AL',
  VF: 'AL',
  VI: 'AL',
};

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error(
    'Usage: node packages/schemas/scripts/generate-line-break-classes.mjs <LineBreak.txt>',
  );
  process.exit(1);
}

const source = readFileSync(sourcePath, 'utf8');
const ranges = [];

for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const field = line.split('#')[0].trim();
  const [cpField, classField] = field.split(';').map((part) => part.trim());
  if (!cpField || !classField) continue;
  const mapped = ALIASES[classField] ?? classField;
  const classId = CLASS_IDS[mapped];
  if (classId === undefined) {
    throw new Error(`Unknown LineBreak class ${classField} (mapped ${mapped})`);
  }
  const [startText, endText] = cpField.split('..');
  ranges.push([
    Number.parseInt(startText, 16),
    Number.parseInt(endText ?? startText, 16),
    classId,
  ]);
}

ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const merged = [];
for (const range of ranges) {
  const last = merged[merged.length - 1];
  if (last && last[2] === range[2] && range[0] <= last[1] + 1) {
    last[1] = Math.max(last[1], range[1]);
    continue;
  }
  merged.push([...range]);
}

const outPath = resolve(__dirname, '../src/text/lineBreakClasses.generated.ts');
const values = merged.flat();
const lines = [
  '/* eslint-disable */',
  '/**',
  ' * Compact Unicode LineBreak ranges generated from UCD LineBreak.txt.',
  ' * Packed as [start, end, classId, ...]. Lookup is binary search.',
  ' * Do not edit by hand — regenerate with scripts/generate-line-break-classes.mjs.',
  ' */',
  `export const LINE_BREAK_RANGE_DATA = new Uint32Array([${values.join(',')}]);`,
  `export const LINE_BREAK_RANGE_COUNT = ${merged.length};`,
  '',
];

writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${merged.length} ranges to ${outPath}`);
