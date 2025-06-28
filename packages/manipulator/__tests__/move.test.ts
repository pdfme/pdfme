import { move } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('move', () => {
  test('moves page from one position to another', async () => {
    const pdf = await createTestPDF(3);
    const result = await move(pdf, { from: 0, to: 2 });
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(move(pdf, { from: 3, to: 0 })).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number: from=3, to=0, total pages=3'
    );
  });
});