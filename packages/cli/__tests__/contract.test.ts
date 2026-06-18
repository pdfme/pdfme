import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from '@pdfme/pdf-lib';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp-contract');

function runCli(
  args: string[],
  options: { input?: string; env?: NodeJS.ProcessEnv } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      timeout: 60000,
      input: options.input,
      env: options.env,
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

describe('CLI contract failures', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it.each([
    { name: 'generate', args: ['generate', '--bogus', '--json'] },
    { name: 'validate', args: ['validate', '--bogus', '--json'] },
    { name: 'pdf2img', args: ['pdf2img', '--bogus', '--json'] },
    { name: 'pdf2size', args: ['pdf2size', '--bogus', '--json'] },
  ])('returns structured EARG for unknown flags: $name', ({ args }) => {
    const result = runCli(args);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('Unknown argument');
  });

  it('reports malformed unified job JSON with structured EIO', () => {
    const jobPath = join(TMP, 'malformed-job.json');
    writeFileSync(jobPath, '{"template": ');

    const result = runCli(['generate', jobPath, '-o', join(TMP, 'out.pdf'), '--json']);

    expect(result.exitCode).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EIO');
    expect(parsed.error.message).toContain('Failed to parse JSON file');
  });

  it('reports malformed stdin JSON for validate with structured EIO', () => {
    const result = runCli(['validate', '-', '--json'], {
      input: '{"basePdf": ',
    });

    expect(result.exitCode).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EIO');
    expect(parsed.error.message).toContain('Failed to parse JSON from stdin');
  });

  it('returns structured EARG when generate has no input source', () => {
    const result = runCli(['generate', '-o', join(TMP, 'no-input.pdf'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('No input provided');
  });

  it('rejects removed image format option for generate', () => {
    const jobPath = join(TMP, 'invalid-image-format.json');
    writeFileSync(
      jobPath,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = runCli([
      'generate',
      jobPath,
      '--imageFormat',
      'gif',
      '-o',
      join(TMP, 'invalid-image-format.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('--imageFormat');
  });

  it('rejects pdf2img output paths that are not directories', async () => {
    const pdfPath = join(TMP, 'sample.pdf');
    const outputPath = join(TMP, 'not-a-directory.txt');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);
    writeFileSync(pdfPath, await pdfDoc.save());
    writeFileSync(outputPath, 'existing file');

    const result = runCli(['pdf2img', pdfPath, '-o', outputPath, '--json']);

    expect(result.exitCode).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EIO');
    expect(parsed.error.message).toContain('Output path must be a directory');
  });
});
