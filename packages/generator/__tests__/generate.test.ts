import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import generate from '../src/generate.js';
import { Template, BLANK_PDF, Schema, type Plugin } from '@pdfme/common';
import { PDFDocument } from '@pdfme/pdf-lib';
import { getFont, getImageSnapshotOptions, pdfToImages } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('generate integrate test', () => {
  describe('basic generator', () => {
    const textObject = (x: number, y: number, name: string = 'a'): Schema => ({
      name,
      type: 'text',
      content: '',
      position: { x, y },
      width: 100,
      height: 100,
      fontSize: 13,
    });

    const singleSchemaTemplate: Template = {
      basePdf: BLANK_PDF,
      schemas: [[textObject(0, 0), textObject(25, 25, 'b')]],
    };

    const multiSchemasTemplate: Template = {
      basePdf:
        'data:application/pdf;base64,JVBERi0xLjcNJeLjz9MNCjYgMCBvYmoNPDwvTGluZWFyaXplZCAxL0wgMTg0NC9PIDgvRSAxMTEwL04gMi9UIDE1NzAvSCBbIDQyMyAxMzFdPj4NZW5kb2JqDSAgICAgICAgICAgICAgICAgICAgICAgDQoxMSAwIG9iag08PC9EZWNvZGVQYXJtczw8L0NvbHVtbnMgMy9QcmVkaWN0b3IgMTI+Pi9GaWx0ZXIvRmxhdGVEZWNvZGUvSURbPEJBMTk5MUY0MThCN0IyMTEwQTAwNjc0NThCNkJDNjIzPjxGOEE4OEZEMzMzNjQ2OTQ2QkE1ODMzM0M4MEFEMDFFNj5dL0luZGV4WzYgN10vTGVuZ3RoIDM2L1ByZXYgMTU3MS9Sb290IDcgMCBSL1NpemUgMTMvVHlwZS9YUmVmL1dbMSAyIDBdPj5zdHJlYW0NCmjeYmJkEGBiYJJiYmDQZWJgvA+k45gY/j4Aso0BAgwAISQDuA0KZW5kc3RyZWFtDWVuZG9iag1zdGFydHhyZWYNCjANCiUlRU9GDQogICAgICAgIA0KMTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCA1Ny9TIDQ0Pj5zdHJlYW0NCmjeYmBgYGJgYLzCwAgkbRk4GBCAAyjGxMDCwNFwiOGAQvkhJCkGZihmYIhj4GhkSGEACDAAvy4F4g0KZW5kc3RyZWFtDWVuZG9iag03IDAgb2JqDTw8L1BhZ2VzIDUgMCBSL1R5cGUvQ2F0YWxvZz4+DWVuZG9iag04IDAgb2JqDTw8L0Fubm90c1tdL0JsZWVkQm94WzAgMCA1OTUuNDQgODQxLjkyXS9Db250ZW50cyA5IDAgUi9Dcm9wQm94WzAgMCA1OTUuNDQgODQxLjkyXS9NZWRpYUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L1hPYmplY3Q8PC9GbTAgMTAgMCBSPj4+Pi9Sb3RhdGUgMC9UcmltQm94WzAgMCA1OTUuNDQgODQxLjkyXS9UeXBlL1BhZ2U+Pg1lbmRvYmoNOSAwIG9iag08PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDI2Pj5zdHJlYW0NCkiJKlQwUAjx0XfLNVBwyVcIVAAIMAAiagP4DQplbmRzdHJlYW0NZW5kb2JqDTEwIDAgb2JqDTw8L0JCb3hbMzI3NjguMCAzMjc2OC4wIC0zMjc2OC4wIC0zMjc2OC4wXS9GaWx0ZXIvRmxhdGVEZWNvZGUvRm9ybVR5cGUgMS9MZW5ndGggMTQvTWF0cml4WzEgMCAwIDEgMCAwXS9SZXNvdXJjZXM8PD4+L1N1YnR5cGUvRm9ybS9UeXBlL1hPYmplY3Q+PnN0cmVhbQ0KSIkq5ArkAggwAAKSANcNCmVuZHN0cmVhbQ1lbmRvYmoNMSAwIG9iag08PC9Bbm5vdHNbXS9CbGVlZEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vQ29udGVudHMgMiAwIFIvQ3JvcEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vTWVkaWFCb3hbMCAwIDU5NS40NCA4NDEuOTJdL1BhcmVudCA1IDAgUi9SZXNvdXJjZXM8PC9YT2JqZWN0PDwvRm0wIDEwIDAgUj4+Pj4vUm90YXRlIDAvVHJpbUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vVHlwZS9QYWdlPj4NZW5kb2JqDTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCAyNj4+c3RyZWFtDQpIiSpUMFAI8dF3yzVQcMlXCFQACDAAImoD+A0KZW5kc3RyZWFtDWVuZG9iag0zIDAgb2JqDTw8L0ZpbHRlci9GbGF0ZURlY29kZS9GaXJzdCA0L0xlbmd0aCA1Mi9OIDEvVHlwZS9PYmpTdG0+PnN0cmVhbQ0KaN4yVTBQsLHRd84vzStRMNL3zkwpjrYAigUpGILIWP2QyoJU/YDE9NRiOzuAAAMAETgMkw0KZW5kc3RyZWFtDWVuZG9iag00IDAgb2JqDTw8L0RlY29kZVBhcm1zPDwvQ29sdW1ucyAzL1ByZWRpY3RvciAxMj4+L0ZpbHRlci9GbGF0ZURlY29kZS9JRFs8QkExOTkxRjQxOEI3QjIxMTBBMDA2NzQ1OEI2QkM2MjM+PEY4QTg4RkQzMzM2NDY5NDZCQTU4MzMzQzgwQUQwMUU2Pl0vTGVuZ3RoIDMzL1Jvb3QgNyAwIFIvU2l6ZSA2L1R5cGUvWFJlZi9XWzEgMiAwXT4+c3RyZWFtDQpo3mJiYGBgYmQJY2JgvM/EwBAHpCcwMf56ABBgABstBBINCmVuZHN0cmVhbQ1lbmRvYmoNc3RhcnR4cmVmDQoxMTYNCiUlRU9GDQo=',
      schemas: [[textObject(0, 0)], [textObject(25, 25, 'b')]],
    };

    const singleInputs = [{ a: 'a', b: 'b' }];
    const multiInputs = [
      { a: 'a-1', b: 'b-1' },
      { a: 'a-2', b: 'b-2' },
    ];

    const testCases = [
      {
        template: singleSchemaTemplate,
        inputs: singleInputs,
        testName: 'singleSchemaTemplate with singleInputs',
      },
      {
        template: singleSchemaTemplate,
        inputs: multiInputs,
        testName: 'singleSchemaTemplate with multiInputs',
      },
      {
        template: multiSchemasTemplate,
        inputs: singleInputs,
        testName: 'multiSchemasTemplate with singleInputs',
      },
      {
        template: multiSchemasTemplate,
        inputs: multiInputs,
        testName: 'multiSchemasTemplate with multiInputs',
      },
    ];

    // testCases for
    for (let i = 0; i < testCases.length; i += 1) {
      const { template, inputs, testName } = testCases[i];
      test(testName, async () => {
        const pdf = await generate({ inputs, template });
        const images = await pdfToImages(pdf);
        for (let i = 0; i < images.length; i++) {
          await expect(images[i]).toMatchImage(getImageSnapshotOptions(`${testName}-${i + 1}`));
        }
      });
    }

    test('uses custom base PDF crop box as template coordinate space across inputs', async () => {
      const basePdfDoc = await PDFDocument.create();
      const basePage = basePdfDoc.addPage([120, 120]);
      basePage.setMediaBox(10, 20, 120, 120);
      basePage.setBleedBox(10, 20, 120, 120);
      basePage.setTrimBox(10, 20, 120, 120);
      basePage.drawText('base', { x: 12, y: 22, size: 4 });

      const observedPositions: Schema['position'][] = [];
      const probeSchema: Schema = {
        name: 'probe',
        type: 'probe',
        content: '',
        position: { x: 3, y: 30 },
        width: 10,
        height: 10,
      };
      const probePlugin: Plugin = {
        pdf: ({ schema }) => {
          observedPositions.push({ ...schema.position });
        },
        ui: () => {},
        propPanel: {
          schema: {},
          defaultSchema: probeSchema,
        },
      };

      await generate({
        template: {
          basePdf: await basePdfDoc.save(),
          schemas: [[probeSchema]],
        },
        inputs: [{ probe: 'first' }, { probe: 'second' }],
        plugins: { probe: probePlugin },
      });

      expect(observedPositions).toHaveLength(2);
      expect(observedPositions[0]).toEqual(observedPositions[1]);
      expect(observedPositions[0]).toEqual(probeSchema.position);
    });

    test('loads permission encrypted custom base PDFs with empty password fallback', async () => {
      const encryptedBasePdf = readFileSync(
        path.join(
          __dirname,
          '../../../playground/public/template-assets/nenkin-shougai-seishin-shindansho/source.pdf',
        ),
      );

      const pdf = await generate({
        template: {
          basePdf: encryptedBasePdf,
          schemas: [[], []],
        },
        inputs: [{}],
      });
      const pdfDoc = await PDFDocument.load(pdf);
      const mediaBox = pdfDoc.getPage(0).getMediaBox();

      expect(pdfDoc.isEncrypted).toBe(false);
      expect(pdfDoc.getPageCount()).toBe(2);
      expect(mediaBox.x).toBe(0);
      expect(mediaBox.y).toBe(0);
      expect(mediaBox.width).toBeCloseTo(834.5225);
      expect(mediaBox.height).toBeCloseTo(1208.697);
    });

    test('reports password required custom base PDFs', async () => {
      const passwordProtectedBasePdf = readFileSync(
        path.join(__dirname, '../../../packages/pdf-lib/assets/pdfs/encrypted_new.pdf'),
      );

      await expect(
        generate({
          template: {
            basePdf: passwordProtectedBasePdf,
            schemas: [[]],
          },
          inputs: [{}],
        }),
      ).rejects.toThrow(
        '[@pdfme/generator] basePdf is encrypted and requires a valid password. Pass options.basePdfPassword to generate().',
      );
    });

    test('does not expose basePdfPassword to schema plugins', async () => {
      const observedOptions: unknown[] = [];
      const probeSchema: Schema = {
        name: 'probe',
        type: 'probe',
        content: '',
        position: { x: 3, y: 30 },
        width: 10,
        height: 10,
      };
      const probePlugin: Plugin = {
        pdf: ({ options }) => {
          observedOptions.push(options);
        },
        ui: () => {},
        propPanel: {
          schema: {},
          defaultSchema: probeSchema,
        },
      };

      await generate({
        template: {
          basePdf: BLANK_PDF,
          schemas: [[probeSchema]],
        },
        inputs: [{ probe: 'value' }],
        plugins: { probe: probePlugin },
        options: { basePdfPassword: 'secret' },
      });

      expect(observedOptions).toHaveLength(1);
      expect(observedOptions[0]).not.toHaveProperty('basePdfPassword');
    });

    test('expands text schemas and pushes following schemas on blank PDFs', async () => {
      const renderedSchemas: Schema[] = [];
      const textProbePlugin: Plugin = {
        pdf: ({ schema }) => {
          renderedSchemas.push({
            ...schema,
            position: { ...schema.position },
          });
        },
        ui: () => {},
        propPanel: {
          schema: {},
          defaultSchema: {
            ...textObject(0, 0),
            type: 'text',
          },
        },
      };

      await generate({
        template: {
          basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
          schemas: [
            [
              {
                ...textObject(10, 10, 'body'),
                width: 30,
                height: 5,
                overflow: 'expand',
                fontSize: 13,
                lineHeight: 1,
                characterSpacing: 0,
              },
              {
                ...textObject(10, 20, 'after'),
                width: 30,
                height: 5,
              },
            ],
          ],
        },
        inputs: [{ body: 'long text '.repeat(20), after: 'after' }],
        options: { font: getFont() },
        plugins: { text: textProbePlugin },
      });

      const bodySchemas = renderedSchemas.filter((schema) => schema.name === 'body');
      const after = renderedSchemas.find((schema) => schema.name === 'after');

      expect(bodySchemas.reduce((sum, schema) => sum + schema.height, 0)).toBeGreaterThan(5);
      expect(after?.position.y).toBeGreaterThan(20);
    });

    test('splits expanded text schemas by line across blank PDF pages', async () => {
      const renderedSchemas: Schema[] = [];
      const textProbePlugin: Plugin = {
        pdf: ({ schema }) => {
          renderedSchemas.push({
            ...schema,
            position: { ...schema.position },
          });
        },
        ui: () => {},
        propPanel: {
          schema: {},
          defaultSchema: {
            ...textObject(0, 0),
            type: 'text',
          },
        },
      };

      await generate({
        template: {
          basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
          schemas: [
            [
              {
                ...textObject(10, 70, 'body'),
                width: 20,
                height: 5,
                overflow: 'expand',
                fontSize: 13,
                lineHeight: 1,
                characterSpacing: 0,
              },
            ],
          ],
        },
        inputs: [{ body: 'long text '.repeat(30) }],
        options: { font: getFont() },
        plugins: { text: textProbePlugin },
      });

      const bodySchemas = renderedSchemas.filter((schema) => schema.name === 'body');
      const firstRange = bodySchemas[0].__splitRange;
      expect(bodySchemas.length).toBeGreaterThan(1);
      expect(firstRange?.unit).toBe('textLine');
      expect(firstRange?.start).toBe(0);
      expect(firstRange?.end).toBeGreaterThan(0);
      expect(bodySchemas[0].__isSplit).toBe(false);
      expect(bodySchemas[1].__splitRange?.start).toBe(firstRange?.end);
      expect(bodySchemas[1].__isSplit).toBe(true);
      expect(bodySchemas[1].position.y).toBe(10);
    });
  });

  describe('use fontColor template', () => {
    test(`sample`, async () => {
      const inputs = [{ name: 'here is purple color' }];
      const template: Template = {
        basePdf: BLANK_PDF,
        schemas: [
          [
            {
              name: 'name',
              type: 'text',
              content: '',
              position: { x: 30, y: 30 },
              width: 100,
              height: 20,
              fontColor: '#7d2ae8',
            },
          ],
        ],
      };
      const pdf = await generate({ inputs, template });
      const images = await pdfToImages(pdf);
      for (let i = 0; i < images.length; i++) {
        await expect(images[i]).toMatchImage(getImageSnapshotOptions(`fontColor-${i + 1}`));
      }
    });
  });

  describe('use fontSubset template', () => {
    test(`sample`, async () => {
      const inputs = [{ field1: 'NotoSansJP', field2: 'NotoSerifJP' }];
      const template: Template = {
        basePdf: BLANK_PDF,
        schemas: [
          [
            {
              name: 'field1',
              type: 'text',
              content: '',
              position: { x: 30, y: 30 },
              width: 100,
              height: 20,
              fontName: 'NotoSansJP',
            },
            {
              name: 'field2',
              type: 'text',
              content: '',
              position: { x: 60, y: 60 },
              width: 100,
              height: 20,
              fontName: 'NotoSerifJP',
            },
          ],
        ],
      };
      const font = getFont();
      const pdf = await generate({
        inputs,
        template,
        options: {
          font: {
            NotoSansJP: {
              ...font.NotoSansJP,
              fallback: true,
              subset: false,
            },
            NotoSerifJP: {
              ...font.NotoSerifJP,
              subset: false,
            },
          },
        },
      });
      const images = await pdfToImages(pdf);
      for (let i = 0; i < images.length; i++) {
        await expect(images[i]).toMatchImage(getImageSnapshotOptions(`fontSubset-${i + 1}`));
      }
    }, 30000);
  });
});

