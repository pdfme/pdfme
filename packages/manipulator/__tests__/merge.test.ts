import { merge } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('merge', () => {
  test('merges multiple PDFs', async () => {
    const pdf1 = await createTestPDF(2);
    const pdf2 = await createTestPDF(3);
    const merged = await merge([pdf1, pdf2]);
    expect(await getPDFPageCount(merged)).toBe(5);
  });

  test('throws error when no PDFs provided', async () => {
    await expect(merge([])).rejects.toThrow('[@pdfme/manipulator] At least one PDF is required');
  });
});