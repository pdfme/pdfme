import { writeFileSync } from 'fs';
import generate from '../src/generate';
import { textType } from './assets/templates';
import {getInputFromTemplate} from "@pdfme/common"
import { text, image, barcodes } from '@pdfme/schemas';
import { getFont, getPdf, getPdfTmpPath, getPdfAssertPath } from './utils';

const PERFORMANCE_THRESHOLD = parseFloat(process.env.PERFORMANCE_THRESHOLD || '2.5');

describe('generate integration test(slower)', () => {
  describe.each([textType])('%s', (templateData) => {
    const entries = Object.entries(templateData);
    for (let l = 0; l < entries.length; l += 1) {
      const [key, template] = entries[l];

      // eslint-disable-next-line no-loop-func
      test(`snapshot ${key}`, async () => {
        const inputs = getInputFromTemplate(template);

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
          plugins: { text, image, ...barcodes },
          options: { font },
        });

        const hrend = process.hrtime(hrstart);
        const execSeconds = hrend[0] + hrend[1] / 1000000000;
        if (process.env.CI) {
          expect(execSeconds).toBeLessThan(PERFORMANCE_THRESHOLD);
        } else if (execSeconds >= PERFORMANCE_THRESHOLD) {
          console.warn(`Warning: Execution time for ${key} is ${execSeconds} seconds, which is above the threshold of ${PERFORMANCE_THRESHOLD} seconds.`);
        }

        const tmpFile = getPdfTmpPath(`${key}.pdf`);
        const assertFile = getPdfAssertPath(`${key}.pdf`);

        writeFileSync(tmpFile, pdf);
        const res: any = await Promise.all([getPdf(tmpFile), getPdf(assertFile)]);
        const [a, e] = res;
        expect(a.Pages).toEqual(e.Pages);
      });
    }
  });
});
