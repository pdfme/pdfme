import { merge, split } from '../src/index';
import { createTestPDF, getPDFPageCount } from './utils';

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
