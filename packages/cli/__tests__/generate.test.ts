import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from '@pdfme/pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp-generate');

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

describe('generate command', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('resolves template basePdf paths relative to the job file', async () => {
    const workDir = join(TMP, 'relative-base');
    mkdirSync(workDir, { recursive: true });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText('Base PDF');
    writeFileSync(join(workDir, 'base.pdf'), await pdfDoc.save());

    const outputPath = join(workDir, 'out.pdf');
    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: './base.pdf',
          schemas: [[
            {
              name: 'title',
              type: 'text',
              position: { x: 20, y: 20 },
              width: 80,
              height: 10,
            },
          ]],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json']);
    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.pdf).toBe(outputPath);
    expect(parsed.pages).toBe(1);
  });

  it('fails with a validation error instead of crashing on invalid input', () => {
    const jobPath = join(TMP, 'invalid-job.json');
    writeFileSync(
      jobPath,
      JSON.stringify({
        template: { basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] } },
        inputs: {},
      }),
    );

    const result = runCli(['generate', jobPath]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error: Invalid generation input.');
    expect(result.stderr).toContain('Invalid argument');
    expect(result.stderr).not.toContain('TypeError');
  });

  it('writes actual jpeg bytes when grid output is requested in jpeg mode', () => {
    const workDir = join(TMP, 'grid-jpeg');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
          schemas: [[
            {
              name: 'title',
              type: 'text',
              position: { x: 20, y: 20 },
              width: 100,
              height: 10,
            },
          ]],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--grid',
      '--imageFormat',
      'jpeg',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const output = readFileSync(join(workDir, 'out-1.jpg'));
    expect(output[0]).toBe(0xff);
    expect(output[1]).toBe(0xd8);
    expect(output[2]).toBe(0xff);
  });
});
