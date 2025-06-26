import { merge } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: merge', () => {
  const aPdf = loadTestPDF('a.pdf');
  const bPdf = loadTestPDF('b.pdf');
  const cPdf = loadTestPDF('c.pdf');

  test('merge: merge a.pdf, b.pdf, c.pdf in order', async () => {
    const mergedBuffer = await merge([aPdf, bPdf, cPdf]);

    const images = await pdfToImages(mergedBuffer);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `merge-abc-page${i + 1}`,
      });
    }
  });
});