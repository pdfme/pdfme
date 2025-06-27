import generate from '../src/generate.js';
import { segmenter } from './assets/templates/index.js';
import { getInputFromTemplate } from '@pdfme/common';
import { text, multiVariableText, image, barcodes } from '@pdfme/schemas';
import { getFont, pdfToImages } from './utils.js';
import 'jest-image-snapshot';

const PERFORMANCE_THRESHOLD = parseFloat(process.env.PERFORMANCE_THRESHOLD || '2.5');

describe('generate integration test(segmenter)', () => {
  describe.each([segmenter])('%s', (templateData) => {
    const entries = Object.entries(templateData);
    for (let l = 0; l < entries.length; l += 1) {
      const [key, template] = entries[l];

      // eslint-disable-next-line no-loop-func
      test(`snapshot ${key}`, async () => {
        const inputs = getInputFromTemplate(template);

        const font = getFont();
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
          console.warn(
            `Warning: Execution time for ${key} is ${execSeconds} seconds, which is above the threshold of ${PERFORMANCE_THRESHOLD} seconds.`
          );
        }

        const images = await pdfToImages(pdf);
        for (let i = 0; i < images.length; i++) {
          expect(images[i]).toMatchImageSnapshot({
            customSnapshotIdentifier: `${key}-${i + 1}`,
          });
        }
      });
    }
  });
});
