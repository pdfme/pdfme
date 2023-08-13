import { writeFileSync, readFileSync, readdir, unlink } from 'fs';
import * as path from 'path';
import generate from '../src/generate';
import templateData from './assets/templates';
import { Template, Font, BLANK_PDF, TextSchema } from '@pdfme/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParser = require('pdf2json');

const SauceHanSansJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const SauceHanSerifJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));
const NotoSerifJPRegularData = readFileSync(path.join(__dirname, `/assets/fonts/NotoSerifJP-Regular.otf`));

const getFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: SauceHanSansJPData },
  SauceHanSerifJP: { data: SauceHanSerifJPData },
  'NotoSerifJP-Regular': { data: NotoSerifJPRegularData },
});

const getPdf = (pdfFilePath: string) => {
  const pdfParser = new PDFParser();

  return new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', reject);
    pdfParser.on('pdfParser_dataReady', resolve);
    pdfParser.loadPDF(pdfFilePath);
  });
};

const getPdfPath = (dir: string, fileName: string) =>
  path.join(__dirname, `assets/pdfs/${dir}/${fileName}`);
const getPdfTmpPath = (fileName: string) => getPdfPath('tmp', fileName);
const getPdfAssertPath = (fileName: string) => getPdfPath('assert', fileName);

