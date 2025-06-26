import { split } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: split', () => {
  const fiveP = loadTestPDF('5p.pdf');

  test('split: split 5p.pdf into pages 1-2 and 3-5', async () => {
    const [split12, split35] = await split(fiveP, [
      { start: 0, end: 1 }, // pages 1-2
      { start: 2, end: 4 }, // pages 3-5
    ]);

    const images12 = await pdfToImages(split12);
    const images35 = await pdfToImages(split35);

    for (let i = 0; i < images12.length; i++) {
      expect(images12[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `split-5p-1-2-page${i + 1}`,
      });
    }

    for (let i = 0; i < images35.length; i++) {
      expect(images35[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `split-5p-3-5-page${i + 1}`,
      });
    }
  });
});