describe('check validation', () => {
  test(`inputs length is 0`, async () => {
    const inputs: { [key: string]: string }[] = [];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            type: 'text',
            content: '',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    };
    try {
      await generate({ inputs, template, options: { font: getFont() } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(`[@pdfme/common] Invalid argument:
--------------------------
ERROR POSITION: inputs
ERROR MESSAGE: Too small: expected array to have >=1 items
--------------------------`);
    }
  });
  test(`missing fallback font`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            type: 'text',
            content: '',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    };
    const font = getFont();
    font.Roboto.fallback = false;
    try {
      await generate({ inputs, template, options: { font } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
      );
    }
  });
  test(`too many fallback font`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            type: 'text',
            content: '',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    };
    const font = getFont();
    // Set multiple fonts to have fallback = true to test the error
    font.Roboto.fallback = true;
    font.NotoSansJP = { ...font.NotoSansJP, fallback: true };
    try {
      await generate({ inputs, template, options: { font } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] 2 fallback flags found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
      );
    }
  });
  test(`missing font in template.schemas`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            type: 'text',
            content: '',
            fontName: 'DUMMY_FONT',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          {
            name: 'b',
            type: 'text',
            content: '',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    };
    try {
      await generate({ inputs, template, options: { font: getFont() } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] DUMMY_FONT of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`
      );
    }
  });
});