describe('generate integrate test', () => {
  afterAll(() => {
    const dir = path.join(__dirname, 'assets/pdfs/tmp');
    const unLinkFile = (file: any) => {
      if (file !== '.gitkeep') {
        unlink(`${dir}/${file}`, (e: any) => {
          if (e) {
            throw e;
          }
        });
      }
    };
    readdir(dir, (err: any, files: any) => {
      if (err) {
        throw err;
      }
      files.forEach(unLinkFile);
    });
  });

  describe('basic generator', () => {
    const textObject = (x: number, y: number): TextSchema => ({
      type: 'text', position: { x, y }, width: 100, height: 100, fontSize: 13,
    });

    const singleSchemaTemplate: Template = {
      basePdf: BLANK_PDF,
      schemas: [{
        a: textObject(0, 0),
        b: textObject(25, 25),
      }],
    };

    const multiSchemasTemplate: Template = {
      basePdf: "data:application/pdf;base64,JVBERi0xLjcNJeLjz9MNCjYgMCBvYmoNPDwvTGluZWFyaXplZCAxL0wgMTg0NC9PIDgvRSAxMTEwL04gMi9UIDE1NzAvSCBbIDQyMyAxMzFdPj4NZW5kb2JqDSAgICAgICAgICAgICAgICAgICAgICAgDQoxMSAwIG9iag08PC9EZWNvZGVQYXJtczw8L0NvbHVtbnMgMy9QcmVkaWN0b3IgMTI+Pi9GaWx0ZXIvRmxhdGVEZWNvZGUvSURbPEJBMTk5MUY0MThCN0IyMTEwQTAwNjc0NThCNkJDNjIzPjxGOEE4OEZEMzMzNjQ2OTQ2QkE1ODMzM0M4MEFEMDFFNj5dL0luZGV4WzYgN10vTGVuZ3RoIDM2L1ByZXYgMTU3MS9Sb290IDcgMCBSL1NpemUgMTMvVHlwZS9YUmVmL1dbMSAyIDBdPj5zdHJlYW0NCmjeYmJkEGBiYJJiYmDQZWJgvA+k45gY/j4Aso0BAgwAISQDuA0KZW5kc3RyZWFtDWVuZG9iag1zdGFydHhyZWYNCjANCiUlRU9GDQogICAgICAgIA0KMTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCA1Ny9TIDQ0Pj5zdHJlYW0NCmjeYmBgYGJgYLzCwAgkbRk4GBCAAyjGxMDCwNFwiOGAQvkhJCkGZihmYIhj4GhkSGEACDAAvy4F4g0KZW5kc3RyZWFtDWVuZG9iag03IDAgb2JqDTw8L1BhZ2VzIDUgMCBSL1R5cGUvQ2F0YWxvZz4+DWVuZG9iag04IDAgb2JqDTw8L0Fubm90c1tdL0JsZWVkQm94WzAgMCA1OTUuNDQgODQxLjkyXS9Db250ZW50cyA5IDAgUi9Dcm9wQm94WzAgMCA1OTUuNDQgODQxLjkyXS9NZWRpYUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L1hPYmplY3Q8PC9GbTAgMTAgMCBSPj4+Pi9Sb3RhdGUgMC9UcmltQm94WzAgMCA1OTUuNDQgODQxLjkyXS9UeXBlL1BhZ2U+Pg1lbmRvYmoNOSAwIG9iag08PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDI2Pj5zdHJlYW0NCkiJKlQwUAjx0XfLNVBwyVcIVAAIMAAiagP4DQplbmRzdHJlYW0NZW5kb2JqDTEwIDAgb2JqDTw8L0JCb3hbMzI3NjguMCAzMjc2OC4wIC0zMjc2OC4wIC0zMjc2OC4wXS9GaWx0ZXIvRmxhdGVEZWNvZGUvRm9ybVR5cGUgMS9MZW5ndGggMTQvTWF0cml4WzEgMCAwIDEgMCAwXS9SZXNvdXJjZXM8PD4+L1N1YnR5cGUvRm9ybS9UeXBlL1hPYmplY3Q+PnN0cmVhbQ0KSIkq5ArkAggwAAKSANcNCmVuZHN0cmVhbQ1lbmRvYmoNMSAwIG9iag08PC9Bbm5vdHNbXS9CbGVlZEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vQ29udGVudHMgMiAwIFIvQ3JvcEJveFswIDAgNTk1LjQ0IDg0MS45Ml0vTWVkaWFCb3hbMCAwIDU5NS40NCA4NDEuOTJdL1BhcmVudCA1IDAgUi9SZXNvdXJjZXM8PC9YT2JqZWN0PDwvRm0wIDEwIDAgUj4+Pj4vUm90YXRlIDAvVHJpbUJveFswIDAgNTk1LjQ0IDg0MS45Ml0vVHlwZS9QYWdlPj4NZW5kb2JqDTIgMCBvYmoNPDwvRmlsdGVyL0ZsYXRlRGVjb2RlL0xlbmd0aCAyNj4+c3RyZWFtDQpIiSpUMFAI8dF3yzVQcMlXCFQACDAAImoD+A0KZW5kc3RyZWFtDWVuZG9iag0zIDAgb2JqDTw8L0ZpbHRlci9GbGF0ZURlY29kZS9GaXJzdCA0L0xlbmd0aCA1Mi9OIDEvVHlwZS9PYmpTdG0+PnN0cmVhbQ0KaN4yVTBQsLHRd84vzStRMNL3zkwpjrYAigUpGILIWP2QyoJU/YDE9NRiOzuAAAMAETgMkw0KZW5kc3RyZWFtDWVuZG9iag00IDAgb2JqDTw8L0RlY29kZVBhcm1zPDwvQ29sdW1ucyAzL1ByZWRpY3RvciAxMj4+L0ZpbHRlci9GbGF0ZURlY29kZS9JRFs8QkExOTkxRjQxOEI3QjIxMTBBMDA2NzQ1OEI2QkM2MjM+PEY4QTg4RkQzMzM2NDY5NDZCQTU4MzMzQzgwQUQwMUU2Pl0vTGVuZ3RoIDMzL1Jvb3QgNyAwIFIvU2l6ZSA2L1R5cGUvWFJlZi9XWzEgMiAwXT4+c3RyZWFtDQpo3mJiYGBgYmQJY2JgvM/EwBAHpCcwMf56ABBgABstBBINCmVuZHN0cmVhbQ1lbmRvYmoNc3RhcnR4cmVmDQoxMTYNCiUlRU9GDQo=",
      schemas: [
        { a: textObject(0, 0) },
        { b: textObject(25, 25) },
      ],
    };

    const singleInputs = [{ a: 'a', b: "b" }];
    const multiInputs = [{ a: 'a-1', b: "b-1" }, { a: 'a-2', b: "b-2" }];

    const testCases = [
      { template: singleSchemaTemplate, inputs: singleInputs, testName: 'singleSchemaTemplate with singleInputs' },
      { template: singleSchemaTemplate, inputs: multiInputs, testName: 'singleSchemaTemplate with multiInputs' },
      { template: multiSchemasTemplate, inputs: singleInputs, testName: 'multiSchemasTemplate with singleInputs' },
      { template: multiSchemasTemplate, inputs: multiInputs, testName: 'multiSchemasTemplate with multiInputs' },
    ];

    testCases.forEach(({ template, inputs, testName }) => {
      test(testName, async () => {
        const pdf = await generate({ inputs, template });
        const tmpFile = getPdfTmpPath(`${testName}.pdf`);
        const assertFile = getPdfAssertPath(`${testName}.pdf`);
        writeFileSync(tmpFile, pdf);
        const [actualPdf, expectedPdf] = await Promise.all([
          getPdf(tmpFile),
          getPdf(assertFile),
        ]);
        // @ts-ignore
        expect(actualPdf.Pages).toEqual(expectedPdf.Pages);
      });
    });
  });


  // TODO Slow test... need speed up, use Promise.all?
  describe('use labelmake.jp template', () => {
    const entries = Object.entries(templateData);
    for (let l = 0; l < entries.length; l += 1) {
      const [key, template] = entries[l];

      // eslint-disable-next-line no-loop-func
      test(`snapshot ${key}`, async () => {
        const inputs = template.sampledata!;

        const font = getFont();
        font.SauceHanSansJP.fallback = false;
        font.SauceHanSerifJP.fallback = false;
        font['NotoSerifJP-Regular'].fallback = false;
        // @ts-ignore
        font[template.fontName].fallback = true;

        const hrstart = process.hrtime();

        const pdf = await generate({
          inputs,
          template,
          options: { font },
        });

        const hrend = process.hrtime(hrstart);
        expect(hrend[0]).toBeLessThanOrEqual(1);

        const tmpFile = getPdfTmpPath(`${key}.pdf`);
        const assertFile = getPdfAssertPath(`${key}.pdf`);

        writeFileSync(tmpFile, pdf);
        const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
        const [a, e] = res;
        expect(a.Pages).toEqual(e.Pages);
      });
    }
  });


  describe('use fontColor template', () => {
    test(`sample`, async () => {
      const inputs = [{ name: 'here is purple color' }];
      const template: Template = {
        basePdf: BLANK_PDF,
        schemas: [
          {
            name: {
              type: 'text',
              position: { x: 30, y: 30 },
              width: 100,
              height: 20,
              fontColor: '#7d2ae8',
            },
          },
        ],
      };
      const pdf = await generate({ inputs, template });
      const tmpFile = getPdfTmpPath(`fontColor.pdf`);
      const assertFile = getPdfAssertPath(`fontColor.pdf`);
      writeFileSync(tmpFile, pdf);
      const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
      const [a, e] = res;
      expect(a.Pages).toEqual(e.Pages);
    });
  });

  describe('use fontSubset template', () => {
    test(`sample`, async () => {
      const inputs = [{ field1: 'SauceHanSansJP', field2: 'SauceHanSerifJP' }];
      const template: Template = {
        basePdf: BLANK_PDF,
        schemas: [
          {
            field1: {
              type: 'text',
              position: { x: 30, y: 30 },
              width: 100,
              height: 20,
              fontName: 'SauceHanSansJP',
            },
            field2: {
              type: 'text',
              position: { x: 60, y: 60 },
              width: 100,
              height: 20,
              fontName: 'SauceHanSerifJP',
            },
          },
        ],
      };
      jest.setTimeout(30000);
      const pdf = await generate({
        inputs,
        template,
        options: {
          font: {
            SauceHanSansJP: {
              data: SauceHanSansJPData,
              fallback: true,
              subset: false,
            },
            SauceHanSerifJP: {
              data: SauceHanSerifJPData,
              subset: false,
            },
          },
        },
      });
      const tmpFile = getPdfTmpPath(`fontSubset.pdf`);
      const assertFile = getPdfAssertPath(`fontSubset.pdf`);
      writeFileSync(tmpFile, pdf);
      const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
      const [a, e] = res;
      expect(a.Pages).toEqual(e.Pages);
    }, 10000);
  });
});

