import { insert } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('insert', () => {
  test('inserts PDF at specified position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await insert(basePdf, [{ pdf: insertPdf, position: 1 }]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    await expect(insert(basePdf, [{ pdf: insertPdf, position: 4 }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid position'
    );
  });
});