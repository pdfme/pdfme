import { move } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: move', () => {
  const fiveP = loadTestPDF('5p.pdf');

  test('move: move the 1st page (index:0) of 5p.pdf to the 3rd position (index:2)', async () => {
    const moved = await move(fiveP, { from: 0, to: 2 });

    const images = await pdfToImages(moved);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `move-5p-page0-to-2-result-page${i + 1}`,
      });
    }
  });
});