describe('check validation', () => {
  test(`inputs length is 0`, async () => {
    const inputs: { [key: string]: string }[] = [];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    };
    try {
      await generate({ inputs, template, options: { font: getFont() } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(`Invalid argument:
--------------------------
ERROR POSITION: inputs
ERROR MESSAGE: Array must contain at least 1 element(s)
--------------------------`);
    }
  });
  test(`missing fallback font`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    };
    const font = getFont();
    font.SauceHanSansJP.fallback = false;
    font.SauceHanSerifJP.fallback = false;
    try {
      await generate({ inputs, template, options: { font } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'fallback flag is not found in font. true fallback flag must be only one.'
      );
    }
  });
  test(`too many fallback font`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    };
    const font = getFont();
    font.SauceHanSansJP.fallback = true;
    font.SauceHanSerifJP.fallback = true;
    try {
      await generate({ inputs, template, options: { font } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        '2 fallback flags found in font. true fallback flag must be only one.'
      );
    }
  });
  test(`missing font in template.schemas`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    };
    try {
      await generate({ inputs, template, options: { font: getFont() } });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual('SauceHanSansJP2 of template.schemas is not found in font.');
    }
  });

  test(`check digit error`, async () => {
    const inputs = [{ a: 'worng text', b: 'worng text', c: 'worng text' }];
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'ean8',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'ean13',
            position: { x: 0, y: 100 },
            width: 100,
            height: 100,
          },
          c: {
            type: 'nw7',
            position: { x: 0, y: 200 },
            width: 100,
            height: 100,
          },
        },
      ],
    };
    try {
      await generate({ inputs, template });
    } catch (e: any) {
      fail();
    }
    expect(true).toEqual(true);
  });
});
