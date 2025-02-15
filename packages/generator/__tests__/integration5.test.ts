import { writeFileSync } from 'fs';
import generate from '../src/generate';
import { segmenter } from './assets/templates';
import {getInputFromTemplate} from "@pdfme/common"
import { text, multiVariableText, image, barcodes } from '@pdfme/schemas';
import { getFont, getPdfTmpPath } from './utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { pdf2img } from '@pdfme/converter';

const PERFORMANCE_THRESHOLD = parseFloat(process.env.PERFORMANCE_THRESHOLD || '2.5');

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(): R;
    }
  }
}

expect.extend({ toMatchImageSnapshot });
jest.setTimeout(30000);
describe('generate integration test(slower)', () => {
  describe.each([segmenter])('%s', (templateData) => {
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
        font.NotoSerifJP.fallback = false;
        font.NotoSansJP.fallback = false;
        
        const hrstart = process.hrtime();

        const pdf = await generate({
          inputs,
          template,
          plugins: { text, image, multiVariableText, ...barcodes },
          options: { font },
        });

        const hrend = process.hrtime(hrstart);
        const execSeconds = hrend[0] + hrend[1] / 1000000000;
        if (process.env.CI) {
          expect(execSeconds).toBeLessThan(PERFORMANCE_THRESHOLD);
        } else if (execSeconds >= PERFORMANCE_THRESHOLD) {
          console.warn(`Warning: Execution time for ${key} is ${execSeconds} seconds, which is above the threshold of ${PERFORMANCE_THRESHOLD} seconds.`);
        }

        // Convert PDF to image and compare with snapshot
        const pdfImage = await pdf2img(pdf);
        expect(pdfImage).toMatchImageSnapshot({
          customSnapshotsDir: __dirname + '/__image_snapshots__',
          customSnapshotIdentifier: `${key}-snapshot`
        });
      });
    }
  });
});
