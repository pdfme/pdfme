import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, basename, join, resolve } from 'node:path';

export interface UnifiedJob {
  template: Record<string, unknown>;
  inputs: Record<string, unknown>[];
}

interface LoadedInput {
  template: Record<string, unknown>;
  inputs: Record<string, unknown>[];
  templateDir?: string;
}

export function readJsonFile(filePath: string): unknown {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(3);
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(
      `Error: Failed to parse JSON file: ${filePath}`,
      error instanceof Error ? error.message : '',
    );
    process.exit(3);
  }
}

export function loadInput(args: {
  _: string[];
  template?: string;
  inputs?: string;
}): LoadedInput {
  const positionalFile = args._[0];

  if (positionalFile && !args.template && !args.inputs) {
    const jobFilePath = resolve(positionalFile);
    const data = readJsonFile(jobFilePath) as Record<string, unknown>;
    if ('template' in data && 'inputs' in data) {
      return {
        template: data.template as Record<string, unknown>,
        inputs: data.inputs as Record<string, unknown>[],
        templateDir: dirname(jobFilePath),
      };
    }
    console.error(
      'Error: Positional file must be a unified format with "template" and "inputs" keys.\n' +
        'Use -t and -i flags for separate files, or provide a unified JSON:\n' +
        '  { "template": { "schemas": [...], "basePdf": "..." }, "inputs": [{...}] }',
    );
    process.exit(1);
  }

  if (args.template) {
    if (!args.inputs) {
      console.error('Error: --inputs (-i) is required when using --template (-t).');
      process.exit(1);
    }
    const templatePath = resolve(args.template);
    const template = readJsonFile(templatePath) as Record<string, unknown>;
    const inputs = readJsonFile(resolve(args.inputs)) as Record<string, unknown>[];
    return { template, inputs, templateDir: dirname(templatePath) };
  }

  console.error(
    'Error: No input provided. Use one of:\n' +
      '  pdfme generate job.json              # Unified file\n' +
      '  pdfme generate -t template.json -i inputs.json  # Separate files',
  );
  process.exit(1);
}

export function resolveBasePdf(
  template: Record<string, unknown>,
  basePdfArg: string | undefined,
  templateDir?: string,
): Record<string, unknown> {
  if (basePdfArg) {
    const resolvedBasePdf = resolve(basePdfArg);
    if (!existsSync(resolvedBasePdf)) {
      console.error(`Error: Base PDF file not found: ${resolvedBasePdf}`);
      process.exit(3);
    }
    const pdfData = new Uint8Array(readFileSync(resolvedBasePdf));
    return { ...template, basePdf: pdfData };
  }

  const basePdf = template.basePdf;
  if (typeof basePdf === 'string' && basePdf.endsWith('.pdf') && !basePdf.startsWith('data:')) {
    const resolvedBasePdf = templateDir ? resolve(templateDir, basePdf) : resolve(basePdf);
    if (!existsSync(resolvedBasePdf)) {
      console.error(`Error: Base PDF file not found: ${resolvedBasePdf}`);
      process.exit(3);
    }
    const pdfData = new Uint8Array(readFileSync(resolvedBasePdf));
    return { ...template, basePdf: pdfData };
  }

  return template;
}

export function getImageOutputPaths(
  pdfOutputPath: string,
  pageCount: number,
  imageFormat: string,
): string[] {
  const dir = dirname(pdfOutputPath);
  const base = basename(pdfOutputPath, extname(pdfOutputPath));
  const ext = imageFormat === 'jpeg' ? 'jpg' : 'png';
  return Array.from({ length: pageCount }, (_, i) => join(dir, `${base}-${i + 1}.${ext}`));
}

export function writeOutput(filePath: string, data: Uint8Array | ArrayBuffer): void {
  const dir = dirname(filePath);
  if (dir && dir !== '.' && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, data instanceof ArrayBuffer ? new Uint8Array(data) : data);
}

export function readPdfFile(filePath: string): Uint8Array {
  if (!existsSync(filePath)) {
    console.error(`Error: PDF file not found: ${filePath}`);
    process.exit(3);
  }
  return new Uint8Array(readFileSync(filePath));
}

// Standard paper sizes in mm (portrait)
const PAPER_SIZES: Record<string, [number, number]> = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  B4: [250, 353],
  B5: [176, 250],
  Letter: [216, 279],
  Legal: [216, 356],
  Tabloid: [279, 432],
};

export function detectPaperSize(width: number, height: number): string | null {
  const tolerance = 2; // mm
  for (const [name, [w, h]] of Object.entries(PAPER_SIZES)) {
    if (
      (Math.abs(width - w) <= tolerance && Math.abs(height - h) <= tolerance) ||
      (Math.abs(width - h) <= tolerance && Math.abs(height - w) <= tolerance)
    ) {
      const orientation = width < height ? 'portrait' : 'landscape';
      return `${name} ${orientation}`;
    }
  }
  return null;
}

export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const pages: Set<number> = new Set();
  for (const part of rangeStr.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, Number.parseInt(startStr, 10));
      const end = Math.min(totalPages, Number.parseInt(endStr, 10));
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      const p = Number.parseInt(trimmed, 10);
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
  }
  return [...pages].sort((a, b) => a - b);
}
