import { organize } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: organize (complex operations)', () => {
  const fiveP = loadTestPDF('5p.pdf');
  const aPdf = loadTestPDF('a.pdf');
  const bPdf = loadTestPDF('b.pdf');

  test('organize: Remove -> Insert -> Move (check index changes)', async () => {
    // Remove the 2nd page (index:1) => 4 pages
    // Insert a.pdf at the 2nd page (index:1) => 5 pages
    // Move the newly inserted page (index:1) to the 1st page (index:0) => 5 pages

    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 1 } },
      { type: 'insert', data: { pdf: aPdf, position: 1 } },
      { type: 'move', data: { from: 1, to: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-1-result-page${i + 1}`,
      });
    }
  });

  test('organize: Replace -> Rotate -> Remove', async () => {
    // Replace the 3rd page with a.pdf => 5 pages
    // Rotate the 3rd page by 180 => 5 pages
    // Remove the 1st page => 4 pages

    const result = await organize(fiveP, [
      { type: 'replace', data: { pdf: aPdf, position: 2 } },
      { type: 'rotate', data: { position: 2, degrees: 180 } },
      { type: 'remove', data: { position: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-2-result-page${i + 1}`,
      });
    }
  });

  test('organize: Insert -> Insert -> Move -> Move', async () => {
    // Insert a.pdf at the end (index:5) => 6 pages
    // Insert b.pdf at the start (index:0) => 7 pages
    // Move the 3rd page (index:2) to the 6th page (index:5) => 7 pages
    // Move the 4th page (index:3) to the 2nd page (index:1) => 7 pages

    const result = await organize(fiveP, [
      { type: 'insert', data: { pdf: aPdf, position: 5 } },
      { type: 'insert', data: { pdf: bPdf, position: 0 } },
      { type: 'move', data: { from: 2, to: 5 } },
      { type: 'move', data: { from: 3, to: 1 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-3-result-page${i + 1}`,
      });
    }
  });

  test('organize: Rotate -> Rotate -> Remove', async () => {
    // Rotate the 2nd and 4th pages by 90 => 5 pages
    // Rotate the 3rd page by 270 => 5 pages
    // Remove the 1st page => 4 pages

    const result = await organize(fiveP, [
      { type: 'rotate', data: { position: 1, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 270 } },
      { type: 'remove', data: { position: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-4-result-page${i + 1}`,
      });
    }
  });

  test('organize: Remove -> Insert -> Remove -> Insert (multiple times)', async () => {
    // Remove the 5th page (index:4) => 4 pages
    // Insert a.pdf at the 2nd page (index:1) => 5 pages
    // Remove the 1st page (index:0) => 4 pages
    // Insert b.pdf at the end (index:4) => 5 pages

    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 4 } },
      { type: 'insert', data: { pdf: aPdf, position: 1 } },
      { type: 'remove', data: { position: 0 } },
      { type: 'insert', data: { pdf: bPdf, position: 4 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-5-result-page${i + 1}`,
      });
    }
  });
});