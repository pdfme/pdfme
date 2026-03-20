import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playgroundRoot = path.resolve(__dirname, '..');

const trackedSpecifiers = [
  '@pdfme/common',
  '@pdfme/converter',
  '@pdfme/generator',
  '@pdfme/manipulator',
  '@pdfme/schemas',
  '@pdfme/schemas/utils',
  '@pdfme/ui',
];

const trackedDirs = ['src', 'scripts', 'e2e', 'node-playground'];
const trackedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json']);
const forbiddenSegments = ['/src/', '/cjs/src/', '/esm/src/', '/dist/cjs/src/', '/dist/esm/src/'];
const forbiddenImportPatterns = [
  /['"]@pdfme\/[^'"]+\/dist\//,
  /['"]@pdfme\/[^'"]+\/cjs\//,
  /['"]@pdfme\/[^'"]+\/esm\//,
  /['"]@pdfme\/[^'"]+\/src\//,
];

function collectFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    if (!trackedExtensions.has(path.extname(entry.name))) {
      return [];
    }
    return [fullPath];
  });
}

const filesToCheck = trackedDirs.flatMap((dir) => collectFiles(path.join(playgroundRoot, dir)));
const importViolations = filesToCheck.flatMap((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return forbiddenImportPatterns.flatMap((pattern) => {
    if (!pattern.test(content)) {
      return [];
    }
    return [path.relative(playgroundRoot, filePath)];
  });
});

if (importViolations.length > 0) {
  console.error('Found legacy @pdfme deep imports in playground files:');
  for (const filePath of [...new Set(importViolations)]) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

for (const specifier of trackedSpecifiers) {
  const resolved = await import.meta.resolve(specifier);
  const resolvedPath = new URL(resolved).pathname;
  if (!resolvedPath.includes('/dist/')) {
    console.error(`${specifier} did not resolve to a dist export: ${resolved}`);
    process.exit(1);
  }
  if (forbiddenSegments.some((segment) => resolvedPath.includes(segment))) {
    console.error(`${specifier} resolved to a legacy internal path: ${resolved}`);
    process.exit(1);
  }
}

console.log('Verified playground @pdfme imports and package exports.');
