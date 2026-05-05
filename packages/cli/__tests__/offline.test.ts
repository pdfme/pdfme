import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from '@pdfme/pdf-lib';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const OFFLINE_PRELOAD = pathToFileURL(join(__dirname, 'fixtures', 'offline-fetch-loader.mjs')).href;
const TMP = join(__dirname, '..', '.test-tmp-offline');

function runCli(
  args: string[],
  options: { env?: NodeJS.ProcessEnv } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', ['--import', OFFLINE_PRELOAD, CLI, ...args], {
      encoding: 'utf8',
      timeout: 30000,
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

describe('CLI offline local-input contract', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('generates a PDF from local ASCII inputs without network access', () => {
    const workDir = join(TMP, 'generate');
    mkdirSync(workDir, { recursive: true });

    const jobPath = join(workDir, 'job.json');
    const pdfPath = join(workDir, 'out.pdf');
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
        inputs: [{ title: 'Hello offline' }],
      }),
    );

    const result = runCli(['generate', jobPath, '-o', pdfPath, '--json'], {
      env: { ...process.env, HOME: join(workDir, 'home') },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(pdfPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('generate');
    expect(parsed.outputPath).toBe(pdfPath);
  });

  it('validates a local template without network access', () => {
    const workDir = join(TMP, 'validate');
    mkdirSync(workDir, { recursive: true });

    const templatePath = join(workDir, 'template.json');
    writeFileSync(
      templatePath,
      JSON.stringify({
        basePdf: a4BasePdf(),
        schemas: [
          [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 100, height: 10 }],
        ],
      }),
    );

    const result = runCli(['validate', templatePath, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(true);
  });

  it('converts a local PDF to image and page sizes without network access', async () => {
    const workDir = join(TMP, 'pdf-tools');
    mkdirSync(workDir, { recursive: true });

    const pdfPath = join(workDir, 'sample.pdf');
    const outputDir = join(workDir, 'images');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);
    writeFileSync(pdfPath, await pdfDoc.save());

    const pdf2imgResult = runCli(['pdf2img', pdfPath, '-o', outputDir, '--json']);
    expect(pdf2imgResult.exitCode).toBe(0);
    const pdf2imgParsed = JSON.parse(pdf2imgResult.stdout);
    expect(pdf2imgParsed.ok).toBe(true);
    expect(pdf2imgParsed.command).toBe('pdf2img');
    expect(pdf2imgParsed.pages).toHaveLength(1);
    expect(existsSync(join(outputDir, 'sample-1.png'))).toBe(true);

    const pdf2sizeResult = runCli(['pdf2size', pdfPath, '--json']);
    expect(pdf2sizeResult.exitCode).toBe(0);
    const pdf2sizeParsed = JSON.parse(pdf2sizeResult.stdout);
    expect(pdf2sizeParsed.ok).toBe(true);
    expect(pdf2sizeParsed.command).toBe('pdf2size');
    expect(pdf2sizeParsed.pages).toHaveLength(1);
    expect(pdf2sizeParsed.pages[0].pageNumber).toBe(1);
  });
});
