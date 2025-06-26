import { organize } from '../../src/index';
import { pdfToImages, loadTestPDF } from '../test-helpers';
import 'jest-image-snapshot';

describe('E2E: organize (single operations)', () => {
  const fiveP = loadTestPDF('5p.pdf');
  const aPdf = loadTestPDF('a.pdf');
  const bPdf = loadTestPDF('b.pdf');

  test('organize: single remove (remove the 2nd page)', async () => {
    const result = await organize(fiveP, [{ type: 'remove', data: { position: 1 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-remove-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single insert (insert a.pdf at page 1)', async () => {
    const result = await organize(fiveP, [{ type: 'insert', data: { pdf: aPdf, position: 0 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-insert-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single replace (replace 2nd page with a.pdf)', async () => {
    const result = await organize(fiveP, [{ type: 'replace', data: { pdf: aPdf, position: 1 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-replace-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single rotate (rotate pages 1 and 3 by 90 degrees)', async () => {
    const result = await organize(fiveP, [
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 90 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-rotate-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: multiple operations (remove -> remove -> insert -> replace -> rotate -> rotate)', async () => {
    const insertPdf = aPdf;
    const replacePdf = bPdf;
    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } }, // 5 -> 3 pages
      { type: 'insert', data: { pdf: insertPdf, position: 1 } }, // 3 -> 4 pages
      { type: 'replace', data: { position: 2, pdf: replacePdf } }, // still 4 pages
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-multiple-ops-result-page${i + 1}`,
      });
    }
  });
});