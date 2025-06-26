import { rotate } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: rotate', () => {
  const fiveP = loadTestPDF('5p.pdf');

  test('rotate: rotate all pages of 5p.pdf by 90 degrees', async () => {
    const rotated = await rotate(fiveP, 90);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-90deg-all-result-page${i + 1}`,
      });
    }
  });

  test('rotate: rotate only the 2nd page of 5p.pdf by 180 degrees', async () => {
    // pageNumbers=[1] -> only the 2nd page is rotated by 180 degrees
    const rotated = await rotate(fiveP, 180, [1]);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-180deg-page1-result-page${i + 1}`,
      });
    }
  });

  test('rotate: rotate pages 2 and 4 of 5p.pdf by 270 degrees', async () => {
    // Rotate the 2nd and 4th pages by 270 degrees
    const rotated = await rotate(fiveP, 270, [1, 3]);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-270deg-pages1-3-result-page${i + 1}`,
      });
    }
  });
});