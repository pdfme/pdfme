import { insert } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: insert', () => {
  const fiveP = loadTestPDF('5p.pdf');
  const aPdf = loadTestPDF('a.pdf');

  test('insert: insert a.pdf at position 0 in 5p.pdf', async () => {
    const inserted = await insert(fiveP, [{ pdf: aPdf, position: 0 }]);

    const images = await pdfToImages(inserted);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `insert-5p-a-at-0-result-page${i + 1}`,
      });
    }
  });

  test('insert: insert a.pdf at position 0 and 2 in 5p.pdf', async () => {
    // Note: the second insert is done in the same buffer, so the offset changes after the first insert
    const inserted = await insert(fiveP, [
      { pdf: aPdf, position: 0 },
      { pdf: aPdf, position: 2 }, // The PDF is 6 pages after the first insert
    ]);

    const images = await pdfToImages(inserted);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `insert-5p-a-at-0-and-2-result-page${i + 1}`,
      });
    }
  });
});