import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp');

function runCli(
  args: string[],
  options: { input?: string; env?: NodeJS.ProcessEnv } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      timeout: 30000,
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

describe('validate command', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('validates a valid template', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 }],
      ],
    };
    const file = join(TMP, 'valid.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Template is valid');
    expect(result.stdout).toContain('1 page');
    expect(result.stdout).toContain('1 field');
  });

  it('reports unknown type with suggestion', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'title', type: 'textbox', position: { x: 20, y: 20 }, width: 170, height: 15 }],
      ],
    };
    const file = join(TMP, 'bad-type.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('unknown type "textbox"');
    expect(result.stdout).toContain('Did you mean: text');
  });

  it('warns about out-of-bounds field', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'wide', type: 'text', position: { x: 200, y: 20 }, width: 50, height: 15 }],
      ],
    };
    const file = join(TMP, 'oob.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    // Should pass (warnings don't cause exit 1 by default)
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('extends beyond page width');
  });

  it('--strict fails on warnings', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'wide', type: 'text', position: { x: 200, y: 20 }, width: 50, height: 15 }],
      ],
    };
    const file = join(TMP, 'oob-strict.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--strict']);
    expect(result.exitCode).toBe(1);
  });

  it('--strict --json preserves the validate contract', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'wide', type: 'text', position: { x: 200, y: 20 }, width: 50, height: 15 }],
      ],
    };
    const file = join(TMP, 'oob-strict-json.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--strict', '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.warnings[0]).toContain('extends beyond page width');
    expect(parsed.inspection.schemaTypes).toEqual(['text']);
    expect(parsed.inspection.requiredPlugins).toEqual(['text']);
  });

  it('--json outputs structured result', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 }],
      ],
    };
    const file = join(TMP, 'json-out.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('validate');
    expect(parsed.valid).toBe(true);
    expect(parsed.templatePageCount).toBe(1);
    expect(parsed.fieldCount).toBe(1);
    expect(parsed.inspection).toEqual({
      schemaTypes: ['text'],
      requiredPlugins: ['text'],
      requiredFonts: [],
      basePdf: {
        kind: 'blank',
        width: PAGE_SIZE_PRESETS.A4.width,
        height: PAGE_SIZE_PRESETS.A4.height,
        paperSize: 'A4 portrait',
      },
    });
  });

  it('supports verbose output without polluting JSON stdout', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 }],
      ],
    };
    const file = join(TMP, 'verbose-json.json');
    writeFileSync(file, JSON.stringify(template));

    const result = spawnSync('node', [CLI, 'validate', file, '-v', '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('validate');
    expect(parsed.valid).toBe(true);
    expect(result.stderr).toContain(`Input: ${file}`);
    expect(result.stderr).toContain('Mode: template');
    expect(result.stderr).toContain('Template pages: 1');
    expect(result.stderr).toContain('Warnings: 0');
  });

  it('accepts unified job files', () => {
    const file = join(TMP, 'job.json');
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
            Roboto: {
              data: 'https://fonts.example.com/Roboto.ttf',
              fallback: true,
            },
            NotoSerifJP: {
              data: 'https://fonts.example.com/NotoSerifJP.ttf',
              fallback: false,
            },
          },
        },
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('validate');
    expect(parsed.mode).toBe('job');
    expect(parsed.valid).toBe(true);
    expect(parsed.inputCount).toBe(1);
    expect(parsed.inspection.schemaTypes).toEqual(['text']);
    expect(parsed.inspection.requiredPlugins).toEqual(['text']);
    expect(parsed.inspection.requiredFonts).toEqual(['NotoSerifJP']);
    expect(parsed.inspection.basePdf.kind).toBe('blank');
  });

  it('marks unified jobs invalid when multiVariableText input uses a plain string', () => {
    const file = join(TMP, 'job-invalid-mvt.json');
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

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "invoiceMeta" (multiVariableText)')]),
    );
  });

  it('accepts table input as a nested JSON array', () => {
    const file = join(TMP, 'job-valid-table-array.json');
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
        inputs: [
          {
            lineItems: [
              ['Paper', '2'],
              ['Pen', '1'],
            ],
          },
        ],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(true);
  });

  it('accepts stdin input', () => {
    const result = runCli(['validate', '-', '--json'], {
      input: JSON.stringify({
        basePdf: a4BasePdf(),
        schemas: [
          [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 }],
        ],
      }),
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe('template');
    expect(parsed.valid).toBe(true);
    expect(parsed.inspection.schemaTypes).toEqual(['text']);
    expect(parsed.inspection.requiredFonts).toEqual([]);
  });

  it('keeps inspection summary on validation errors', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [
          {
            name: 'title',
            type: 'textbox',
            fontName: 'NotoSerifJP',
            position: { x: 20, y: 20 },
            width: 170,
            height: 15,
          },
        ],
      ],
    };
    const file = join(TMP, 'json-error.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors[0]).toContain('unknown type "textbox"');
    expect(parsed.inspection).toEqual({
      schemaTypes: ['textbox'],
      requiredPlugins: [],
      requiredFonts: ['NotoSerifJP'],
      basePdf: {
        kind: 'blank',
        width: PAGE_SIZE_PRESETS.A4.width,
        height: PAGE_SIZE_PRESETS.A4.height,
        paperSize: 'A4 portrait',
      },
    });
  });

  it('returns field-level input hints for text, asset-like strings, barcode strings, table, date/time, select, checkbox, circleMark, radioGroup, and multiVariableText', () => {
    const file = join(TMP, 'input-hints.json');
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

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.inputHints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'title',
          type: 'text',
          pages: [1],
          expectedInput: {
            kind: 'string',
          },
        }),
        expect.objectContaining({
          name: 'invoiceMeta',
          type: 'multiVariableText',
          pages: [1],
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
          pages: [1],
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['draft', 'sent'],
            example: 'draft',
          },
        }),
        expect.objectContaining({
          name: 'approved',
          type: 'checkbox',
          pages: [1],
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['false', 'true'],
            example: 'true',
          },
        }),
        expect.objectContaining({
          name: 'applicableItem',
          type: 'circleMark',
          pages: [1],
          expectedInput: {
            kind: 'enumString',
            allowedValues: ['false', 'true'],
            example: 'true',
          },
        }),
        expect.objectContaining({
          name: 'logo',
          type: 'image',
          pages: [1],
          expectedInput: {
            kind: 'string',
            contentKind: 'imageDataUrl',
          },
        }),
        expect.objectContaining({
          name: 'signedByCustomer',
          type: 'signature',
          pages: [1],
          expectedInput: {
            kind: 'string',
            contentKind: 'signatureImageDataUrl',
          },
        }),
        expect.objectContaining({
          name: 'brandMark',
          type: 'svg',
          pages: [1],
          expectedInput: {
            kind: 'string',
            contentKind: 'svgMarkup',
          },
        }),
        expect.objectContaining({
          name: 'orderCode',
          type: 'qrcode',
          pages: [1],
          expectedInput: {
            kind: 'string',
            contentKind: 'barcodeText',
            rule: 'Any non-empty string up to 499 characters.',
          },
        }),
        expect.objectContaining({
          name: 'productEan',
          type: 'ean13',
          pages: [1],
          expectedInput: {
            kind: 'string',
            contentKind: 'barcodeText',
            rule: '12 or 13 digits; if 13 digits are provided, the final check digit must be valid.',
          },
        }),
        expect.objectContaining({
          name: 'lineItems',
          type: 'table',
          pages: [1],
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
          pages: [1],
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
          pages: [1],
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
          pages: [1],
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
          pages: [1],
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

  it('marks unified jobs invalid when table input rows do not match the expected column count', () => {
    const file = join(TMP, 'job-invalid-table.json');
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
        inputs: [{ lineItems: [['Paper']] }],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "lineItems" (table)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('expects a JSON array of string arrays with 2 cells per row'),
      ]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Row 1 must contain 2 cells. Received 1.')]),
    );
  });

  it('accepts list input as an array, JSON string array, or newline string', () => {
    const file = join(TMP, 'job-valid-list.json');
    const listSchema = {
      name: 'tasks',
      type: 'list',
      position: { x: 20, y: 20 },
      width: 120,
      height: 20,
    };
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [[listSchema]],
        },
        inputs: [
          { tasks: ['Install deps', 'Run tests'] },
          { tasks: '["Install deps","Run tests"]' },
          { tasks: 'Install deps\nRun tests' },
        ],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(true);
  });

  it('marks unified jobs invalid when list array items are not strings', () => {
    const file = join(TMP, 'job-invalid-list.json');
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'tasks',
                type: 'list',
                position: { x: 20, y: 20 },
                width: 120,
                height: 20,
              },
            ],
          ],
        },
        inputs: [
          { tasks: ['Install deps', 2] },
          { tasks: '["Install deps",{"x":1}]' },
          { tasks: '{"0":"Install deps"}' },
        ],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "tasks" (list)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Item 2 must be a string')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Received object')]),
    );
  });

  it('marks unified jobs invalid when select input uses a value outside schema options', () => {
    const file = join(TMP, 'job-invalid-select.json');
    writeFileSync(
      file,
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
                width: 170,
                height: 15,
              },
            ],
          ],
        },
        inputs: [{ status: 'archived' }],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "status" (select)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('expects one of: "draft", "sent"')]),
    );
  });

  it('marks unified jobs invalid when checkbox input uses a boolean', () => {
    const file = join(TMP, 'job-invalid-checkbox.json');
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

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "approved" (checkbox)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('expects one of: "false", "true"')]),
    );
  });

  it('marks unified jobs invalid when circleMark input uses a boolean', () => {
    const file = join(TMP, 'job-invalid-circle-mark.json');
    writeFileSync(
      file,
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

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "applicableItem" (circleMark)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('expects one of: "false", "true"')]),
    );
  });

  it('accepts canonical stored date input even when schema format differs', () => {
    const file = join(TMP, 'job-valid-date-canonical.json');
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'dueDate',
                type: 'date',
                format: 'dd/MM/yyyy',
                position: { x: 20, y: 20 },
                width: 30,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ dueDate: '2026/03/28' }],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toEqual([]);
  });

  it('marks unified jobs invalid when date input uses display format instead of canonical stored content', () => {
    const file = join(TMP, 'job-invalid-date-display-format.json');
    writeFileSync(
      file,
      JSON.stringify({
        template: {
          basePdf: a4BasePdf(),
          schemas: [
            [
              {
                name: 'dueDate',
                type: 'date',
                format: 'dd/MM/yyyy',
                position: { x: 20, y: 20 },
                width: 30,
                height: 10,
              },
            ],
          ],
        },
        inputs: [{ dueDate: '28/03/2026' }],
      }),
    );

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "dueDate" (date)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('expects canonical stored content in format yyyy/MM/dd'),
      ]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Display format hint: dd/MM/yyyy.')]),
    );
  });

  it('marks unified jobs invalid when dateTime input falls into a DST gap under renderer parsing semantics', () => {
    const file = join(TMP, 'job-invalid-date-time-dst-gap.json');
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

    const result = runCli(['validate', file, '--json'], {
      env: { ...process.env, TZ: 'America/New_York' },
    });
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "publishedAt" (dateTime)')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('expects canonical stored content in format yyyy/MM/dd HH:mm'),
      ]),
    );
  });

  it('marks unified jobs invalid when radioGroup sets multiple fields in the same group to true', () => {
    const file = join(TMP, 'job-invalid-radio-group.json');
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

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Radio group "choices"')]),
    );
    expect(parsed.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('choiceA, choiceB')]),
    );
  });

  it('rejects unknown flags with structured JSON output', () => {
    const template = {
      basePdf: a4BasePdf(),
      schemas: [
        [{ name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 }],
      ],
    };
    const file = join(TMP, 'unknown-flag.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--bogus', '--json']);
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('EARG');
    expect(parsed.error.message).toContain('Unknown argument');
  });
});
