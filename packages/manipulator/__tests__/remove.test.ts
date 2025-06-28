import { remove } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('remove', () => {
  test('removes specified pages from PDF', async () => {
    const pdf = await createTestPDF(5);
    const result = await remove(pdf, [1, 3]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('throws error when no pages provided', async () => {
    const pdf = await createTestPDF(3);
    await expect(remove(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one page number is required'
    );
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(remove(pdf, [3])).rejects.toThrow('[@pdfme/manipulator] Invalid page number');
  });
});