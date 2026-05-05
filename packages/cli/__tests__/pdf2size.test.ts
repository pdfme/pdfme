import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from '@pdfme/pdf-lib';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp-pdf2size');

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      timeout: 30000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.status ?? 1,
    };
  }
}

describe('pdf2size command', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('returns page dimensions as structured JSON', async () => {
    const pdfPath = join(TMP, 'sample.pdf');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);
    writeFileSync(pdfPath, await pdfDoc.save());

    const result = runCli(['pdf2size', pdfPath, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('pdf2size');
    expect(parsed.pageCount).toBe(1);
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0].pageNumber).toBe(1);
    expect(parsed.pages[0].width).toBeCloseTo(PAGE_SIZE_PRESETS.A4.width, 0);
    expect(parsed.pages[0].height).toBeCloseTo(PAGE_SIZE_PRESETS.A4.height, 0);
  });

  it('returns structured EIO for missing PDF files', () => {
    const result = runCli(['pdf2size', join(TMP, 'missing.pdf'), '--json']);

    expect(result.exitCode).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EIO');
    expect(parsed.error.message).toContain('PDF file not found');
  });

  it('returns structured EARG when no input PDF is provided', () => {
    const result = runCli(['pdf2size', '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('No input PDF provided');
  });

  it('supports verbose output without polluting JSON stdout', async () => {
    const pdfPath = join(TMP, 'verbose-sample.pdf');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);
    writeFileSync(pdfPath, await pdfDoc.save());

    const result = spawnSync('node', [CLI, 'pdf2size', pdfPath, '-v', '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('pdf2size');
    expect(parsed.pages).toHaveLength(1);
    expect(result.stderr).toContain(`Input: ${pdfPath}`);
    expect(result.stderr).toContain('Pages: 1');
  });
});
