import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from '@pdfme/pdf-lib';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const OFFLINE_PRELOAD = pathToFileURL(join(__dirname, 'fixtures', 'offline-fetch-loader.mjs')).href;
const FAILING_PRELOAD = pathToFileURL(join(__dirname, 'fixtures', 'failing-fetch-loader.mjs')).href;
const FIXTURE_PRELOAD = pathToFileURL(join(__dirname, 'fixtures', 'fetch-fixture-loader.mjs')).href;
const TMP = join(__dirname, '..', '.test-tmp-generate');
const FONT_FIXTURES_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'generator',
  '__tests__',
  'assets',
  'fonts',
);

function runCli(
  args: string[],
  options: { env?: NodeJS.ProcessEnv; preload?: string } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const nodeArgs = options.preload ? ['--import', options.preload, CLI, ...args] : [CLI, ...args];
    const stdout = execFileSync('node', nodeArgs, {
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

function createFixtureEnv(rootDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: join(rootDir, 'home'),
    PDFME_TEST_FONT_FIXTURES_DIR: FONT_FIXTURES_DIR,
  };
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
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                position: { x: 20, y: 20 },
                width: 80,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json']);
    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe('generate');
    expect(parsed.outputPath).toBe(outputPath);
    expect(parsed.pageCount).toBe(1);
  });

  it('supports verbose output without polluting JSON stdout', () => {
    const workDir = join(TMP, 'verbose-json');
    mkdirSync(workDir, { recursive: true });

    const jobPath = join(workDir, 'job.json');
    const outputPath = join(workDir, 'out.pdf');
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = spawnSync('node', [CLI, 'generate', jobPath, '-o', outputPath, '-v', '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('generate');
    expect(parsed.outputPath).toBe(outputPath);
    expect(result.stderr).toContain(`Input: ${jobPath}`);
    expect(result.stderr).toContain('Mode: job');
    expect(result.stderr).toContain(`Output: ${outputPath}`);
    expect(result.stderr).toContain('Images: disabled');
  });

  it('fails with a validation error instead of crashing on invalid input', () => {
    const jobPath = join(TMP, 'invalid-job.json');
    writeFileSync(
      jobPath,
      JSON.stringify({
        template: { basePdf: a4BasePdf() },
        inputs: {},
      }),
    );

    const result = runCli(['generate', jobPath]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error: Invalid generation input.');
    expect(result.stderr).toContain('Invalid argument');
    expect(result.stderr).not.toContain('TypeError');
  });

  it('writes actual PNG bytes when grid output is requested', () => {
    const workDir = join(TMP, 'grid-png');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
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
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--grid',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const output = readFileSync(join(workDir, 'out-1.png'));
    expect(Array.from(output.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('returns structured JSON for argument validation failures', () => {
    const workDir = join(TMP, 'bad-scale');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
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

    const result = runCli(['generate', join(workDir, 'job.json'), '--scale', 'nope', '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('--scale');
  });

  it('returns structured EVALIDATE for unknown schema types', () => {
    const workDir = join(TMP, 'unknown-type');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'textbox',
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
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('unknown type "textbox"');
  });

  it('returns structured EVALIDATE with multiVariableText input guidance for plain strings', () => {
    const workDir = join(TMP, 'multi-variable-text-plain-string');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'invoiceMeta',
                type: 'multiVariableText',
                text: 'Invoice {inv}',
                variables: ['inv'],
                required: true,
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ invoiceMeta: 'INV-001' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "invoiceMeta" (multiVariableText)');
    expect(parsed.error.message).toContain('expects a JSON string object');
    expect(parsed.error.message).toContain('variables: inv');
    expect(parsed.error.message).toContain('Example: {"inv":"INV"}');
    expect(parsed.error.message).toContain('Received plain string "INV-001"');
  });

  it('returns structured EVALIDATE with table input guidance for plain strings', () => {
    const workDir = join(TMP, 'table-plain-string');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'lineItems',
                type: 'table',
                head: ['Item', 'Qty'],
                headWidthPercentages: [70, 30],
                tableStyles: { borderWidth: 0.3, borderColor: '#000000' },
                headStyles: {
                  fontSize: 10,
                  lineHeight: 1,
                  characterSpacing: 0,
                  fontColor: '#ffffff',
                  backgroundColor: '#2980ba',
                  borderColor: '',
                  borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
                  padding: { top: 5, right: 5, bottom: 5, left: 5 },
                  alignment: 'left',
                  verticalAlignment: 'middle',
                },
                bodyStyles: {
                  fontSize: 10,
                  lineHeight: 1,
                  characterSpacing: 0,
                  fontColor: '#000000',
                  backgroundColor: '',
                  alternateBackgroundColor: '#f5f5f5',
                  borderColor: '#888888',
                  borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
                  padding: { top: 5, right: 5, bottom: 5, left: 5 },
                  alignment: 'left',
                  verticalAlignment: 'middle',
                },
                columnStyles: {},
                position: { x: 20, y: 20 },
                width: 120,
                height: 20,
              },
            ],
          ],
        },
        inputs: [{ lineItems: 'Paper x2' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "lineItems" (table)');
    expect(parsed.error.message).toContain(
      'expects a JSON array of string arrays with 2 cells per row',
    );
    expect(parsed.error.message).toContain('Column headers: Item, Qty.');
    expect(parsed.error.message).toContain('Example: [["Item value","Qty value"]]');
    expect(parsed.error.message).toContain('JSON string input is also accepted for compatibility.');
    expect(parsed.error.message).toContain('Received plain string "Paper x2"');
  });

  it('returns structured EVALIDATE when select input is outside schema options', () => {
    const workDir = join(TMP, 'invalid-select-option');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'status',
                type: 'select',
                options: ['draft', 'sent'],
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ status: 'archived' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "status" (select)');
    expect(parsed.error.message).toContain('expects one of: "draft", "sent"');
    expect(parsed.error.message).toContain('Example: "draft"');
    expect(parsed.error.message).toContain('Received plain string "archived"');
  });

  it('returns structured EVALIDATE when checkbox input uses a boolean', () => {
    const workDir = join(TMP, 'invalid-checkbox-boolean');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'approved',
                type: 'checkbox',
                position: { x: 20, y: 20 },
                width: 10,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ approved: true }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "approved" (checkbox)');
    expect(parsed.error.message).toContain('expects one of: "false", "true"');
    expect(parsed.error.message).toContain('Example: "true"');
    expect(parsed.error.message).toContain('Received boolean');
  });

  it('returns structured EVALIDATE when circleMark input uses a boolean', () => {
    const workDir = join(TMP, 'invalid-circle-mark-boolean');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'applicableItem',
                type: 'circleMark',
                position: { x: 20, y: 20 },
                width: 10,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ applicableItem: true }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "applicableItem" (circleMark)');
    expect(parsed.error.message).toContain('expects one of: "false", "true"');
    expect(parsed.error.message).toContain('Example: "true"');
    expect(parsed.error.message).toContain('Received boolean');
  });

  it('returns structured EVALIDATE when radioGroup sets multiple fields in the same group to true', () => {
    const workDir = join(TMP, 'invalid-radio-group-selection');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'choiceA',
                type: 'radioGroup',
                group: 'choices',
                position: { x: 20, y: 20 },
                width: 10,
                height: 10,
              },
              {
                name: 'choiceB',
                type: 'radioGroup',
                group: 'choices',
                position: { x: 40, y: 20 },
                width: 10,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ choiceA: 'true', choiceB: 'true' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Radio group "choices"');
    expect(parsed.error.message).toContain('choiceA, choiceB');
    expect(parsed.error.message).toContain('at most one "true"');
  });

  it('returns structured EVALIDATE when time input is not valid canonical stored content', () => {
    const workDir = join(TMP, 'invalid-time-canonical-content');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'appointmentTime',
                type: 'time',
                format: 'HH:mm',
                position: { x: 20, y: 20 },
                width: 20,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ appointmentTime: '24:61' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "appointmentTime" (time)');
    expect(parsed.error.message).toContain('expects canonical stored content in format HH:mm');
    expect(parsed.error.message).toContain('Example: "14:30"');
    expect(parsed.error.message).toContain('Received plain string "24:61"');
  });

  it('returns structured EVALIDATE when dateTime input falls into a DST gap under renderer parsing semantics', () => {
    const workDir = join(TMP, 'invalid-date-time-dst-gap');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'publishedAt',
                type: 'dateTime',
                format: 'MM/dd/yyyy HH:mm',
                position: { x: 20, y: 20 },
                width: 40,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ publishedAt: '2026/03/08 02:30' }],
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      { env: { ...process.env, TZ: 'America/New_York' } },
    );

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EVALIDATE');
    expect(parsed.error.message).toContain('Field "publishedAt" (dateTime)');
    expect(parsed.error.message).toContain(
      'expects canonical stored content in format yyyy/MM/dd HH:mm',
    );
    expect(parsed.error.message).toContain('Received plain string "2026/03/08 02:30"');
  });

  it('returns structured EUNSUPPORTED for unsupported custom font formats', () => {
    const workDir = join(TMP, 'unsupported-font-format');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(join(workDir, 'FakeFont.otf'), 'not-a-real-font');
    writeFileSync(
      join(workDir, 'job.json'),
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
      join(workDir, 'job.json'),
      '--font',
      `Fake=${join(workDir, 'FakeFont.otf')}`,
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('Unsupported font format');
  });

  it('resolves local options.font paths relative to the job file', () => {
    const workDir = join(TMP, 'options-font-local-path');
    const fontPath = resolve(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(join(workDir, 'PinyonScript-Regular.ttf'), readFileSync(fontPath));
    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: './PinyonScript-Regular.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json']);

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('supports https ttf URLs in options.font', () => {
    const workDir = join(TMP, 'options-font-url');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json'], {
      preload: FIXTURE_PRELOAD,
      env: createFixtureEnv(workDir),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('returns structured EFONT when a remote font fetch fails without network access', () => {
    const workDir = join(TMP, 'options-font-url-network-failure');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.example.com/network-error.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      {
        preload: FAILING_PRELOAD,
      },
    );

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('Failed to fetch remote font data');
    expect(parsed.error.message).toContain('https://fonts.example.com/network-error.ttf');
    expect(parsed.error.details).toMatchObject({
      fontName: 'PinyonScript',
      url: 'https://fonts.example.com/network-error.ttf',
      provider: 'genericPublic',
    });
    expect(parsed.error.details.timeoutMs).toBe(15000);
    expect(parsed.error.details.maxBytes).toBe(32 * 1024 * 1024);
  });

  it('returns structured EFONT when a remote font URL responds with a non-ok status', () => {
    const workDir = join(TMP, 'options-font-url-http-503');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.example.com/http-503.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      {
        preload: FAILING_PRELOAD,
      },
    );

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('Failed to fetch remote font data');
    expect(parsed.error.message).toContain('https://fonts.example.com/http-503.ttf');
    expect(parsed.error.message).toContain('HTTP 503');
    expect(parsed.error.details).toMatchObject({
      fontName: 'PinyonScript',
      url: 'https://fonts.example.com/http-503.ttf',
      provider: 'genericPublic',
    });
    expect(parsed.error.details.timeoutMs).toBe(15000);
    expect(parsed.error.details.maxBytes).toBe(32 * 1024 * 1024);
  });

  it('returns structured EFONT when a remote font declares an oversized payload', () => {
    const workDir = join(TMP, 'options-font-url-oversized');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.example.com/oversized.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      {
        preload: FAILING_PRELOAD,
      },
    );

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('exceeds the 33554432-byte safety limit');
    expect(parsed.error.details).toMatchObject({
      fontName: 'PinyonScript',
      url: 'https://fonts.example.com/oversized.ttf',
      provider: 'genericPublic',
    });
    expect(parsed.error.details.maxBytes).toBe(32 * 1024 * 1024);
  });

  it('returns structured EFONT when a remote font stream exceeds the safety limit without content-length', () => {
    const workDir = join(TMP, 'options-font-url-oversized-stream');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.example.com/oversized-stream.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      {
        preload: FAILING_PRELOAD,
      },
    );

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('exceeds the 33554432-byte safety limit');
    expect(parsed.error.details).toMatchObject({
      fontName: 'PinyonScript',
      url: 'https://fonts.example.com/oversized-stream.ttf',
      provider: 'genericPublic',
    });
    expect(parsed.error.details.maxBytes).toBe(32 * 1024 * 1024);
  });

  it('returns structured EUNSUPPORTED for Google Fonts stylesheet API URLs', () => {
    const workDir = join(TMP, 'options-font-google-font-stylesheet');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.googleapis.com/css2?family=Pinyon+Script',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('unsupported Google Fonts stylesheet API');
  });

  it('supports data URI ttf sources in options.font', () => {
    const workDir = join(TMP, 'options-font-data-uri');
    const fontData = readFileSync(resolve(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf')).toString(
      'base64',
    );
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: `data:font/ttf;base64,${fontData}`,
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json']);

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('supports data URI font sources with ambiguous media types', () => {
    const workDir = join(TMP, 'options-font-data-uri-ambiguous-media-type');
    const fontData = readFileSync(resolve(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf')).toString(
      'base64',
    );
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: `data:application/octet-stream;base64,${fontData}`,
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json']);

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('supports public font URLs without an extension in options.font', () => {
    const workDir = join(TMP, 'options-font-url-without-extension');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.example.com/pinyonscript',
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli(['generate', join(workDir, 'job.json'), '-o', outputPath, '--json'], {
      preload: FIXTURE_PRELOAD,
      env: createFixtureEnv(workDir),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('returns structured EIO for missing local options.font files', () => {
    const workDir = join(TMP, 'options-font-missing-local');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: './MissingFont.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EIO');
    expect(parsed.error.message).toContain('Font file for PinyonScript not found');
  });

  it('returns structured EUNSUPPORTED for unsupported options.font sources', () => {
    const workDir = join(TMP, 'options-font-unsupported-source');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, 'FakeFont.otf'), 'not-a-real-font');

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: './FakeFont.otf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('.otf');
  });

  it('returns structured EUNSUPPORTED for file URL options.font sources', () => {
    const workDir = join(TMP, 'options-font-file-url');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'file:///tmp/PinyonScript-Regular.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('unsupported URL protocol "file:"');
  });

  it('returns structured EUNSUPPORTED for ftp URL options.font sources', () => {
    const workDir = join(TMP, 'options-font-ftp-url');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'ftp://fonts.example.com/PinyonScript-Regular.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('unsupported URL protocol "ftp:"');
  });

  it('returns structured EUNSUPPORTED for private-host font URLs', () => {
    const workDir = join(TMP, 'options-font-private-host-url');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'http://192.168.10.42/PinyonScript-Regular.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const result = runCli(['generate', join(workDir, 'job.json'), '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EUNSUPPORTED');
    expect(parsed.error.message).toContain('invalid or unsafe');
  });

  it('prefers --font over conflicting options.font entries', () => {
    const workDir = join(TMP, 'font-cli-override-precedence');
    const fontPath = resolve(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'PinyonScript',
                position: { x: 20, y: 20 },
                width: 100,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: './MissingFont.ttf',
              subset: true,
            },
          },
        },
      }),
    );

    const outputPath = join(workDir, 'out.pdf');
    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '--font',
      `PinyonScript=${fontPath}`,
      '-o',
      outputPath,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('returns structured EFONT when CJK text is present and --noAutoFont disables fallback resolution', () => {
    const workDir = join(TMP, 'cjk-no-auto-font');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
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
        inputs: [{ title: 'こんにちは' }],
      }),
    );

    const result = runCli([
      'generate',
      join(workDir, 'job.json'),
      '--noAutoFont',
      '-o',
      join(workDir, 'out.pdf'),
      '--json',
    ]);

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('CJK text detected');
    expect(parsed.error.message).toContain('--noAutoFont');
  });

  it('returns structured EFONT when automatic CJK font download is unavailable', () => {
    const workDir = join(TMP, 'cjk-offline');
    mkdirSync(workDir, { recursive: true });
    mkdirSync(join(workDir, 'home'), { recursive: true });

    writeFileSync(
      join(workDir, 'job.json'),
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
        inputs: [{ title: 'こんにちは' }],
      }),
    );

    const result = runCli(
      ['generate', join(workDir, 'job.json'), '-o', join(workDir, 'out.pdf'), '--json'],
      {
        preload: OFFLINE_PRELOAD,
        env: { ...process.env, HOME: join(workDir, 'home') },
      },
    );

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EFONT');
    expect(parsed.error.message).toContain('could not be resolved automatically');
  });

  it('refuses to overwrite implicit default output.pdf without --force', () => {
    const workDir = join(TMP, 'default-output-safety');
    mkdirSync(workDir, { recursive: true });

    const previousCwd = process.cwd();
    process.chdir(workDir);

    try {
      writeFileSync('output.pdf', 'existing file');
      writeFileSync(
        'job.json',
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

      const result = runCli(['generate', 'job.json', '--json']);
      expect(result.exitCode).toBe(1);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(false);
      expect(parsed.error.message).toContain('Refusing to overwrite implicit default output file');
    } finally {
      process.chdir(previousCwd);
    }
  });
});
