import { organize } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('organize', () => {
  test('performs single remove operation', async () => {
    const pdf = await createTestPDF(5);
    const result = await organize(pdf, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single insert operation', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await organize(pdf, [{ type: 'insert', data: { pdf: insertPdf, position: 1 } }]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('performs single replace operation', async () => {
    const pdf = await createTestPDF(3);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'replace', data: { position: 1, pdf: replacePdf } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single rotate operation', async () => {
    const pdf = await createTestPDF(3);
    const result = await organize(pdf, [
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 90 } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs multiple operations in sequence', async () => {
    const pdf = await createTestPDF(5);
    const insertPdf = await createTestPDF(2);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } }, // 5 -> 3 pages

      { type: 'insert', data: { pdf: insertPdf, position: 1 } }, // 3 -> 5 pages
      { type: 'replace', data: { position: 2, pdf: replacePdf } }, // Still 5 pages
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } }, // Still 5 pages
    ]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [{ type: 'remove', data: { position: 3 } }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number'
    );
  });

  test('throws error for invalid position', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(1);
    await expect(
      organize(pdf, [{ type: 'insert', data: { pdf: insertPdf, position: 4 } }])
    ).rejects.toThrow('[@pdfme/manipulator] Invalid position');
  });

  test('throws error for invalid rotation degrees', async () => {
    const pdf = await createTestPDF(3);
    await expect(
      // @ts-expect-error
      organize(pdf, [{ type: 'rotate', data: { pages: [0], degrees: 45 } }])
    ).rejects.toThrow('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  });

  test('throws error for empty actions array', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one action is required'
    );
  });

  test('throws error for unknown action type', async () => {
    const pdf = await createTestPDF(3);
    // @ts-expect-error
    await expect(organize(pdf, [{ type: 'invalid', data: { pages: [] } }])).rejects.toThrow(
      '[@pdfme/manipulator] Unknown action type: invalid'
    );
  });
});