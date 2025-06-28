import { remove } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: remove', () => {
  const fiveP = loadTestPDF('5p.pdf');

  test('remove: remove the 1st page of 5p.pdf', async () => {
    const removed = await remove(fiveP, [0]);

    const images = await pdfToImages(removed);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `remove-5p-page1-result-page${i + 1}`,
      });
    }
  });

  test('remove: remove the 1st and 3rd pages of 5p.pdf', async () => {
    // Note: This assumes removing all at once, not one by one with index shifting
    const removed = await remove(fiveP, [0, 2]);

    const images = await pdfToImages(removed);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `remove-5p-pages1-3-result-page${i + 1}`,
      });
    }
  });
});