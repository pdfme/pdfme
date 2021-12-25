import { writeFileSync, readFileSync, readdir, unlink } from 'fs';
import * as path from 'path';
import generate from '../src/generate';
import templateData from './templates';
import { Template } from '../src/libs/type';
const PDFParser = require('pdf2json');

const font: any = {
  SauceHanSansJP: readFileSync(path.join(__dirname, `/fonts/SauceHanSansJP.ttf`)),
  SauceHanSerifJP: readFileSync(path.join(__dirname, `/fonts/SauceHanSerifJP.ttf`)),
};

const getPdf = (pdfFilePath: string) => {
  const pdfParser = new PDFParser();

  return new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', reject);
    pdfParser.on('pdfParser_dataReady', resolve);
    pdfParser.loadPDF(pdfFilePath);
  });
};

const getPath = (dir: string, fileName: string) => path.join(__dirname, `/${dir}/${fileName}`);
const getTmpPath = (fileName: string) => getPath('tmp', fileName);
const getAssertPath = (fileName: string) => getPath('assert', fileName);

describe('check validation', () => {
  test(`inputs length is 0`, async () => {
    const inputs: { [key: string]: string }[] = [];
    const template: Template = {
      basePdf: { height: 297, width: 210 },
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
    await generate({ inputs, template, font })
      .then(() => {
        fail();
      })
      .catch((e) => {
        expect(e.message).toEqual('inputs should be more than one length');
      });
  });
  test(`missing font in template.fontName`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      fontName: 'dummyFont',
      basePdf: { height: 297, width: 210 },
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
    await generate({ inputs, template, font })
      .then(() => {
        fail();
      })
      .catch((e) => {
        expect(e.message).toEqual('dummyFont of template.fontName is not found in font');
      });
  });
  test(`missing font in template.schemas`, async () => {
    const inputs = [{ a: 'test' }];
    const template: Template = {
      fontName: 'SauceHanSansJP',
      basePdf: { height: 297, width: 210 },
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
    await generate({ inputs, template, font })
      .then(() => {
        fail();
      })
      .catch((e) => {
        expect(e.message).toEqual('SauceHanSansJP2 of template.schemas is not found in font');
      });
  });
});

describe('generate integrate test', () => {
  afterAll(() => {
    const dir = path.join(__dirname, '/tmp');
    readdir(dir, (err: any, files: any) => {
      if (err) {
        throw err;
      }
      files.forEach((file: any) => {
        if (file !== '.gitkeep') {
          unlink(`${dir}/${file}`, (err: any) => {
            if (err) {
              throw err;
            }
          });
        }
      });
    });
  });

  describe('use labelmake.jp template', () => {
    const entries = Object.entries(templateData);
    for (let l = 0; l < entries.length; l += 1) {
      const [key, template] = entries[l];
      test(`snapshot ${key}`, async () => {
        const inputs = template.sampledata!;
        const hrstart = process.hrtime();
        const pdf = await generate({
          inputs,
          template,
          font,
          splitThreshold: 0,
        });
        const hrend = process.hrtime(hrstart);
        expect(hrend[0]).toBeLessThanOrEqual(1);
        const tmpFile = getTmpPath(`${key}.pdf`);
        const assertFile = getAssertPath(`${key}.pdf`);
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
        basePdf: { height: 297, width: 210 },
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
      const tmpFile = getTmpPath(`nofont.pdf`);
      const assertFile = getAssertPath(`nofont.pdf`);
      writeFileSync(tmpFile, pdf);
      const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
      const [a, e] = res;
      expect(a.Pages).toEqual(e.Pages);
    });

    describe('use fontColor template', () => {
      test(`sample`, async () => {
        const inputs = [{ name: 'here is purple color' }];
        const template: Template = {
          basePdf: { height: 297, width: 210 },
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
        const tmpFile = getTmpPath(`fontColor.pdf`);
        const assertFile = getAssertPath(`fontColor.pdf`);
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
          basePdf: { height: 297, width: 210 },
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
          font: {
            SauceHanSansJP: {
              data: readFileSync(path.join(__dirname, `/fonts/SauceHanSansJP.ttf`)),
              subset: false,
            },
            SauceHanSerifJP: {
              data: readFileSync(path.join(__dirname, `/fonts/SauceHanSerifJP.ttf`)),
              subset: false,
            },
          },
        });
        const tmpFile = getTmpPath(`fontSubset.pdf`);
        const assertFile = getAssertPath(`fontSubset.pdf`);
        writeFileSync(tmpFile, pdf);
        const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
        const [a, e] = res;
        expect(a.Pages).toEqual(e.Pages);
      }, 10000);
    });
  });
});
