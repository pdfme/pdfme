import { writeFileSync, readFileSync, readdir, unlink } from 'fs';
import * as path from 'path';
import generate from '../src/generate';
import templateData from './assets/templates';
import { Template, Font, BLANK_PDF } from '@pdfme/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParser = require('pdf2json');

const SauceHanSansJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const SauceHanSerifJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: SauceHanSansJPData },
  SauceHanSerifJP: { data: SauceHanSerifJPData },
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
        // @ts-ignore
        font[template.fontName].fallback = true;

        const hrstart = process.hrtime();

        const pdf = await generate({
          inputs,
          template,
          options: {
            font,
            splitThreshold: 0,
          },
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

  describe('use nofont template', () => {
    test(`sample`, async () => {
      const inputs = [{ a: 'here is Helvetica' }];
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
      const pdf = await generate({ inputs, template });
      const tmpFile = getPdfTmpPath(`nofont.pdf`);
      const assertFile = getPdfAssertPath(`nofont.pdf`);
      writeFileSync(tmpFile, pdf);
      const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
      const [a, e] = res;
      expect(a.Pages).toEqual(e.Pages);
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
