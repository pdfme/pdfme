import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp-doctor');

function runCli(
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      timeout: 30000,
      cwd: options.cwd,
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

describe('doctor command', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('reports environment health as structured JSON', () => {
    const result = runCli(['doctor', '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('environment');
    expect(parsed.healthy).toBe(true);
    expect(parsed.environment.nodeVersion).toMatch(/^v/);
    expect(parsed.environment.cliVersion).toBeTruthy();
    expect(parsed.environment.cwd.path).toBeTruthy();
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });

  it('supports verbose output without polluting JSON stdout', () => {
    const file = join(TMP, 'doctor-verbose.json');
    writeFileSync(
      file,
      JSON.stringify({
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
      }),
    );

    const result = spawnSync('node', [CLI, 'doctor', file, '-v', '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('doctor');
    expect(parsed.templatePageCount).toBe(1);
    expect(parsed.fieldCount).toBe(1);
    expect(parsed.target).toBe('input');
    expect(parsed.validation).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(result.stderr).toContain('Target: input');
    expect(result.stderr).toContain(`Input: ${file}`);
    expect(result.stderr).toContain('Mode: template');
    expect(result.stderr).toContain('Template pages: 1');
  });

  it('rejects removed imageFormat option even for environment-only doctor runs', () => {
    const result = runCli(['doctor', '--imageFormat', 'gif', '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('--imageFormat');
  });

  it('reports basePdf and missing-font issues without crashing', () => {
    const file = join(TMP, 'doctor-missing-assets.json');
    writeFileSync(
      file,
      JSON.stringify({
        basePdf: './missing.pdf',
        schemas: [
          [
            {
              name: 'title',
              type: 'text',
              fontName: 'NotoSerifJP',
              position: { x: 20, y: 20 },
              width: 170,
              height: 15,
            },
          ],
        ],
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('input');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.basePdf.kind).toBe('pdfPath');
    expect(parsed.diagnosis.basePdf.exists).toBe(false);
    expect(parsed.diagnosis.fonts.missingFonts).toEqual(['NotoSerifJP']);
    expect(parsed.issues).toContain(
      `Template references font(s) that are not available by default: NotoSerifJP. Provide them via generate --font or unified job options.font.`,
    );
    expect(parsed.issues.some((issue: string) => issue.includes('Base PDF file not found'))).toBe(
      true,
    );
  });

  it('returns field-level input hints for asset-like strings, barcode strings, table, date/time, select, checkbox, circleMark, radioGroup, and multiVariableText discovery', () => {
    const file = join(TMP, 'doctor-input-hints.json');
    writeFileSync(
      file,
      JSON.stringify({
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
            {
              name: 'invoiceMeta',
              type: 'multiVariableText',
              text: 'Invoice {inv}',
              variables: ['inv'],
              required: true,
              position: { x: 20, y: 45 },
              width: 170,
              height: 15,
            },
            {
              name: 'status',
              type: 'select',
              options: ['draft', 'sent'],
              position: { x: 20, y: 70 },
              width: 170,
              height: 15,
            },
            {
              name: 'approved',
              type: 'checkbox',
              position: { x: 20, y: 95 },
              width: 10,
              height: 10,
            },
            {
              name: 'applicableItem',
              type: 'circleMark',
              position: { x: 35, y: 95 },
              width: 10,
              height: 10,
            },
            {
              name: 'logo',
              type: 'image',
              position: { x: 20, y: 105 },
              width: 20,
              height: 20,
            },
            {
              name: 'signedByCustomer',
              type: 'signature',
              position: { x: 45, y: 105 },
              width: 30,
              height: 20,
            },
            {
              name: 'brandMark',
              type: 'svg',
              position: { x: 80, y: 105 },
              width: 20,
              height: 20,
            },
            {
              name: 'orderCode',
              type: 'qrcode',
              position: { x: 105, y: 105 },
              width: 20,
              height: 20,
            },
            {
              name: 'productEan',
              type: 'ean13',
              position: { x: 130, y: 105 },
              width: 30,
              height: 20,
            },
            {
              name: 'lineItems',
              type: 'table',
              head: ['Item', 'Qty', 'Price'],
              headWidthPercentages: [50, 20, 30],
              position: { x: 20, y: 145 },
              width: 120,
              height: 20,
            },
            {
              name: 'dueDate',
              type: 'date',
              format: 'dd/MM/yyyy',
              position: { x: 20, y: 175 },
              width: 30,
              height: 10,
            },
            {
              name: 'appointmentTime',
              type: 'time',
              format: 'HH:mm',
              position: { x: 55, y: 175 },
              width: 20,
              height: 10,
            },
            {
              name: 'publishedAt',
              type: 'dateTime',
              format: 'dd/MM/yyyy HH:mm',
              position: { x: 80, y: 175 },
              width: 50,
              height: 10,
            },
            {
              name: 'choiceA',
              type: 'radioGroup',
              group: 'choices',
              position: { x: 20, y: 185 },
              width: 10,
              height: 10,
            },
            {
              name: 'choiceB',
              type: 'radioGroup',
              group: 'choices',
              position: { x: 40, y: 185 },
              width: 10,
              height: 10,
            },
          ],
        ],
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(true);
    expect(parsed.inputHints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'title',
          type: 'text',
          expectedInput: {
            kind: 'string',
          },
        }),
        expect.objectContaining({
          name: 'invoiceMeta',
          type: 'multiVariableText',
          required: true,
          expectedInput: {
            kind: 'jsonStringObject',
            variableNames: ['inv'],
            example: '{"inv":"INV"}',
          },
        }),
        expect.objectContaining({
          name: 'status',
          type: 'select',
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['draft', 'sent'],
            example: 'draft',
          },
        }),
        expect.objectContaining({
          name: 'approved',
          type: 'checkbox',
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['false', 'true'],
            example: 'true',
          },
        }),
        expect.objectContaining({
          name: 'applicableItem',
          type: 'circleMark',
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['false', 'true'],
            example: 'true',
          },
        }),
        expect.objectContaining({
          name: 'logo',
          type: 'image',
          expectedInput: {
            kind: 'string',
            contentKind: 'imageDataUrl',
          },
        }),
        expect.objectContaining({
          name: 'signedByCustomer',
          type: 'signature',
          expectedInput: {
            kind: 'string',
            contentKind: 'signatureImageDataUrl',
          },
        }),
        expect.objectContaining({
          name: 'brandMark',
          type: 'svg',
          expectedInput: {
            kind: 'string',
            contentKind: 'svgMarkup',
          },
        }),
        expect.objectContaining({
          name: 'orderCode',
          type: 'qrcode',
          expectedInput: {
            kind: 'string',
            contentKind: 'barcodeText',
            rule: 'Any non-empty string up to 499 characters.',
          },
        }),
        expect.objectContaining({
          name: 'productEan',
          type: 'ean13',
          expectedInput: {
            kind: 'string',
            contentKind: 'barcodeText',
            rule: '12 or 13 digits; if 13 digits are provided, the final check digit must be valid.',
          },
        }),
        expect.objectContaining({
          name: 'lineItems',
          type: 'table',
          expectedInput: {
            kind: 'stringMatrix',
            columnCount: 3,
            columnHeaders: ['Item', 'Qty', 'Price'],
            example: [['Item value', 'Qty value', 'Price value']],
            acceptsJsonString: true,
          },
        }),
        expect.objectContaining({
          name: 'dueDate',
          type: 'date',
          expectedInput: {
            kind: 'string',
            format: 'dd/MM/yyyy',
            canonicalFormat: 'yyyy/MM/dd',
            example: '2026/03/28',
          },
        }),
        expect.objectContaining({
          name: 'appointmentTime',
          type: 'time',
          expectedInput: {
            kind: 'string',
            format: 'HH:mm',
            canonicalFormat: 'HH:mm',
            example: '14:30',
          },
        }),
        expect.objectContaining({
          name: 'publishedAt',
          type: 'dateTime',
          expectedInput: {
            kind: 'string',
            format: 'dd/MM/yyyy HH:mm',
            canonicalFormat: 'yyyy/MM/dd HH:mm',
            example: '2026/03/28 14:30',
          },
        }),
        expect.objectContaining({
          name: 'choiceA',
          type: 'radioGroup',
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['false', 'true'],
            example: 'true',
            groupName: 'choices',
            groupMemberNames: ['choiceA', 'choiceB'],
          },
        }),
      ]),
    );
  });

  it('marks unified jobs unhealthy when multiVariableText input uses a plain string', () => {
    const file = join(TMP, 'doctor-invalid-mvt-job.json');
    writeFileSync(
      file,
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ invoiceMeta: 'INV-001' }],
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "invoiceMeta" (multiVariableText)')]),
    );
  });

  it('marks unified jobs unhealthy when checkbox input uses a boolean', () => {
    const file = join(TMP, 'doctor-invalid-checkbox-job.json');
    writeFileSync(
      file,
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

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "approved" (checkbox)')]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('expects one of: "false", "true"')]),
    );
  });

  it('marks unified jobs unhealthy when dateTime input is not valid canonical stored content', () => {
    const file = join(TMP, 'doctor-invalid-date-time-job.json');
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'publishedAt',
                type: 'dateTime',
                format: 'dd/MM/yyyy HH:mm',
                position: { x: 20, y: 20 },
                width: 40,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ publishedAt: '2026/02/30 14:30' }],
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "publishedAt" (dateTime)')]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('expects canonical stored content in format yyyy/MM/dd HH:mm'),
      ]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Display format hint: dd/MM/yyyy HH:mm.')]),
    );
  });

  it('marks unified jobs unhealthy when dateTime input falls into a DST gap under renderer parsing semantics', () => {
    const file = join(TMP, 'doctor-invalid-date-time-dst-gap-job.json');
    writeFileSync(
      file,
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

    const result = runCli(['doctor', file, '--json'], {
      env: { ...process.env, TZ: 'America/New_York' },
    });

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "publishedAt" (dateTime)')]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('expects canonical stored content in format yyyy/MM/dd HH:mm'),
      ]),
    );
  });

  it('marks unified jobs unhealthy when table input contains a non-string cell', () => {
    const file = join(TMP, 'doctor-invalid-table-job.json');
    writeFileSync(
      file,
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
        inputs: [{ lineItems: [['Paper', 2]] }],
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "lineItems" (table)')]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cell [1, 2] must be a string. Received number 2.'),
      ]),
    );
  });

  it('marks unified jobs unhealthy when radioGroup sets multiple fields in the same group to true', () => {
    const file = join(TMP, 'doctor-invalid-radio-group-job.json');
    writeFileSync(
      file,
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

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(false);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Radio group "choices"')]),
    );
    expect(parsed.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('choiceA, choiceB')]),
    );
  });

  it('treats a job with explicit fonts as healthy', () => {
    const file = join(TMP, 'doctor-job.json');
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'NotoSerifJP',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            NotoSerifJP: {
              data: 'https://fonts.example.com/NotoSerifJP.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.healthy).toBe(true);
    expect(parsed.mode).toBe('job');
    expect(parsed.validation.valid).toBe(true);
    expect(parsed.diagnosis.fonts.explicitFonts).toEqual(['NotoSerifJP']);
    expect(parsed.diagnosis.fonts.effectiveFonts).toEqual(['NotoSerifJP', 'Roboto']);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'NotoSerifJP',
          kind: 'url',
          supportedFormat: true,
          needsNetwork: true,
        }),
      ]),
    );
    expect(parsed.issues).toEqual([]);
  });

  it('classifies direct Google Fonts asset URLs as supported remote font sources', () => {
    const workDir = join(TMP, 'doctor-google-font-asset');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.templatePageCount).toBe(1);
    expect(parsed.fieldCount).toBe(1);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'PinyonScript',
          kind: 'url',
          provider: 'googleFontsAsset',
          supportedFormat: true,
          needsNetwork: true,
        }),
      ]),
    );
  });

  it('classifies data URI font sources without treating them as runtime issues', () => {
    const workDir = join(TMP, 'doctor-font-data-uri');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandTtf',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            BrandTtf: {
              data: 'data:font/ttf;base64,AAEAAA==',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'BrandTtf',
          kind: 'dataUri',
          supportedFormat: true,
          needsNetwork: false,
          mediaType: 'font/ttf',
        }),
      ]),
    );
  });

  it('treats unsafe font URLs as blocking issues', () => {
    const workDir = join(TMP, 'doctor-font-unsafe-url');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'UnsafeFont',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            UnsafeFont: {
              data: 'http://127.0.0.1/font.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'UnsafeFont',
          kind: 'url',
          supportedFormat: true,
          needsNetwork: true,
          url: 'http://127.0.0.1/font.ttf',
        }),
      ]),
    );
    expect(parsed.issues).toContain(
      'Font URL for UnsafeFont is invalid or unsafe. Only http: and https: URLs pointing to public hosts are allowed.',
    );
  });

  it('rejects Google Fonts stylesheet API URLs as blocking issues', () => {
    const workDir = join(TMP, 'doctor-google-font-stylesheet');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            PinyonScript: {
              data: 'https://fonts.googleapis.com/css2?family=Pinyon+Script',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'PinyonScript',
          kind: 'url',
          provider: 'googleFontsStylesheet',
          url: 'https://fonts.googleapis.com/css2?family=Pinyon+Script',
          needsNetwork: true,
        }),
      ]),
    );
    expect(parsed.issues).toContain(
      'Font URL for PinyonScript uses the unsupported Google Fonts stylesheet API. Use the direct fonts.gstatic.com asset URL or download the font locally.',
    );
  });

  it('rejects file and ftp font URL protocols as blocking issues', () => {
    const workDir = join(TMP, 'doctor-font-unsupported-protocols');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'LocalFileFont',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            LocalFileFont: {
              data: 'file:///tmp/LocalFileFont.ttf',
            },
            FtpFont: {
              data: 'ftp://fonts.example.com/FtpFont.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'LocalFileFont',
          kind: 'invalid',
          dataType: 'string',
        }),
        expect.objectContaining({
          fontName: 'FtpFont',
          kind: 'invalid',
          dataType: 'string',
        }),
      ]),
    );
    expect(parsed.issues).toContain(
      'Font source for LocalFileFont uses unsupported URL protocol "file:". Use a local .ttf path, a data URI, or an https URL.',
    );
    expect(parsed.issues).toContain(
      'Font source for FtpFont uses unsupported URL protocol "ftp:". Use a local .ttf path, a data URI, or an https URL.',
    );
  });

  it('warns when a data URI font source does not clearly advertise a ttf media type', () => {
    const workDir = join(TMP, 'doctor-font-ambiguous-data-uri');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandBytes',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            BrandBytes: {
              data: 'data:application/octet-stream;base64,AAEAAA==',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'BrandBytes',
          kind: 'dataUri',
          mediaType: 'application/octet-stream',
          formatHint: null,
          needsNetwork: false,
        }),
      ]),
    );
    expect(parsed.issues).toEqual([]);
    expect(parsed.warnings).toContain(
      'Font data URI for BrandBytes does not clearly advertise a .ttf format. @pdfme/cli currently guarantees only .ttf custom fonts.',
    );
  });

  it('warns instead of failing for public font URLs without an extension', () => {
    const workDir = join(TMP, 'doctor-font-extensionless-url');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandUrl',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            BrandUrl: {
              data: 'https://fonts.example.com/pinyonscript',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'BrandUrl',
          kind: 'url',
          url: 'https://fonts.example.com/pinyonscript',
          formatHint: null,
          needsNetwork: true,
        }),
      ]),
    );
    expect(parsed.issues).toEqual([]);
    expect(parsed.warnings).toContain(
      'Font URL for BrandUrl does not clearly advertise a .ttf format. @pdfme/cli currently guarantees only .ttf custom fonts.',
    );
  });

  it('fails when CJK auto-font needs a non-writable empty cache', () => {
    const homeDir = join(TMP, 'readonly-home');
    const file = join(TMP, 'doctor-cjk-job.json');
    rmSync(homeDir, { recursive: true, force: true });
    mkdirSync(homeDir, { recursive: true });

    writeFileSync(
      file,
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
        inputs: [{ title: 'こんにちは' }],
      }),
    );

    chmodSync(homeDir, 0o555);

    try {
      const result = runCli(['doctor', file, '--json'], {
        env: { ...process.env, HOME: homeDir },
      });

      expect(result.exitCode).toBe(1);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(true);
      expect(parsed.healthy).toBe(false);
      expect(parsed.diagnosis.fonts.autoNotoSansJP.needed).toBe(true);
      expect(parsed.diagnosis.fonts.autoNotoSansJP.cached).toBe(false);
      expect(
        parsed.issues.some((issue: string) =>
          issue.includes('font cache directory is not writable'),
        ),
      ).toBe(true);
    } finally {
      chmodSync(homeDir, 0o755);
    }
  });

  it('diagnoses local font sources and rejects unsupported formats', () => {
    const workDir = join(TMP, 'doctor-font-sources');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, 'BrandTtf.ttf'), 'fake-ttf');
    writeFileSync(join(workDir, 'BrandOtf.otf'), 'fake-otf');

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandTtf',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
              {
                name: 'subtitle',
                type: 'text',
                fontName: 'BrandOtf',
                position: { x: 20, y: 45 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello', subtitle: 'World' }],
        options: {
          font: {
            BrandTtf: {
              data: './BrandTtf.ttf',
            },
            BrandOtf: {
              data: './BrandOtf.otf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.fonts.requiredFonts).toEqual(['BrandOtf', 'BrandTtf']);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'BrandTtf',
          kind: 'localPath',
          exists: true,
          supportedFormat: true,
          formatHint: 'ttf',
        }),
        expect.objectContaining({
          fontName: 'BrandOtf',
          kind: 'localPath',
          exists: true,
          supportedFormat: false,
          formatHint: 'otf',
        }),
      ]),
    );
    expect(parsed.issues.some((issue: string) => issue.includes('uses .otf'))).toBe(true);
  });

  it('focuses on font issues without failing on basePdf path problems', () => {
    const workDir = join(TMP, 'doctor-font-only');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, 'BrandTtf.ttf'), 'fake-ttf');

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: './missing.pdf',
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandTtf',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            BrandTtf: {
              data: './BrandTtf.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(['doctor', 'fonts', file, '--json']);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.issues).toEqual([]);
    expect(parsed.diagnosis.fonts.explicitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontName: 'BrandTtf',
          kind: 'localPath',
          exists: true,
          supportedFormat: true,
        }),
      ]),
    );
  });

  it('reports implicit default output collisions as blocking runtime issues', () => {
    const workDir = join(TMP, 'doctor-runtime-default-output');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, 'output.pdf'), 'existing-pdf');
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
      }),
    );

    const result = runCli(['doctor', 'job.json', '--json'], { cwd: workDir });

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('input');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.runtime.output.implicitDefaultProtected).toBe(true);
    expect(parsed.issues).toContain(
      `Refusing to overwrite implicit default output file: ${join(workDir, 'output.pdf')}. Use -o to choose an explicit path or --force to overwrite.`,
    );
  });

  it('reports explicit output and image paths in runtime diagnosis', () => {
    const workDir = join(TMP, 'doctor-runtime-explicit-output');
    const file = join(workDir, 'job.json');
    const outputPath = join(workDir, 'artifacts', 'out.pdf');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
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
        inputs: [{ title: 'One' }, { title: 'Two' }],
      }),
    );

    const result = runCli([
      'doctor',
      file,
      '-o',
      outputPath,
      '--image',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('input');
    expect(parsed.healthy).toBe(true);
    expect(parsed.diagnosis.runtime.estimatedPages).toBe(2);
    expect(parsed.diagnosis.runtime.output).toEqual(
      expect.objectContaining({
        path: outputPath,
        resolvedPath: outputPath,
        writable: true,
        implicitDefaultProtected: false,
      }),
    );
    expect(parsed.diagnosis.runtime.imageOutputs).toEqual({
      enabled: true,
      format: 'png',
      directory: join(workDir, 'artifacts'),
      paths: [join(workDir, 'artifacts', 'out-1.png'), join(workDir, 'artifacts', 'out-2.png')],
    });
  });

  it('reports non-writable explicit output directories as blocking runtime issues', () => {
    const workDir = join(TMP, 'doctor-runtime-readonly-output');
    const file = join(workDir, 'job.json');
    const readonlyDir = join(workDir, 'readonly');
    const outputPath = join(readonlyDir, 'out.pdf');
    mkdirSync(readonlyDir, { recursive: true });

    writeFileSync(
      file,
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

    chmodSync(readonlyDir, 0o555);

    try {
      const result = runCli(['doctor', file, '-o', outputPath, '--json']);

      expect(result.exitCode).toBe(1);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(true);
      expect(parsed.target).toBe('input');
      expect(parsed.healthy).toBe(false);
      expect(parsed.diagnosis.runtime.output).toEqual(
        expect.objectContaining({
          path: outputPath,
          resolvedPath: outputPath,
          writable: false,
          checkedPath: readonlyDir,
          checkedType: 'directory',
          implicitDefaultProtected: false,
        }),
      );
      expect(parsed.issues).toContain(
        `Output directory is not writable for ${outputPath}: ${readonlyDir}.`,
      );
    } finally {
      chmodSync(readonlyDir, 0o755);
    }
  });

  it('reports parent path segments that are files as blocking runtime issues', () => {
    const workDir = join(TMP, 'doctor-runtime-parent-is-file');
    const file = join(workDir, 'job.json');
    const blockedPath = join(workDir, 'blocked');
    const outputPath = join(blockedPath, 'out.pdf');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(blockedPath, 'not-a-directory');

    writeFileSync(
      file,
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

    const result = runCli(['doctor', file, '-o', outputPath, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('input');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.runtime.output).toEqual(
      expect.objectContaining({
        path: outputPath,
        resolvedPath: outputPath,
        checkedPath: blockedPath,
        checkedType: 'file',
        implicitDefaultProtected: false,
      }),
    );
    expect(parsed.issues).toContain(
      `Output directory cannot be created because an existing path segment is not a directory: ${blockedPath}.`,
    );
  });

  it('reports existing directories passed as output paths as blocking runtime issues', () => {
    const workDir = join(TMP, 'doctor-runtime-output-is-directory');
    const file = join(workDir, 'job.json');
    const outputDir = join(workDir, 'artifacts');
    mkdirSync(outputDir, { recursive: true });

    writeFileSync(
      file,
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

    const result = runCli(['doctor', file, '-o', outputDir, '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('input');
    expect(parsed.healthy).toBe(false);
    expect(parsed.diagnosis.runtime.output).toEqual(
      expect.objectContaining({
        path: outputDir,
        resolvedPath: outputDir,
        exists: true,
        existingType: 'directory',
        implicitDefaultProtected: false,
      }),
    );
    expect(parsed.issues).toContain(
      `Output path points to a directory: ${outputDir}. Choose a file path like out.pdf.`,
    );
  });

  it('ignores runtime flags for doctor fonts health checks', () => {
    const workDir = join(TMP, 'doctor-fonts-ignore-runtime');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, 'BrandTtf.ttf'), 'fake-ttf');
    writeFileSync(join(workDir, 'output.pdf'), 'existing-pdf');

    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'title',
                type: 'text',
                fontName: 'BrandTtf',
                position: { x: 20, y: 20 },
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ title: 'Hello' }],
        options: {
          font: {
            BrandTtf: {
              data: './BrandTtf.ttf',
            },
          },
        },
      }),
    );

    const result = runCli(
      [
        'doctor',
        'fonts',
        'job.json',
        '-o',
        'output.pdf',
        '--image',
        '--json',
      ],
      { cwd: workDir },
    );

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.target).toBe('fonts');
    expect(parsed.healthy).toBe(true);
    expect(parsed.issues).toEqual([]);
  });

  it('rejects removed imageFormat option for doctor fonts as an argument error', () => {
    const workDir = join(TMP, 'doctor-fonts-invalid-image-format');
    const file = join(workDir, 'job.json');
    mkdirSync(workDir, { recursive: true });

    writeFileSync(
      file,
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

    const result = runCli(['doctor', 'fonts', file, '--imageFormat', 'gif', '--json']);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('--imageFormat');
  });
});
