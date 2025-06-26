import { split } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('split', () => {
  test('splits PDF into ranges', async () => {
    const pdf = await createTestPDF(5);
    const splits = await split(pdf, [
      { start: 0, end: 1 },
      { start: 2, end: 4 },
    ]);
    expect(splits.length).toBe(2);
    expect(await getPDFPageCount(splits[0])).toBe(2);
    expect(await getPDFPageCount(splits[1])).toBe(3);
  });

  test('throws error for invalid ranges', async () => {
    const pdf = await createTestPDF(3);
    await expect(split(pdf, [{ start: 1, end: 0 }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid range'
    );
  });
});