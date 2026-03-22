import { merge } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';

describe('E2E: merge', () => {
  const aPdf = loadTestPDF('a.pdf');
  const bPdf = loadTestPDF('b.pdf');
  const cPdf = loadTestPDF('c.pdf');

  test('merge: merge a.pdf, b.pdf, c.pdf in order', async () => {
    const mergedBuffer = await merge([aPdf, bPdf, cPdf]);

    const images = await pdfToImages(mergedBuffer);
    for (let i = 0; i < images.length; i++) {
      await expect(images[i]).toMatchImage(`merge-abc-page${i + 1}`);
    }
  });
});
